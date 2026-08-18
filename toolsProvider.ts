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

type TimeRange = "day" | "week" | "month" | "year";

const PAGE_WAIT_MS = 4000;
const RESEARCH_CANDIDATES = 15;
const DEFAULT_RESEARCH_SOURCES = 5;

// Keep the total research context relatively small while giving
// each accepted source enough room to be useful.
const RESEARCH_CONTENT_LIMITS = [
  2600,
  2400,
  2200,
  2000,
  1800,
];

const MIN_PAGE_WORDS = 150;
const MAX_CHALLENGE_INSPECTION_CHARS = 100000;

const TIME_RANGES: TimeRange[] = [
  "day",
  "week",
  "month",
  "year",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTimeRange(
  value?: string
): TimeRange | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .toLowerCase()
    .trim();

  return TIME_RANGES.includes(
    normalized as TimeRange
  )
    ? (normalized as TimeRange)
    : undefined;
}

/**
 * Normalize text for challenge detection.
 */
function normalizeForDetection(
  text: string
): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect an ACTIVE human-verification page.
 *
 * We intentionally do not reject a page merely because it mentions
 * Cloudflare, CAPTCHA, bots, verification, etc. Those terms can
 * legitimately occur inside articles.
 */
function detectActiveChallenge(
  text: string
): string | null {
  const normalized =
    normalizeForDetection(text);

  const challengePatterns: Array<
    [RegExp, string]
  > = [
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

  for (const [
    pattern,
    reason,
  ] of challengePatterns) {
    if (pattern.test(normalized)) {
      return reason;
    }
  }

  const wordCount = normalized
    .split(/\s+/)
    .filter(Boolean)
    .length;

  const explicitChallengeInstruction =
    /\bverify\s+(?:that\s+)?(?:you(?:'re| are)|yourself)\s+(?:are\s+)?human\b/i.test(
      normalized
    ) ||
    /\bi\s*(?:am|'m)\s+not\s+a\s+robot\b/i.test(
      normalized
    ) ||
    /\b(?:select|choose)\s+all\s+(?:the\s+)?(?:images|squares|tiles)\b/i.test(
      normalized
    ) ||
    /\b(?:move|drag)\s+(?:the\s+)?(?:slider|puzzle\s+piece)\b/i.test(
      normalized
    ) ||
    /\b(?:press|click)\s+and\s+hold\s+(?:to\s+)?verify\b/i.test(
      normalized
    ) ||
    /\bcomplete\s+(?:the\s+)?(?:captcha|challenge|verification)\b/i.test(
      normalized
    );

  const hasCaptcha =
    /\b(?:captcha|recaptcha|hcaptcha)\b/i.test(
      normalized
    );

  const hasTurnstile =
    /\bturnstile\b/i.test(normalized);

  const hasChallengeContext =
    /\b(?:challenge|verification|verify|human|robot)\b/i.test(
      normalized
    );

  if (explicitChallengeInstruction) {
    return "active verification challenge detected";
  }

  if (
    wordCount < 150 &&
    (
      (hasCaptcha &&
        hasChallengeContext) ||
      (hasTurnstile &&
        hasChallengeContext)
    )
  ) {
    return "active verification challenge detected";
  }

  return null;
}

/**
 * Normalize a title for duplicate-article comparison.
 */
function normalizeTitle(
  title: string
): string {
  return title
    .toLowerCase()
    .replace(
      /https?:\/\/\S+/g,
      " "
    )
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Create a lightweight title fingerprint.
 *
 * This intentionally avoids aggressive fuzzy matching. The goal is
 * only to prevent obvious duplicate/syndicated articles from being
 * selected repeatedly.
 */
function getTitleTerms(
  title: string
): Set<string> {
  const stopWords = new Set(
    stopwords()
  );

  return new Set(
    normalizeTitle(title)
      .split(/\s+/)
      .filter(
        (term) =>
          term.length >= 3 &&
          !stopWords.has(term)
      )
  );
}

function titleSimilarity(
  first: string,
  second: string
): number {
  const firstTerms =
    getTitleTerms(first);

  const secondTerms =
    getTitleTerms(second);

  if (
    firstTerms.size === 0 ||
    secondTerms.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const term of firstTerms) {
    if (secondTerms.has(term)) {
      intersection++;
    }
  }

  const union =
    new Set([
      ...firstTerms,
      ...secondTerms,
    ]).size;

  return union === 0
    ? 0
    : intersection / union;
}

/**
 * Detect obvious duplicate articles.
 *
 * We deliberately do NOT reject merely because two articles share
 * the same domain. Different articles from the same website are fine.
 */
function isDuplicateArticle(
  candidate: SearXNGResult,
  accepted: AcceptedSource[]
): boolean {
  const normalizedCandidateUrl =
    normalizeUrl(candidate.url);

  for (const source of accepted) {
    if (
      normalizeUrl(source.url) ===
      normalizedCandidateUrl
    ) {
      return true;
    }

    const similarity =
      titleSimilarity(
        candidate.title,
        source.title
      );

    if (similarity >= 0.82) {
      return true;
    }
  }

  return false;
}

function normalizeUrl(
  value: string
): string {
  try {
    const url = new URL(value);

    url.hash = "";

    // Remove common tracking parameters.
    const trackingPrefixes = [
      "utm_",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
    ];

    for (const key of [
      ...url.searchParams.keys(),
    ]) {
      if (
        trackingPrefixes.some(
          (prefix) =>
            key === prefix ||
            key.startsWith(prefix)
        )
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return value
      .trim()
      .toLowerCase();
  }
}

/**
 * Select the most relevant portions of a page.
 *
 * Ranking:
 *
 *  - exact query phrase
 *  - query terms appearing in a paragraph
 *  - repeated terms, with diminishing returns
 *  - headings receive an additional relevance bonus
 *  - neighboring paragraphs are retained for context
 */

function selectRelevantContent(
  content: string,
  query: string,
  maxLength = 6000
): string {
  if (!content.trim()) {
    return "";
  }

  if (content.length <= maxLength) {
    return content.trim();
  }

  const stopWords = new Set(stopwords());

  const normalizedQuery = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedQuery) {
    return (
      content.substring(0, maxLength).trim() +
      "\n...[source truncated]"
    );
  }

  // ---------------------------------------------------------------
  // 1. Extract meaningful query terms.
  // ---------------------------------------------------------------

  const terms = [
    ...new Set(
      normalizedQuery
        .split(/\s+/)
        .filter(
          (term) =>
            term.length >= 3 &&
            !stopWords.has(term)
        )
    ),
  ];

  if (terms.length === 0) {
    return (
      content.substring(0, maxLength).trim() +
      "\n...[source truncated]"
    );
  }

  const escapeRegex = (
    value: string
  ) =>
    value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  // ---------------------------------------------------------------
  // 2. Find every keyword occurrence.
  // ---------------------------------------------------------------

  interface Match {
    start: number;
    end: number;
    term: string;
    score: number;
  }

  const matches: Match[] = [];

  for (const term of terms) {
    const regex = new RegExp(
      `\\b${escapeRegex(term)}\\b`,
      "giu"
    );

    let match: RegExpExecArray | null;

    while (
      (match = regex.exec(content)) !== null
    ) {
      matches.push({
        start: match.index,
        end:
          match.index +
          match[0].length,
        term,
        score: 0,
      });

      if (
        match.index ===
        regex.lastIndex
      ) {
        regex.lastIndex++;
      }
    }
  }

  if (matches.length === 0) {
    return (
      content.substring(0, maxLength).trim() +
      "\n...[source truncated]"
    );
  }

  // ---------------------------------------------------------------
  // 3. Score each occurrence.
  //
  // Strong signals:
  //   - exact query phrase nearby
  //   - multiple query terms nearby
  //   - multiple matches clustered together
  //   - longer/more specific terms
  // ---------------------------------------------------------------

  const exactPhrase =
    normalizedQuery.length >= 4
      ? normalizedQuery
      : "";

  for (const match of matches) {
    let score = 1;

    // Longer terms are generally more informative.
    score += Math.min(
      match.term.length / 3,
      4
    );

    const localStart =
      Math.max(
        0,
        match.start - 300
      );

    const localEnd =
      Math.min(
        content.length,
        match.end + 300
      );

    const localContext =
      content
        .substring(
          localStart,
          localEnd
        )
        .toLowerCase();

    // Exact complete-query phrase.
    if (
      exactPhrase &&
      localContext.includes(
        exactPhrase
      )
    ) {
      score += 15;
    }

    // Other query terms nearby.
    for (const term of terms) {
      if (
        term === match.term
      ) {
        continue;
      }

      const regex =
        new RegExp(
          `\\b${escapeRegex(term)}\\b`,
          "iu"
        );

      if (
        regex.test(localContext)
      ) {
        score += 5;
      }
    }

    // Very close keyword clustering.
    for (const other of matches) {
      if (
        other === match
      ) {
        continue;
      }

      const distance =
        Math.abs(
          other.start -
            match.start
        );

      if (distance <= 75) {
        score += 4;
      } else if (
        distance <= 150
      ) {
        score += 2;
      } else if (
        distance <= 300
      ) {
        score += 1;
      }
    }

    match.score = score;
  }

  // ---------------------------------------------------------------
  // 4. Convert matches into relevance regions.
  //
  // The initial region is deliberately small. We will expand it
  // later, which lets the relevance score determine WHERE to spend
  // the context budget.
  // ---------------------------------------------------------------

  interface Region {
    start: number;
    end: number;
    score: number;
  }

  const INITIAL_CONTEXT = 300;

  const regions: Region[] =
    matches.map(
      (match) => ({
        start: Math.max(
          0,
          match.start -
            INITIAL_CONTEXT
        ),
        end: Math.min(
          content.length,
          match.end +
            INITIAL_CONTEXT
        ),
        score:
          match.score,
      })
    );

  // ---------------------------------------------------------------
  // 5. Merge overlapping regions.
  // ---------------------------------------------------------------

  regions.sort(
    (a, b) =>
      a.start - b.start
  );

  const mergedRegions: Region[] =
    [];

  for (const region of regions) {
    const previous =
      mergedRegions[
        mergedRegions.length - 1
      ];

    if (
      previous &&
      region.start <=
        previous.end
    ) {
      previous.end =
        Math.max(
          previous.end,
          region.end
        );

      previous.score =
        Math.max(
          previous.score,
          region.score
        );
    } else {
      mergedRegions.push({
        ...region,
      });
    }
  }

  // ---------------------------------------------------------------
  // 6. Re-score merged regions based on keyword density.
  //
  // A region containing many different query terms is much more
  // useful than a region containing one keyword repeatedly.
  // ---------------------------------------------------------------

  for (const region of mergedRegions) {
    const regionText =
      content
        .substring(
          region.start,
          region.end
        )
        .toLowerCase();

    const uniqueTerms =
      terms.filter((term) => {
        const regex =
          new RegExp(
            `\\b${escapeRegex(term)}\\b`,
            "iu"
          );

        return regex.test(
          regionText
        );
      }).length;

    region.score +=
      uniqueTerms * 6;
  }

  // ---------------------------------------------------------------
  // 7. Rank the strongest regions.
  // ---------------------------------------------------------------

  const rankedRegions =
    mergedRegions
      .map(
        (region, index) => ({
          ...region,
          id: index,
        })
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  // ---------------------------------------------------------------
  // 8. Start with the strongest regions.
  //
  // We don't immediately consume the entire region. Instead, we
  // create selected regions and then expand them outward.
  // ---------------------------------------------------------------

  interface SelectedRegion {
    id: number;
    start: number;
    end: number;
    score: number;
  }

  const selected: SelectedRegion[] =
    [];

  let usedCharacters = 0;

  for (const region of rankedRegions) {
    if (
      selected.length >= 8
    ) {
      break;
    }

    const length =
      region.end -
      region.start;

    if (
      length <= 0
    ) {
      continue;
    }

    if (
      usedCharacters +
        length <=
      maxLength
    ) {
      selected.push({
        id: region.id,
        start: region.start,
        end: region.end,
        score: region.score,
      });

      usedCharacters +=
        length;
    }
  }

  if (selected.length === 0) {
    return (
      content.substring(0, maxLength).trim() +
      "\n...[source truncated]"
    );
  }

  // ---------------------------------------------------------------
  // 9. Merge selected regions if they overlap.
  // ---------------------------------------------------------------

  function mergeSelectedRegions() {
    selected.sort(
      (a, b) =>
        a.start - b.start
    );

    for (
      let i = 0;
      i <
        selected.length - 1;

    ) {
      const current =
        selected[i];

      const next =
        selected[i + 1];

      if (
        current.end >=
        next.start
      ) {
        current.end =
          Math.max(
            current.end,
            next.end
          );

        current.score =
          Math.max(
            current.score,
            next.score
          );

        selected.splice(
          i + 1,
          1
        );
      } else {
        i++;
      }
    }
  }

  mergeSelectedRegions();

  usedCharacters =
    selected.reduce(
      (total, region) =>
        total +
        (region.end -
          region.start),
      0
    );

  // ---------------------------------------------------------------
  // 10. EXPAND the selected regions.
  //
  // This is the important part.
  //
  // Rather than selecting fixed-size chunks, grow the relevant
  // regions outward until the character budget is saturated.
  //
  // We alternate left/right expansion so we don't accidentally
  // spend the entire remaining budget on one side.
  // ---------------------------------------------------------------

  const EXPANSION_STEP = 500;

  while (
    usedCharacters <
      maxLength &&
    selected.length > 0
  ) {
    let expanded = false;

    /*
     * Prioritize higher-scoring regions when deciding where to
     * spend additional context.
     */
    selected.sort(
      (a, b) =>
        b.score - a.score
    );

    for (const region of selected) {
      if (
        usedCharacters >=
        maxLength
      ) {
        break;
      }

      const remaining =
        maxLength -
        usedCharacters;

      const leftAvailable =
        region.start;

      const rightAvailable =
        content.length -
        region.end;

      if (
        leftAvailable <= 0 &&
        rightAvailable <= 0
      ) {
        continue;
      }

      /*
       * Expand on both sides where possible.
       */
      const desired =
        Math.min(
          EXPANSION_STEP,
          remaining
        );

      let leftExpansion =
        Math.min(
          Math.floor(
            desired / 2
          ),
          leftAvailable
        );

      let rightExpansion =
        Math.min(
          desired -
            leftExpansion,
          rightAvailable
        );

      /*
       * If one side ran out, give the unused budget to the other
       * side.
       */
      if (
        leftExpansion <
        Math.floor(
          desired / 2
        )
      ) {
        rightExpansion =
          Math.min(
            desired -
              leftExpansion,
            rightAvailable
          );
      }

      if (
        rightExpansion <
        desired -
          Math.floor(
            desired / 2
          )
      ) {
        leftExpansion =
          Math.min(
            desired -
              rightExpansion,
            leftAvailable
          );
      }

      if (
        leftExpansion === 0 &&
        rightExpansion === 0
      ) {
        continue;
      }

      region.start -=
        leftExpansion;

      region.end +=
        rightExpansion;

      usedCharacters +=
        leftExpansion +
        rightExpansion;

      expanded = true;

      /*
       * If this expansion caused two regions to touch or overlap,
       * merge them before continuing.
       */
      mergeSelectedRegions();
    }

    if (!expanded) {
      break;
    }
  }

  // ---------------------------------------------------------------
  // 11. If there is still unused budget, use the remaining space
  //     around the highest-value region.
  // ---------------------------------------------------------------

  if (
    usedCharacters <
    maxLength
  ) {
    selected.sort(
      (a, b) =>
        b.score - a.score
    );

    const primary =
      selected[0];

    if (primary) {
      const remaining =
        maxLength -
        usedCharacters;

      const leftAvailable =
        primary.start;

      const rightAvailable =
        content.length -
        primary.end;

      const left =
        Math.min(
          Math.floor(
            remaining / 2
          ),
          leftAvailable
        );

      const right =
        Math.min(
          remaining - left,
          rightAvailable
        );

      primary.start -=
        left;

      primary.end +=
        right;

      usedCharacters +=
        left + right;

      mergeSelectedRegions();
    }
  }

  // ---------------------------------------------------------------
  // 12. Return everything in original article order.
  // ---------------------------------------------------------------

  selected.sort(
    (a, b) =>
      a.start - b.start
  );

  const result =
    selected
      .map((region) =>
        content
          .substring(
            region.start,
            region.end
          )
          .trim()
      )
      .filter(Boolean)
      .join(
        "\n\n[...relevant content omitted...]\n\n"
      )
      .trim();

  if (!result) {
    return (
      content.substring(0, maxLength).trim() +
      "\n...[source truncated]"
    );
  }

  return (
    result +
    "\n...[source content selected by relevance]"
  );
}

/**
 * Extract readable text from HTML.
 *
 * Intentionally dependency-free.
 */
function extractText(
  html: string
): string {
  let text = html;

  text = text
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
      " "
    )
    .replace(
      /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
      " "
    )
    .replace(
      /<template\b[^>]*>[\s\S]*?<\/template>/gi,
      " "
    )
    .replace(
      /<!--[\s\S]*?-->/g,
      " "
    );

  const candidates: string[] =
    [];

  const mainMatches =
    text.match(
      /<main\b[^>]*>([\s\S]*?)<\/main>/gi
    );

  const articleMatches =
    text.match(
      /<article\b[^>]*>([\s\S]*?)<\/article>/gi
    );

  if (mainMatches) {
    candidates.push(
      ...mainMatches
    );
  }

  if (articleMatches) {
    candidates.push(
      ...articleMatches
    );
  }

  if (
    candidates.length > 0
  ) {
    text = candidates.sort(
      (a, b) =>
        b.length - a.length
    )[0];
  }

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

  text = text
    .replace(
      /<\/(?:p|div|section|article|main|h1|h2|h3|h4|h5|h6|li|tr)>/gi,
      "\n"
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    );

  text = text.replace(
    /<[^>]+>/g,
    " "
  );

  text = text
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    );

  text = text
    .replace(/\r/g, "")
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n\s*\n\s*\n+/g,
      "\n\n"
    )
    .trim();

  return text;
}

/**
 * Validate and fetch a research candidate.
 *
 * The intentional 4-second wait is preserved.
 */
async function fetchCandidate(
  result: SearXNGResult,
  timeout: number,
  query: string,
  contentLimit: number
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
      new URL(
        result.url
      ).hostname;
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
        () =>
          controller.abort(),
        timeout
      );

    const response =
      await fetch(
        result.url,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          },
          signal:
            controller.signal,
        }
      );

    clearTimeout(timeoutId);

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
          "HTTP 403 Forbidden",
      };
    }

    if (response.status === 429) {
      return {
        usable: false,
        reason:
          "HTTP 429 Too Many Requests",
      };
    }

    if (response.status >= 500) {
      return {
        usable: false,
        reason:
          `HTTP ${response.status}`,
      };
    }

    if (!response.ok) {
      return {
        usable: false,
        reason:
          `HTTP ${response.status}`,
      };
    }

    // Intentionally preserved.
    await sleep(PAGE_WAIT_MS);

    const html =
      await response.text();

    const inspectionText =
      html.substring(
        0,
        MAX_CHALLENGE_INSPECTION_CHARS
      );

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

    let content =
      extractText(html);

    const wordCount =
      content
        .split(/\s+/)
        .filter(Boolean)
        .length;

    if (
      wordCount <
      MIN_PAGE_WORDS
    ) {
      return {
        usable: false,
        reason:
          `insufficient readable page content (${wordCount} words)`,
      };
    }

    content =
      selectRelevantContent(
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
      error.name ===
        "AbortError"
    ) {
      return {
        usable: false,
        reason: "request timed out",
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

/**
 * Shared page fetcher for fetch_page_content.
 *
 * Uses the same important protections as research_web:
 * - timeout
 * - HTTP accessibility checks
 * - intentional challenge detection
 * - minimum 150-word content requirement
 * - relevant-content selection
 */
async function fetchPage(
  url: string,
  timeout: number,
  query: string,
  maxLength: number
): Promise<
  | {
      ok: true;
      content: string;
    }
  | {
      ok: false;
      reason: string;
    }
> {
  try {
    const parsedUrl =
      new URL(url);

    if (
      parsedUrl.protocol !==
        "http:" &&
      parsedUrl.protocol !==
        "https:"
    ) {
      return {
        ok: false,
        reason:
          "unsupported URL protocol",
      };
    }

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(
        () =>
          controller.abort(),
        timeout
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; LM-Studio-Bot/1.0)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          },
          signal:
            controller.signal,
        }
      );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        reason:
          `HTTP ${response.status}`,
      };
    }

    const html =
      await response.text();

    const challenge =
      detectActiveChallenge(
        html.substring(
          0,
          MAX_CHALLENGE_INSPECTION_CHARS
        )
      );

    if (challenge) {
      return {
        ok: false,
        reason:
          `active verification challenge detected: ${challenge}`,
      };
    }

    let content =
      extractText(html);

    const wordCount =
      content
        .split(/\s+/)
        .filter(Boolean)
        .length;

    if (
      wordCount <
      MIN_PAGE_WORDS
    ) {
      return {
        ok: false,
        reason:
          `insufficient readable page content (${wordCount} words)`,
      };
    }

    content =
      selectRelevantContent(
        content,
        query,
        maxLength
      );

    return {
      ok: true,
      content,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      return {
        ok: false,
        reason: "request timed out",
      };
    }

    return {
      ok: false,
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
        .min(1)
        .describe(
          "The search query string"
        ),

      num_results: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe(
          `Number of results to return (1-20). Default: ${defaultPageSize}`
        ),

      time_range: z
        .enum([
          "day",
          "week",
          "month",
          "year",
        ])
        .optional()
        .describe(
          "Optional time filter: day, week, month, or year"
        ),

      page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          "SearXNG result page. Default: 1."
        ),
    },

    implementation: async (params: {
      query: string;
      num_results?: number;
      time_range?: TimeRange;
      page?: number;
    }) => {
      try {
        const {
          query,
          num_results,
          time_range,
          page = 1,
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
          normalizeTimeRange(
            time_range
          );

        if (
          normalizedTimeRange
        ) {
          searchParams.append(
            "time_range",
            normalizedTimeRange
          );
        }

        const searchUrl =
          `${searxngUrl}/search?${searchParams.toString()}`;

        const controller =
          new AbortController();

        const timeoutId =
          setTimeout(
            () =>
              controller.abort(),
            timeout
          );

        const response =
          await fetch(
            searchUrl,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
                "User-Agent":
                  "LM-Studio-Plugin/1.0",
              },
              signal:
                controller.signal,
            }
          );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `SearXNG returned status ${response.status}`
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
              (
                result,
                index
              ) =>
                `[${index + 1}] ${result.title}\n` +
                `URL: ${result.url}\n` +
                `Snippet: ${result.content.substring(
                  0,
                  300
                )}${
                  result.content.length >
                  300
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
          error.name ===
            "AbortError"
        ) {
          return (
            `Error: SearXNG request timed out after ${timeout}ms.`
          );
        }

        return (
          `Error searching SearXNG: ${
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
      "Fetch and extract useful readable content from a specific URL. " +
      "Rejects inaccessible pages, active verification challenges, " +
      "and pages with fewer than 150 readable words.",

    parameters: {
      url: z
        .string()
        .url()
        .describe(
          "The URL to fetch"
        ),

      query: z
        .string()
        .min(1)
        .describe(
          "The question or topic used to select the most relevant parts of the page"
        ),

      max_length: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe(
          "Maximum characters to return. Default: 3000."
        ),
    },

    implementation: async (params: {
      url: string;
      query: string;
      max_length?: number;
    }) => {
      const {
        url,
        query,
        max_length,
      } = params;

      const maxLength =
        max_length ?? 3000;

      const result =
        await fetchPage(
          url,
          timeout,
          query,
          maxLength
        );

      if (!result.ok) {
        return (
          `Unable to use ${url}: ${result.reason}`
        );
      }

      return (
        `Content from ${url}:\n\n` +
        result.content
      );
    },
  });

  // ================================================================
  // research_web
  // ================================================================

  const researchTool = tool({
    name: "research_web",

    description:
	 "Primary web research tool using local SearXNG. " +
	  "Use for factual, current, detailed, comparative, or research questions. " +
	  "Fetches and reads actual webpages, not search snippets, and returns up to 5 usable sources. " +
	  "Rejects inaccessible pages, verification challenges, and pages with fewer than 150 readable words. " +
	  "Avoids duplicate articles while allowing multiple useful sources from the same domain. " +
	  "Answer from the returned SOURCE content and cite factual claims with the supporting SOURCE link immediately after the claim. " +
	  "Only use URLs provided by the returned sources. " +
	  "If no usable pages are found, ask whether to use snippets or continue to the next 15 results. " +
	  "Present distinct news stories separately.",

    parameters: {
      query: z
        .string()
        .min(1)
        .describe(
          "The topic or question to research"
        ),

      sources: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe(
          "Number of usable webpages to collect. Default: 5."
        ),

      time_range: z
        .enum([
          "day",
          "week",
          "month",
          "year",
        ])
        .optional()
        .describe(
          "Optional freshness filter: day, week, month, or year"
        ),

      page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe(
          "SearXNG result page to research. Default: 1."
        ),
    },

    implementation: async (params: {
      query: string;
      sources?: number;
      time_range?: TimeRange;
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
        const searchParams =
          new URLSearchParams({
            q: query,
            format: "json",
            pageno: String(page),
            safesearch: "0",
          });

        const normalizedTimeRange =
          normalizeTimeRange(
            time_range
          );

        if (
          normalizedTimeRange
        ) {
          searchParams.append(
            "time_range",
            normalizedTimeRange
          );
        }

        const searchUrl =
          `${searxngUrl}/search?${searchParams.toString()}`;

        const controller =
          new AbortController();

        const timeoutId =
          setTimeout(
            () =>
              controller.abort(),
            timeout
          );

        const searchResponse =
          await fetch(
            searchUrl,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
                "User-Agent":
                  "LM-Studio-Plugin/1.0",
              },
              signal:
                controller.signal,
            }
          );

        clearTimeout(timeoutId);

        if (
          !searchResponse.ok
        ) {
          throw new Error(
            `SearXNG returned ${searchResponse.status}`
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

        const accepted: AcceptedSource[] =
          [];

        const rejected: RejectedSource[] =
          [];

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

          // Unlike the previous implementation, do not reject
          // another result simply because it comes from the same
          // domain. Only reject obvious duplicate articles.
          if (
            isDuplicateArticle(
              candidate,
              accepted
            )
          ) {
            rejected.push({
              title:
                candidate.title,
              url:
                candidate.url,
              reason:
                "duplicate article",
            });

            continue;
          }

          const contentLimit =
            RESEARCH_CONTENT_LIMITS[
              Math.min(
                accepted.length,
                RESEARCH_CONTENT_LIMITS.length -
                  1
              )
            ];

          const result =
            await fetchCandidate(
              candidate,
              timeout,
              query,
              contentLimit
            );

          if (!result.usable) {
            rejected.push({
              title:
                candidate.title,
              url:
                candidate.url,
              reason:
                result.reason,
            });

            continue;
          }

          accepted.push({
            title:
              result.title,
            url:
              result.url,
            domain:
              result.domain,
            engine:
              result.engine,
            score:
              result.score,
            contentSource:
              "FETCHED_PAGE",
            content:
              result.content,
          });
        }

        if (
          accepted.length === 0
        ) {
          const snippetResults =
            candidates
              .map(
                (
                  candidate,
                  index
                ) =>
                  `[${index + 1}] ${candidate.title}\n` +
                  `URL: ${candidate.url}\n` +
                  `Snippet: ${candidate.content.substring(
                    0,
                    500
                  )}`
              )
              .join(
                "\n\n"
              );

          return (
            `I couldn't access any of the current ${candidateIndex} candidate webpages for "${query}".\n\n` +
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
			`SOURCE USAGE INSTRUCTIONS:\n` +
			`Answer from the SOURCE content below. ` +
			`Immediately cite factual claims with the supporting SOURCE ID. ` +
			`Use only the provided source URLs.\n\n`;

		accepted.forEach(
		  (
			source,
			index
		  ) => {
			output +=
			  `SOURCE ${index + 1}\n` +
			  `Title: ${source.title}\n` +
			  `URL: ${source.url}\n` +
			  `SOURCE ID: [SOURCE ${index + 1}]\n` +
			  `CONTENT:\n` +
			  `${source.content}\n\n`;
		  }
		);

        return output;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name ===
            "AbortError"
        ) {
          return (
            `Research request timed out after ${timeout}ms.`
          );
        }

        return (
          `Error researching "${query}": ${
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
