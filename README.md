import { tool, Tool, ToolsProviderController } from "@lmstudio/sdk";
import { z } from "zod";
import { configSchematics } from "./config";
import stopwords from "@stdlib/datasets-stopwords-en";

interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
}

interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
}

interface AcceptedSource {
  title: string;
  url: string;
  domain: string;
  engine: string;
  score?: number;
  contentSource: "FETCHED_PAGE";
  content: string;
}

interface RejectedSource {
  title: string;
  url: string;
  reason: string;
}

// Research pipeline settings.
const PAGE_WAIT_MS = 4000;
const RESEARCH_CANDIDATES = 15;
const DEFAULT_RESEARCH_SOURCES = 5;

/**
 * Pause before inspecting a successfully fetched page.
 *
 * This gives transient security/challenge pages a few seconds
 * to render before we decide whether the page is usable.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize text for challenge detection.
 */
function normalizeForDetection(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect an ACTIVE human-verification page.
 *
 * Important:
 *
 * We do NOT reject a page simply because it mentions:
 *
 *   Cloudflare
 *   bot
 *   bot detection
 *   security
 *   CAPTCHA
 *   verification
 *
 * Those words can naturally occur in legitimate articles.
 *
 * We are looking for language that indicates the PAGE IS CURRENTLY
 * ASKING THE VISITOR TO COMPLETE A HUMAN/BOT VERIFICATION.
 */
function detectActiveChallenge(text: string): string | null {
  const normalized = normalizeForDetection(text);

  // ---------------------------------------------------------------
  // Explicit active verification instructions.
  // ---------------------------------------------------------------

  const challengePatterns: Array<[RegExp, string]> = [
    [
      /verify (?:you'?re|you are) human/,
      "active human verification",
    ],
    [
      /verifying (?:you'?re|you are) human/,
      "active human verification",
    ],
    [
      /please verify (?:you'?re|you are) human/,
      "active human verification",
    ],
    [
      /are you (?:a )?robot/,
      "active robot verification",
    ],
    [
      /prove (?:you'?re|you are) not a robot/,
      "active robot verification",
    ],
    [
      /i am not a robot/,
      "active robot verification",
    ],
    [
      /i'?m not a robot/,
      "active robot verification",
    ],
    [
      /checking your browser/,
      "browser verification",
    ],
    [
      /checking if you'?re human/,
      "human verification",
    ],
    [
      /checking if you are human/,
      "human verification",
    ],
    [
      /please wait while we verify/,
      "verification process",
    ],
    [
      /complete (?:the )?(?:captcha|challenge)/,
      "CAPTCHA/challenge instruction",
    ],
    [
      /complete the security check/,
      "security check",
    ],
    [
      /click to verify/,
      "verification instruction",
    ],
    [
      /press and hold to verify/,
      "press-and-hold verification",
    ],
    [
      /press and hold to continue/,
      "press-and-hold verification",
    ],
    [
      /drag the slider/,
      "slider verification",
    ],
    [
      /drag the handle/,
      "slider verification",
    ],
    [
      /move the puzzle piece/,
      "puzzle verification",
    ],
    [
      /complete the puzzle/,
      "puzzle verification",
    ],
    [
      /select all images/,
      "image verification",
    ],
    [
      /select all squares/,
      "image verification",
    ],
    [
      /select all the (?:images|squares|pictures)/,
      "image verification",
    ],
    [
      /which image matches/,
      "image verification",
    ],
    [
      /which item matches/,
      "selection verification",
    ],
    [
      /which item doesn'?t belong/,
      "selection verification",
    ],
  ];

  for (const [pattern, reason] of challengePatterns) {
    if (pattern.test(normalized)) {
      return reason;
    }
  }

  // ---------------------------------------------------------------
  // CAPTCHA systems.
  //
  // A page saying "this article discusses CAPTCHA" should not be
  // rejected. We therefore require active/instructional context.
  // ---------------------------------------------------------------

const wordCount = normalized
  .split(/\s+/)
  .filter(Boolean)
  .length;

const explicitChallengeInstruction =
  /\bverify\s+(?:that\s+)?(?:you(?:'re| are)|yourself)\s+(?:are\s+)?human\b/i.test(normalized) ||
  /\bi\s*(?:am|'m)\s+not\s+a\s+robot\b/i.test(normalized) ||
  /\b(?:select|choose)\s+all\s+(?:the\s+)?(?:images|squares|tiles)\b/i.test(normalized) ||
  /\b(?:move|drag)\s+(?:the\s+)?(?:slider|puzzle\s+piece)\b/i.test(normalized) ||
  /\b(?:press|click)\s+and\s+hold\s+(?:to\s+)?verify\b/i.test(normalized) ||
  /\bcomplete\s+(?:the\s+)?(?:captcha|challenge|verification)\b/i.test(normalized);

const hasCaptcha =
  /\b(?:captcha|recaptcha|hcaptcha)\b/i.test(normalized);

const hasTurnstile =
  /\bturnstile\b/i.test(normalized);

const hasChallengeContext =
  /\b(?:challenge|verification|verify|human|robot)\b/i.test(normalized);

if (explicitChallengeInstruction) {
  return "active verification challenge detected";
}

if (
  wordCount < 150 &&
  (
    (hasCaptcha && hasChallengeContext) ||
    (hasTurnstile && hasChallengeContext)
  )
) {
  return "active verification challenge detected";
}

  return null;
}

function selectRelevantContent(
  content: string,
  query: string,
  maxLength = 6000
): string {
  if (content.length <= maxLength) {
    return content;
  }

	const stopWords = new Set(stopwords());

  const terms = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .filter(
      (term) =>
        term.length >= 3 &&
        !stopWords.has(term)
    );
	
	const queryPhrase = query
	  .toLowerCase()
	  .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
	  .replace(/\s+/g, " ")
	  .trim();

  if (terms.length === 0) {
    return content.substring(0, maxLength).trim() +
      "\n...[source truncated]";
  }

  const paragraphs = content
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean);

  const scored = paragraphs.map((paragraph, index) => {
    const lower = paragraph.toLowerCase();

    let score = 0;

	if (
	  queryPhrase.length >= 4 &&
	  lower.includes(queryPhrase)
	) {
	  score += 5;
	}

    for (const term of terms) {
      const matches = lower.split(term).length - 1;
      score += Math.min(matches, 3);
    }

    return {
      index,
      paragraph,
      score,
    };
  });

  const relevant = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (relevant.length === 0) {
    return content.substring(0, maxLength).trim() +
      "\n...[source truncated]";
  }

  const selected = new Set<number>();

  let totalLength = 0;

  for (const item of relevant) {
    // Include neighboring paragraphs so context isn't fragmented.
    const start = Math.max(0, item.index - 1);
    const end = Math.min(
      paragraphs.length - 1,
      item.index + 1
    );

    for (let i = start; i <= end; i++) {
      if (selected.has(i)) continue;

      const addition =
        paragraphs[i] + "\n\n";

      if (
        totalLength + addition.length >
        maxLength
      ) {
        continue;
      }

      selected.add(i);
      totalLength += addition.length;
    }

    if (totalLength >= maxLength * 0.95) {
      break;
    }
  }

  const result = Array.from(selected)
    .sort((a, b) => a - b)
    .map((index) => paragraphs[index])
    .join("\n\n");

  return result.trim() +
    (result.length < content.length
      ? "\n...[source truncated]"
      : "");
}



/**
 * Extract readable text from HTML.
 *
 * This is intentionally dependency-free so the plugin does not
 * require another package just for basic page extraction.
 */
 
function extractText(html: string): string {
  let text = html;

  // Remove obvious non-content elements.
  text = text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Prefer semantic article/main containers.
  const candidates: string[] = [];

  const mainMatches = text.match(
    /<main\b[^>]*>([\s\S]*?)<\/main>/gi
  );

  const articleMatches = text.match(
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi
  );

  if (mainMatches) candidates.push(...mainMatches);
  if (articleMatches) candidates.push(...articleMatches);

  // If we found semantic content, use the largest block.
  if (candidates.length > 0) {
    text = candidates
      .sort((a, b) => b.length - a.length)[0];
  }

  // Remove common navigation / footer / sidebar sections.
  text = text
    .replace(
      /<nav\b[^>]*>[\s\S]*?<\/nav>/gi,
      " "
    )
    .replace(
      /<footer\b[^>]*>[\s\S]*?<\/footer>/gi,
      " "
    )
    .replace(
      /<aside\b[^>]*>[\s\S]*?<\/aside>/gi,
      " "
    )
    .replace(
      /<form\b[^>]*>[\s\S]*?<\/form>/gi,
      " "
    );

  // Preserve paragraph/heading/list boundaries.
  text = text
    .replace(
      /<\/(?:p|div|section|article|main|h1|h2|h3|h4|h5|h6|li|tr)>/gi,
      "\n"
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    );

  // Remove remaining HTML tags.
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities.
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Normalize whitespace.
  text = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  return text;
}

/**
 * Fetch and validate one research candidate.
 *
 * Pipeline:
 *
 *   FETCH
 *      ↓
 *   HTTP status check
 *      ↓
 *   4-second wait
 *      ↓
 *   inspect returned page
 *      ↓
 *   ACCEPT / REJECT
 */
async function fetchCandidate(
  result: SearXNGResult,
  timeout: number,
  query: string,
  sourceIndex: number
):
  Promise<
    | {
        usable: true;
        title: string;
        url: string;
        domain: string;
        engine: string;
        score?: number;
        content: string;
      }
    | {
        usable: false;
        reason: string;
      }
  > {
  let domain: string;

  try {
    domain =
      new URL(result.url).hostname;
  } catch {
    return {
      usable: false,
      reason: "invalid URL",
    };
  }

  try {
    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(
        () => controller.abort(),
        timeout
      );

    console.log(
      `research_web: fetching ${result.url}`
    );

    const response =
      await fetch(result.url, {
        method: "GET",

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/131.0 Safari/537.36",

          Accept:
            "text/html,application/xhtml+xml," +
            "application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        },

        signal: controller.signal,
      });

    clearTimeout(timeoutId);

    // -------------------------------------------------------------
    // HTTP accessibility checks.
    //
    // These are much stronger signals than simply finding words
    // such as "Cloudflare" or "bot" in page content.
    // -------------------------------------------------------------

    if (response.status === 401) {
      return {
        usable: false,
        reason:
          "HTTP 401 Unauthorized",
      };
    }

    if (response.status === 403) {
      return {
        usable: false,
        reason:
          "HTTP 403 Forbidden — page inaccessible",
      };
    }

    if (response.status === 429) {
      return {
        usable: false,
        reason:
          "HTTP 429 Too Many Requests — rate limited",
      };
    }

    if (response.status >= 500) {
      return {
        usable: false,
        reason:
          `HTTP ${response.status} ${response.statusText} — server error`,
      };
    }

    if (!response.ok) {
      return {
        usable: false,
        reason:
          `HTTP ${response.status} ${response.statusText}`,
      };
    }

    // -------------------------------------------------------------
    // The HTTP request succeeded.
    //
    // Give the page 4 seconds before inspecting it.
    // -------------------------------------------------------------


	await sleep(4000);


    // -------------------------------------------------------------
    // Read the returned page.
    // -------------------------------------------------------------

    const html =
      await response.text();

    // Inspect enough of the raw HTML to catch challenge pages.
    const inspectionText =
      html
        .substring(0, 100000);

    const challenge =
      detectActiveChallenge(
        inspectionText
      );

    if (challenge) {
      return {
        usable: false,
        reason:
          `active verification challenge detected: ${challenge}`,
      };
    }

    // -------------------------------------------------------------
    // Extract readable content.
    // -------------------------------------------------------------

    let content =
      extractText(html);

    // A page with almost no content isn't useful research.
	const wordCount = content
	  .split(/\s+/)
	  .filter(Boolean)
	  .length;

	if (wordCount < 150) {
	  return {
		usable: false,
		reason:
		  `insufficient readable page content (${wordCount} words)`,
	  };
	}

	const contentLimits = [
	  4000,
	  3000,
	  2000,
	  1500,
	  1500,
	];

	const contentLimit =
	  contentLimits[
		Math.min(
		  sourceIndex,
		  contentLimits.length - 1
		)
	  ];

	content = selectRelevantContent(
	  content,
	  query,
	  contentLimit
	);

    return {
      usable: true,
      title: result.title,
      url: result.url,
      domain,
      engine: result.engine,
      score: result.score,
      content,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        usable: false,
        reason:
          `request timed out after ${timeout}ms`,
      };
    }

    return {
      usable: false,
      reason:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

export async function toolsProvider(
  ctl: ToolsProviderController
): Promise<Tool[]> {
  const tools: Tool[] = [];

  const config =
    ctl.getPluginConfig(
      configSchematics
    );

  const searxngUrl =
    config.get(
      "searxngUrl"
    ) as string;

  const defaultPageSize =
    config.get(
      "defaultPageSize"
    ) as number;

  const timeout =
    config.get(
      "timeout"
    ) as number;

  // ================================================================
  // search_web
  // ================================================================

  const searchTool = tool({
    name: "search_web",

    description:
	  "Limited web search using local SearXNG. " +
	  "Returns snippets only and should be used only when full webpage research is unavailable or unnecessary. " +
	  "For factual, detailed, current, comparative, or research questions, use research_web instead.",

    parameters: {
      query: z
        .string()
        .describe(
          "The search query string"
        ),

      num_results: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe(
          `Number of results to return (1-20). Default: ${defaultPageSize}`
        ),

      time_range: z
        .string()
        .optional()
        .describe(
          "Optional time filter: 'day', 'week', 'month', or 'year'"
        ),
    },

    implementation: async (params: {
      query: string;
      num_results?: number;
      time_range?: string;
    }) => {
      try {
        const {
          query,
          num_results,
          time_range,
        } = params;

        const pageSize =
          num_results ??
          defaultPageSize;

        const searchParams =
          new URLSearchParams({
            q: query,
            format: "json",
            pageno: String(page),
            safesearch: "0",
          });

		const normalizedTimeRange =
		  time_range?.toLowerCase().trim();

		if (normalizedTimeRange) {
		  const validRanges = [
			"day",
			"week",
			"month",
			"year",
		  ];

		  if (
			validRanges.includes(
			  normalizedTimeRange
			)
		  ) {
			searchParams.append(
			  "time_range",
			  normalizedTimeRange
			);
		  }
		}

        const searchUrl =
          `${searxngUrl}/search?${searchParams.toString()}`;

        console.log(
          `Querying SearXNG: ${searchUrl.replace(
            /format=json/,
            "format=..."
          )}`
        );

        const controller =
          new AbortController();

        const timeoutId =
          setTimeout(
            () => controller.abort(),
            timeout
          );

        const response =
          await fetch(searchUrl, {
            method: "GET",

            headers: {
              Accept:
                "application/json",
              "User-Agent":
                "LM-Studio-Plugin/1.0",
            },

            signal: controller.signal,
          });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `SearXNG returned status ${response.status}: ` +
            `${response.statusText}`
          );
        }

        const data =
          (await response.json()) as SearXNGResponse;

        if (
          !data.results ||
          data.results.length === 0
        ) {
          return `No results found for query: "${query}"`;
        }

        const formattedResults =
          data.results
            .slice(0, pageSize)
            .map(
              (result, index) =>
                `[${index + 1}] ${result.title}\n` +
                `URL: ${result.url}\n` +
                `Snippet: ${result.content.substring(
                  0,
                  300
                )}${
                  result.content.length > 300
                    ? "..."
                    : ""
                }\n` +
                `Source: ${result.engine}`
            )
            .join("\n\n");

        return (
          `Search results for "${query}" ` +
          `(${Math.min(
            data.results.length,
            pageSize
          )} of ${data.number_of_results} total):\n\n` +
          formattedResults +
          "\n\nNote: These results are from SearXNG " +
          "metasearch engine aggregating multiple sources."
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return (
            `Error: SearXNG request timed out after ` +
            `${timeout}ms. Check that SearXNG is running at ` +
            `${searxngUrl}.`
          );
        }

        return (
          `Error searching SearXNG: ` +
          `${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    },
  });

  // ================================================================
  // fetch_page_content
  // ================================================================

  const fetchPageTool = tool({
    name: "fetch_page_content",

    description:
      "Fetch and extract text content from a specific URL.",

    parameters: {
      url: z
        .string()
        .url()
        .describe(
          "The URL to fetch"
        ),

      max_length: z
        .number()
        .min(100)
        .max(10000)
        .optional()
        .describe(
          "Maximum characters to return. Default: 2000."
        ),
    },

    implementation: async (params: {
      url: string;
      max_length?: number;
    }) => {
      try {
        const {
          url,
          max_length,
        } = params;

        const maxLength =
          max_length ?? 2000;

        const response =
          await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; LM-Studio-Bot/1.0)",
            },
          });

        if (!response.ok) {
          return (
            `Failed to fetch ${url}: ` +
            `${response.status} ${response.statusText}`
          );
        }

        const html =
          await response.text();

        let text =
          extractText(html);

        if (
          text.length >
          maxLength
        ) {
          text =
            text.substring(
              0,
              maxLength
            ) +
            "... [truncated]";
        }

        return (
          `Content from ${url}:\n\n${text}`
        );
      } catch (error) {
        return (
          `Error fetching page: ` +
          `${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    },
  });

  // ================================================================
  // research_web
  // ================================================================

  const researchTool = tool({
    name: "research_web",

    description:
		"Primary web research tool using local SearXNG. " +
		"Use for factual, detailed, current, comparative, or research questions. " +
		"Fetches and reads actual webpages, not snippets, and collects up to 5 usable sources. " +
		"Rejects inaccessible pages and active verification challenges. " +
		"Compare multiple sources and answer from the returned SOURCE content. " +
		"For all factual claims, include a Markdown link to its supporting SOURCE " +
		"immediately after the claim. Use the SOURCE title as the link text, including the article's date if available. " +
		"Only link to URLs present in the returned SOURCE list. " +
		"If no usable webpages are found on page 1, ask whether the user wants " +
		"the available snippets or the next 15 candidates from page 2. " +
		"If the user requests the next results, call this tool again with page 2. " +
		"Do not automatically use snippets unless the user chooses them. " +
		"Present distinct news stories separately rather than combining them into a single narrative.",

    parameters: {
      query: z
        .string()
        .describe(
          "The topic or question to research"
        ),

      sources: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe(
          "Number of usable webpages to collect. Default: 5."
        ),

      time_range: z
        .string()
        .optional()
        .describe(
          "Optional freshness filter: 'day', 'week', 'month', or 'year'"
        ),
		
		page: z
		  .number()
		  .int()
		  .min(1)
		  .optional()
		  .describe(
			"SearXNG result page to research. Default: 1."
		),
		
    },

    implementation: async (params: {
      query: string;
      sources?: number;
      time_range?: string;
	  page?: number;
    }) => {
      const {
        query,
        sources,
        time_range,
		page = 1,
      } = params;

      const targetSources =
        sources ??
        DEFAULT_RESEARCH_SOURCES;

      try {
        // ----------------------------------------------------------
        // STEP 1: Ask SearXNG for 10 candidates.
        // ----------------------------------------------------------

        const searchParams =
          new URLSearchParams({
            q: query,
            format: "json",
            pageno: String(page),
            safesearch: "0",
          });

        if (time_range) {
          const validRanges = [
            "day",
            "week",
            "month",
            "year",
          ];

          if (
            validRanges.includes(
              time_range
            )
          ) {
            searchParams.append(
              "time_range",
              time_range
            );
          }
        }

        const searchUrl =
          `${searxngUrl}/search?${searchParams.toString()}`;

        console.log(
          `research_web: searching for "${query}"`
        );

        const controller =
          new AbortController();

        const timeoutId =
          setTimeout(
            () => controller.abort(),
            timeout
          );

        const searchResponse =
          await fetch(searchUrl, {
            method: "GET",

            headers: {
              Accept:
                "application/json",
              "User-Agent":
                "LM-Studio-Plugin/1.0",
            },

            signal: controller.signal,
          });

        clearTimeout(timeoutId);

        if (
          !searchResponse.ok
        ) {
          throw new Error(
            `SearXNG returned ${searchResponse.status}: ` +
            `${searchResponse.statusText}`
          );
        }

        const data =
          (await searchResponse.json()) as SearXNGResponse;

        if (
          !data.results ||
          data.results.length === 0
        ) {
          return (
            `No search results found for "${query}".`
          );
        }

        const candidates =
          data.results.slice(
            0,
            RESEARCH_CANDIDATES
          );

        console.log(
          `research_web: received ${candidates.length} candidates`
        );

        // ----------------------------------------------------------
        // STEP 2: Check candidates sequentially.
        // ----------------------------------------------------------

        const accepted: AcceptedSource[] =
          [];

        const rejected: RejectedSource[] =
          [];

        const seenDomains =
          new Set<string>();

        let candidateIndex = 0;

        while (
          accepted.length <
            targetSources &&
          candidateIndex <
            candidates.length
        ) {
          const candidate =
            candidates[
              candidateIndex
            ];

          candidateIndex++;

          let domain: string;

          try {
            domain =
              new URL(
                candidate.url
              ).hostname.toLowerCase();
          } catch {
            rejected.push({
              title:
                candidate.title,
              url:
                candidate.url,
              reason:
                "invalid URL",
            });

            continue;
          }

          // Keep the source set diverse.
          if (
            seenDomains.has(
              domain
            )
          ) {
            rejected.push({
              title:
                candidate.title,
              url:
                candidate.url,
              reason:
                "duplicate domain",
            });

            continue;
          }

          console.log(
            `research_web: checking candidate ` +
            `${candidateIndex}/${candidates.length}: ` +
            `${candidate.url}`
          );

          const result =
            await fetchCandidate(
              candidate,
              timeout,
			  query,
			  accepted.length
            );

          if (!result.usable) {
            console.log(
              `research_web: REJECTED — ` +
              `${candidate.url} — ${result.reason}`
            );

            rejected.push({
              title:
                candidate.title,
              url:
                candidate.url,
              reason:
                result.reason,
            });

            // Candidate is discarded.
            // Move directly to the next SearXNG result.
            continue;
          }

          // --------------------------------------------------------
          // ACCEPTED SOURCE.
          // --------------------------------------------------------

          seenDomains.add(
            domain
          );

			accepted.push({
			  title: result.title,
			  url: result.url,
			  domain: result.domain,
			  engine: result.engine,
			  score: result.score,
			  contentSource: "FETCHED_PAGE",
			  content: result.content,
			});

          console.log(
            `research_web: ACCEPTED ` +
            `${accepted.length}/${targetSources}: ` +
            `${result.url}`
          );
        }

        // ----------------------------------------------------------
        // STEP 3: Return research package.
        // ----------------------------------------------------------

		if (accepted.length === 0) {
		  const snippetResults = candidates
			.map(
			  (candidate, index) =>
				`[${index + 1}] ${candidate.title}\n` +
				`URL: ${candidate.url}\n` +
				`Snippet: ${candidate.content.substring(0, 500)}`
			)
			.join("\n\n");

		  return (
			`I couldn't access any of the current ` +
			`${candidateIndex} candidate webpages for "${query}".\n\n` +
			`Would you like me to use the available search snippets, ` +
			`or attempt the next 15 search results?\n\n` +
			`AVAILABLE SNIPPETS:\n\n` +
			snippetResults
		  );
		}

        let output =
          `RESEARCH RESULTS\n` +
          `Query: ${query}\n` +
          `Usable sources: ${accepted.length}/${targetSources}\n` +
          `Candidates checked: ${candidateIndex}\n\n` +
          `Only sources listed under SOURCE 1 through ` +
          `SOURCE ${accepted.length} were accepted and supplied ` +
          `as research material.\n\n`;

        accepted.forEach(
          (source, index) => {
            output +=
              `SOURCE ${index + 1}\n` +
              `Title: ${source.title}\n` +
              `URL: ${source.url}\n` +
              `${source.content}\n\n`;
          }
        );

        return output;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return (
            `Research request timed out after ` +
            `${timeout}ms. Check SearXNG at ${searxngUrl}.`
          );
        }

        return (
          `Error researching "${query}": ` +
          `${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        );
      }
    },
  });

  tools.push(searchTool);
  tools.push(fetchPageTool);
  tools.push(researchTool);

  return tools;
}
