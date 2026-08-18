"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/config.ts
var import_sdk, configSchematics;
var init_config = __esm({
  "src/config.ts"() {
    "use strict";
    import_sdk = require("@lmstudio/sdk");
    configSchematics = (0, import_sdk.createConfigSchematics)().field(
      "searxngUrl",
      "string",
      {
        displayName: "SearXNG URL",
        subtitle: "Base URL of your local SearXNG instance"
      },
      "http://localhost:8081"
      // Default value as 4th parameter
    ).field(
      "defaultPageSize",
      "numeric",
      {
        displayName: "Default Results Count",
        subtitle: "Number of results to return (1-20)",
        min: 1,
        max: 20
      },
      10
      // Default value as 4th parameter
    ).field(
      "timeout",
      "numeric",
      {
        displayName: "Request Timeout (ms)",
        subtitle: "Timeout for SearXNG requests",
        min: 1e3,
        max: 6e4
      },
      1e4
      // Default value as 4th parameter
    ).build();
  }
});

// src/toolsProvider.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function normalizeForDetection(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function detectActiveChallenge(text) {
  const normalized = normalizeForDetection(text);
  const challengePatterns = [
    [
      /verify (?:you'?re|you are) human/,
      "active human verification"
    ],
    [
      /verifying (?:you'?re|you are) human/,
      "active human verification"
    ],
    [
      /please verify (?:you'?re|you are) human/,
      "active human verification"
    ],
    [
      /are you (?:a )?robot/,
      "active robot verification"
    ],
    [
      /prove (?:you'?re|you are) not a robot/,
      "active robot verification"
    ],
    [
      /i am not a robot/,
      "active robot verification"
    ],
    [
      /i'?m not a robot/,
      "active robot verification"
    ],
    [
      /checking your browser/,
      "browser verification"
    ],
    [
      /checking if you'?re human/,
      "human verification"
    ],
    [
      /checking if you are human/,
      "human verification"
    ],
    [
      /please wait while we verify/,
      "verification process"
    ],
    [
      /complete (?:the )?(?:captcha|challenge)/,
      "CAPTCHA/challenge instruction"
    ],
    [
      /complete the security check/,
      "security check"
    ],
    [
      /click to verify/,
      "verification instruction"
    ],
    [
      /press and hold to verify/,
      "press-and-hold verification"
    ],
    [
      /press and hold to continue/,
      "press-and-hold verification"
    ],
    [
      /drag the slider/,
      "slider verification"
    ],
    [
      /drag the handle/,
      "slider verification"
    ],
    [
      /move the puzzle piece/,
      "puzzle verification"
    ],
    [
      /complete the puzzle/,
      "puzzle verification"
    ],
    [
      /select all images/,
      "image verification"
    ],
    [
      /select all squares/,
      "image verification"
    ],
    [
      /select all the (?:images|squares|pictures)/,
      "image verification"
    ],
    [
      /which image matches/,
      "image verification"
    ],
    [
      /which item matches/,
      "selection verification"
    ],
    [
      /which item doesn'?t belong/,
      "selection verification"
    ]
  ];
  for (const [pattern, reason] of challengePatterns) {
    if (pattern.test(normalized)) {
      return reason;
    }
  }
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const explicitChallengeInstruction = /\bverify\s+(?:that\s+)?(?:you(?:'re| are)|yourself)\s+(?:are\s+)?human\b/i.test(normalized) || /\bi\s*(?:am|'m)\s+not\s+a\s+robot\b/i.test(normalized) || /\b(?:select|choose)\s+all\s+(?:the\s+)?(?:images|squares|tiles)\b/i.test(normalized) || /\b(?:move|drag)\s+(?:the\s+)?(?:slider|puzzle\s+piece)\b/i.test(normalized) || /\b(?:press|click)\s+and\s+hold\s+(?:to\s+)?verify\b/i.test(normalized) || /\bcomplete\s+(?:the\s+)?(?:captcha|challenge|verification)\b/i.test(normalized);
  const hasCaptcha = /\b(?:captcha|recaptcha|hcaptcha)\b/i.test(normalized);
  const hasTurnstile = /\bturnstile\b/i.test(normalized);
  const hasChallengeContext = /\b(?:challenge|verification|verify|human|robot)\b/i.test(normalized);
  if (explicitChallengeInstruction) {
    return "active verification challenge detected";
  }
  if (wordCount < 150 && (hasCaptcha && hasChallengeContext || hasTurnstile && hasChallengeContext)) {
    return "active verification challenge detected";
  }
  return null;
}
function selectRelevantContent(content, query, maxLength = 6e3) {
  if (content.length <= maxLength) {
    return content;
  }
  const stopWords = new Set((0, import_datasets_stopwords_en.default)());
  const terms = query.toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, " ").split(/\s+/).filter(
    (term) => term.length >= 3 && !stopWords.has(term)
  );
  const queryPhrase = query.toLowerCase().replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim();
  if (terms.length === 0) {
    return content.substring(0, maxLength).trim() + "\n...[source truncated]";
  }
  const paragraphs = content.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);
  const scored = paragraphs.map((paragraph, index) => {
    const lower = paragraph.toLowerCase();
    let score = 0;
    if (queryPhrase.length >= 4 && lower.includes(queryPhrase)) {
      score += 5;
    }
    for (const term of terms) {
      const matches = lower.split(term).length - 1;
      score += Math.min(matches, 3);
    }
    return {
      index,
      paragraph,
      score
    };
  });
  const relevant = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (relevant.length === 0) {
    return content.substring(0, maxLength).trim() + "\n...[source truncated]";
  }
  const selected = /* @__PURE__ */ new Set();
  let totalLength = 0;
  for (const item of relevant) {
    const start = Math.max(0, item.index - 1);
    const end = Math.min(
      paragraphs.length - 1,
      item.index + 1
    );
    for (let i = start; i <= end; i++) {
      if (selected.has(i)) continue;
      const addition = paragraphs[i] + "\n\n";
      if (totalLength + addition.length > maxLength) {
        continue;
      }
      selected.add(i);
      totalLength += addition.length;
    }
    if (totalLength >= maxLength * 0.95) {
      break;
    }
  }
  const result = Array.from(selected).sort((a, b) => a - b).map((index) => paragraphs[index]).join("\n\n");
  return result.trim() + (result.length < content.length ? "\n...[source truncated]" : "");
}
function extractText(html) {
  let text = html;
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ").replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ").replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const candidates = [];
  const mainMatches = text.match(
    /<main\b[^>]*>([\s\S]*?)<\/main>/gi
  );
  const articleMatches = text.match(
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi
  );
  if (mainMatches) candidates.push(...mainMatches);
  if (articleMatches) candidates.push(...articleMatches);
  if (candidates.length > 0) {
    text = candidates.sort((a, b) => b.length - a.length)[0];
  }
  text = text.replace(
    /<nav\b[^>]*>[\s\S]*?<\/nav>/gi,
    " "
  ).replace(
    /<footer\b[^>]*>[\s\S]*?<\/footer>/gi,
    " "
  ).replace(
    /<aside\b[^>]*>[\s\S]*?<\/aside>/gi,
    " "
  ).replace(
    /<form\b[^>]*>[\s\S]*?<\/form>/gi,
    " "
  );
  text = text.replace(
    /<\/(?:p|div|section|article|main|h1|h2|h3|h4|h5|h6|li|tr)>/gi,
    "\n"
  ).replace(
    /<br\s*\/?>/gi,
    "\n"
  );
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
  text = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
  return text;
}
async function fetchCandidate(result, timeout, query, sourceIndex) {
  let domain;
  try {
    domain = new URL(result.url).hostname;
  } catch {
    return {
      usable: false,
      reason: "invalid URL"
    };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout
    );
    console.log(
      `research_web: fetching ${result.url}`
    );
    const response = await fetch(result.url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      return {
        usable: false,
        reason: "HTTP 401 Unauthorized"
      };
    }
    if (response.status === 403) {
      return {
        usable: false,
        reason: "HTTP 403 Forbidden \u2014 page inaccessible"
      };
    }
    if (response.status === 429) {
      return {
        usable: false,
        reason: "HTTP 429 Too Many Requests \u2014 rate limited"
      };
    }
    if (response.status >= 500) {
      return {
        usable: false,
        reason: `HTTP ${response.status} ${response.statusText} \u2014 server error`
      };
    }
    if (!response.ok) {
      return {
        usable: false,
        reason: `HTTP ${response.status} ${response.statusText}`
      };
    }
    await sleep(4e3);
    const html = await response.text();
    const inspectionText = html.substring(0, 1e5);
    const challenge = detectActiveChallenge(
      inspectionText
    );
    if (challenge) {
      return {
        usable: false,
        reason: `active verification challenge detected: ${challenge}`
      };
    }
    let content = extractText(html);
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount < 150) {
      return {
        usable: false,
        reason: `insufficient readable page content (${wordCount} words)`
      };
    }
    const contentLimits = [
      4e3,
      3e3,
      2e3,
      1500,
      1500
    ];
    const contentLimit = contentLimits[Math.min(
      sourceIndex,
      contentLimits.length - 1
    )];
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
      content
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usable: false,
        reason: `request timed out after ${timeout}ms`
      };
    }
    return {
      usable: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
async function toolsProvider(ctl) {
  const tools = [];
  const config = ctl.getPluginConfig(
    configSchematics
  );
  const searxngUrl = config.get(
    "searxngUrl"
  );
  const defaultPageSize = config.get(
    "defaultPageSize"
  );
  const timeout = config.get(
    "timeout"
  );
  const searchTool = (0, import_sdk2.tool)({
    name: "search_web",
    description: "Limited web search using local SearXNG. Returns snippets only and should be used only when full webpage research is unavailable or unnecessary. For factual, detailed, current, comparative, or research questions, use research_web instead.",
    parameters: {
      query: import_zod.z.string().describe(
        "The search query string"
      ),
      num_results: import_zod.z.number().min(1).max(20).optional().describe(
        `Number of results to return (1-20). Default: ${defaultPageSize}`
      ),
      time_range: import_zod.z.string().optional().describe(
        "Optional time filter: 'day', 'week', 'month', or 'year'"
      )
    },
    implementation: async (params) => {
      try {
        const {
          query,
          num_results,
          time_range
        } = params;
        const pageSize = num_results ?? defaultPageSize;
        const searchParams = new URLSearchParams({
          q: query,
          format: "json",
          pageno: String(page),
          safesearch: "0"
        });
        const normalizedTimeRange = time_range?.toLowerCase().trim();
        if (normalizedTimeRange) {
          const validRanges = [
            "day",
            "week",
            "month",
            "year"
          ];
          if (validRanges.includes(
            normalizedTimeRange
          )) {
            searchParams.append(
              "time_range",
              normalizedTimeRange
            );
          }
        }
        const searchUrl = `${searxngUrl}/search?${searchParams.toString()}`;
        console.log(
          `Querying SearXNG: ${searchUrl.replace(
            /format=json/,
            "format=..."
          )}`
        );
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          timeout
        );
        const response = await fetch(searchUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "LM-Studio-Plugin/1.0"
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(
            `SearXNG returned status ${response.status}: ${response.statusText}`
          );
        }
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
          return `No results found for query: "${query}"`;
        }
        const formattedResults = data.results.slice(0, pageSize).map(
          (result, index) => `[${index + 1}] ${result.title}
URL: ${result.url}
Snippet: ${result.content.substring(
            0,
            300
          )}${result.content.length > 300 ? "..." : ""}
Source: ${result.engine}`
        ).join("\n\n");
        return `Search results for "${query}" (${Math.min(
          data.results.length,
          pageSize
        )} of ${data.number_of_results} total):

` + formattedResults + "\n\nNote: These results are from SearXNG metasearch engine aggregating multiple sources.";
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return `Error: SearXNG request timed out after ${timeout}ms. Check that SearXNG is running at ${searxngUrl}.`;
        }
        return `Error searching SearXNG: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
  const fetchPageTool = (0, import_sdk2.tool)({
    name: "fetch_page_content",
    description: "Fetch and extract text content from a specific URL.",
    parameters: {
      url: import_zod.z.string().url().describe(
        "The URL to fetch"
      ),
      max_length: import_zod.z.number().min(100).max(1e4).optional().describe(
        "Maximum characters to return. Default: 2000."
      )
    },
    implementation: async (params) => {
      try {
        const {
          url,
          max_length
        } = params;
        const maxLength = max_length ?? 2e3;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LM-Studio-Bot/1.0)"
          }
        });
        if (!response.ok) {
          return `Failed to fetch ${url}: ${response.status} ${response.statusText}`;
        }
        const html = await response.text();
        let text = extractText(html);
        if (text.length > maxLength) {
          text = text.substring(
            0,
            maxLength
          ) + "... [truncated]";
        }
        return `Content from ${url}:

${text}`;
      } catch (error) {
        return `Error fetching page: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
  const researchTool = (0, import_sdk2.tool)({
    name: "research_web",
    description: "Primary web research tool using local SearXNG. Use for factual, detailed, current, comparative, or research questions. Fetches and reads actual webpages, not snippets, and collects up to 5 usable sources. Rejects inaccessible pages and active verification challenges. Compare multiple sources and answer from the returned SOURCE content. For all factual claims, include a Markdown link to its supporting SOURCE immediately after the claim. Use the SOURCE title as the link text, including the article's date if available. Only link to URLs present in the returned SOURCE list. If no usable webpages are found on page 1, ask whether the user wants the available snippets or the next 15 candidates from page 2. If the user requests the next results, call this tool again with page 2. Do not automatically use snippets unless the user chooses them. Present distinct news stories separately rather than combining them into a single narrative.",
    parameters: {
      query: import_zod.z.string().describe(
        "The topic or question to research"
      ),
      sources: import_zod.z.number().min(1).max(5).optional().describe(
        "Number of usable webpages to collect. Default: 5."
      ),
      time_range: import_zod.z.string().optional().describe(
        "Optional freshness filter: 'day', 'week', 'month', or 'year'"
      ),
      page: import_zod.z.number().int().min(1).optional().describe(
        "SearXNG result page to research. Default: 1."
      )
    },
    implementation: async (params) => {
      const {
        query,
        sources,
        time_range,
        page: page2 = 1
      } = params;
      const targetSources = sources ?? DEFAULT_RESEARCH_SOURCES;
      try {
        const searchParams = new URLSearchParams({
          q: query,
          format: "json",
          pageno: String(page2),
          safesearch: "0"
        });
        if (time_range) {
          const validRanges = [
            "day",
            "week",
            "month",
            "year"
          ];
          if (validRanges.includes(
            time_range
          )) {
            searchParams.append(
              "time_range",
              time_range
            );
          }
        }
        const searchUrl = `${searxngUrl}/search?${searchParams.toString()}`;
        console.log(
          `research_web: searching for "${query}"`
        );
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          timeout
        );
        const searchResponse = await fetch(searchUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "LM-Studio-Plugin/1.0"
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!searchResponse.ok) {
          throw new Error(
            `SearXNG returned ${searchResponse.status}: ${searchResponse.statusText}`
          );
        }
        const data = await searchResponse.json();
        if (!data.results || data.results.length === 0) {
          return `No search results found for "${query}".`;
        }
        const candidates = data.results.slice(
          0,
          RESEARCH_CANDIDATES
        );
        console.log(
          `research_web: received ${candidates.length} candidates`
        );
        const accepted = [];
        const rejected = [];
        const seenDomains = /* @__PURE__ */ new Set();
        let candidateIndex = 0;
        while (accepted.length < targetSources && candidateIndex < candidates.length) {
          const candidate = candidates[candidateIndex];
          candidateIndex++;
          let domain;
          try {
            domain = new URL(
              candidate.url
            ).hostname.toLowerCase();
          } catch {
            rejected.push({
              title: candidate.title,
              url: candidate.url,
              reason: "invalid URL"
            });
            continue;
          }
          if (seenDomains.has(
            domain
          )) {
            rejected.push({
              title: candidate.title,
              url: candidate.url,
              reason: "duplicate domain"
            });
            continue;
          }
          console.log(
            `research_web: checking candidate ${candidateIndex}/${candidates.length}: ${candidate.url}`
          );
          const result = await fetchCandidate(
            candidate,
            timeout,
            query,
            accepted.length
          );
          if (!result.usable) {
            console.log(
              `research_web: REJECTED \u2014 ${candidate.url} \u2014 ${result.reason}`
            );
            rejected.push({
              title: candidate.title,
              url: candidate.url,
              reason: result.reason
            });
            continue;
          }
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
            content: result.content
          });
          console.log(
            `research_web: ACCEPTED ${accepted.length}/${targetSources}: ${result.url}`
          );
        }
        if (accepted.length === 0) {
          const snippetResults = candidates.map(
            (candidate, index) => `[${index + 1}] ${candidate.title}
URL: ${candidate.url}
Snippet: ${candidate.content.substring(0, 500)}`
          ).join("\n\n");
          return `I couldn't access any of the current ${candidateIndex} candidate webpages for "${query}".

Would you like me to use the available search snippets, or attempt the next 15 search results?

AVAILABLE SNIPPETS:

` + snippetResults;
        }
        let output = `RESEARCH RESULTS
Query: ${query}
Usable sources: ${accepted.length}/${targetSources}
Candidates checked: ${candidateIndex}

Only sources listed under SOURCE 1 through SOURCE ${accepted.length} were accepted and supplied as research material.

`;
        accepted.forEach(
          (source, index) => {
            output += `SOURCE ${index + 1}
Title: ${source.title}
URL: ${source.url}
${source.content}

`;
          }
        );
        return output;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return `Research request timed out after ${timeout}ms. Check SearXNG at ${searxngUrl}.`;
        }
        return `Error researching "${query}": ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
  tools.push(searchTool);
  tools.push(fetchPageTool);
  tools.push(researchTool);
  return tools;
}
var import_sdk2, import_zod, import_datasets_stopwords_en, RESEARCH_CANDIDATES, DEFAULT_RESEARCH_SOURCES;
var init_toolsProvider = __esm({
  "src/toolsProvider.ts"() {
    "use strict";
    import_sdk2 = require("@lmstudio/sdk");
    import_zod = require("zod");
    init_config();
    import_datasets_stopwords_en = __toESM(require("@stdlib/datasets-stopwords-en"));
    RESEARCH_CANDIDATES = 15;
    DEFAULT_RESEARCH_SOURCES = 5;
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  main: () => main
});
async function main(context) {
  context.withConfigSchematics(configSchematics);
  context.withToolsProvider(toolsProvider);
  console.log("SearXNG Search Plugin initialized");
}
var init_src = __esm({
  "src/index.ts"() {
    "use strict";
    init_toolsProvider();
    init_config();
  }
});

// .lmstudio/entry.ts
var import_sdk3 = require("@lmstudio/sdk");
var clientIdentifier = process.env.LMS_PLUGIN_CLIENT_IDENTIFIER;
var clientPasskey = process.env.LMS_PLUGIN_CLIENT_PASSKEY;
var baseUrl = process.env.LMS_PLUGIN_BASE_URL;
var client = new import_sdk3.LMStudioClient({
  clientIdentifier,
  clientPasskey,
  baseUrl
});
globalThis.__LMS_PLUGIN_CONTEXT = true;
var predictionLoopHandlerSet = false;
var promptPreprocessorSet = false;
var configSchematicsSet = false;
var globalConfigSchematicsSet = false;
var toolsProviderSet = false;
var generatorSet = false;
var selfRegistrationHost = client.plugins.getSelfRegistrationHost();
var pluginContext = {
  withPredictionLoopHandler: (generate) => {
    if (predictionLoopHandlerSet) {
      throw new Error("PredictionLoopHandler already registered");
    }
    if (toolsProviderSet) {
      throw new Error("PredictionLoopHandler cannot be used with a tools provider");
    }
    predictionLoopHandlerSet = true;
    selfRegistrationHost.setPredictionLoopHandler(generate);
    return pluginContext;
  },
  withPromptPreprocessor: (preprocess) => {
    if (promptPreprocessorSet) {
      throw new Error("PromptPreprocessor already registered");
    }
    promptPreprocessorSet = true;
    selfRegistrationHost.setPromptPreprocessor(preprocess);
    return pluginContext;
  },
  withConfigSchematics: (configSchematics2) => {
    if (configSchematicsSet) {
      throw new Error("Config schematics already registered");
    }
    configSchematicsSet = true;
    selfRegistrationHost.setConfigSchematics(configSchematics2);
    return pluginContext;
  },
  withGlobalConfigSchematics: (globalConfigSchematics) => {
    if (globalConfigSchematicsSet) {
      throw new Error("Global config schematics already registered");
    }
    globalConfigSchematicsSet = true;
    selfRegistrationHost.setGlobalConfigSchematics(globalConfigSchematics);
    return pluginContext;
  },
  withToolsProvider: (toolsProvider2) => {
    if (toolsProviderSet) {
      throw new Error("Tools provider already registered");
    }
    if (predictionLoopHandlerSet) {
      throw new Error("Tools provider cannot be used with a predictionLoopHandler");
    }
    toolsProviderSet = true;
    selfRegistrationHost.setToolsProvider(toolsProvider2);
    return pluginContext;
  },
  withGenerator: (generator) => {
    if (generatorSet) {
      throw new Error("Generator already registered");
    }
    generatorSet = true;
    selfRegistrationHost.setGenerator(generator);
    return pluginContext;
  }
};
Promise.resolve().then(() => (init_src(), src_exports)).then(async (module2) => {
  return await module2.main(pluginContext);
}).then(() => {
  selfRegistrationHost.initCompleted();
}).catch((error) => {
  console.error("Failed to execute the main function of the plugin.");
  console.error(error);
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZy50cyIsICIuLi9zcmMvdG9vbHNQcm92aWRlci50cyIsICIuLi9zcmMvaW5kZXgudHMiLCAiZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNyZWF0ZUNvbmZpZ1NjaGVtYXRpY3MgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNvbmZpZ1NjaGVtYXRpY3MgPSBjcmVhdGVDb25maWdTY2hlbWF0aWNzKClcclxuICAuZmllbGQoXHJcbiAgICBcInNlYXJ4bmdVcmxcIixcclxuICAgIFwic3RyaW5nXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlNlYXJYTkcgVVJMXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIkJhc2UgVVJMIG9mIHlvdXIgbG9jYWwgU2VhclhORyBpbnN0YW5jZVwiLFxyXG4gICAgfSxcclxuICAgIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgxXCIgIC8vIERlZmF1bHQgdmFsdWUgYXMgNHRoIHBhcmFtZXRlclxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcImRlZmF1bHRQYWdlU2l6ZVwiLFxyXG4gICAgXCJudW1lcmljXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkRlZmF1bHQgUmVzdWx0cyBDb3VudFwiLFxyXG4gICAgICBzdWJ0aXRsZTogXCJOdW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm4gKDEtMjApXCIsXHJcbiAgICAgIG1pbjogMSxcclxuICAgICAgbWF4OiAyMCxcclxuICAgIH0sXHJcbiAgICAxMCAgLy8gRGVmYXVsdCB2YWx1ZSBhcyA0dGggcGFyYW1ldGVyXHJcbiAgKVxyXG4gIC5maWVsZChcclxuICAgIFwidGltZW91dFwiLFxyXG4gICAgXCJudW1lcmljXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlJlcXVlc3QgVGltZW91dCAobXMpXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIlRpbWVvdXQgZm9yIFNlYXJYTkcgcmVxdWVzdHNcIixcclxuICAgICAgbWluOiAxMDAwLFxyXG4gICAgICBtYXg6IDYwMDAwLFxyXG4gICAgfSxcclxuICAgIDEwMDAwICAvLyBEZWZhdWx0IHZhbHVlIGFzIDR0aCBwYXJhbWV0ZXJcclxuICApXHJcbiAgLmJ1aWxkKCk7XHJcbiIsICJpbXBvcnQgeyB0b29sLCBUb29sLCBUb29sc1Byb3ZpZGVyQ29udHJvbGxlciB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcbmltcG9ydCB7IHogfSBmcm9tIFwiem9kXCI7XHJcbmltcG9ydCB7IGNvbmZpZ1NjaGVtYXRpY3MgfSBmcm9tIFwiLi9jb25maWdcIjtcclxuaW1wb3J0IHN0b3B3b3JkcyBmcm9tIFwiQHN0ZGxpYi9kYXRhc2V0cy1zdG9wd29yZHMtZW5cIjtcclxuXHJcbmludGVyZmFjZSBTZWFyWE5HUmVzdWx0IHtcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIHVybDogc3RyaW5nO1xyXG4gIGNvbnRlbnQ6IHN0cmluZztcclxuICBlbmdpbmU6IHN0cmluZztcclxuICBzY29yZT86IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIFNlYXJYTkdSZXNwb25zZSB7XHJcbiAgcXVlcnk6IHN0cmluZztcclxuICBudW1iZXJfb2ZfcmVzdWx0czogbnVtYmVyO1xyXG4gIHJlc3VsdHM6IFNlYXJYTkdSZXN1bHRbXTtcclxufVxyXG5cclxuaW50ZXJmYWNlIEFjY2VwdGVkU291cmNlIHtcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIHVybDogc3RyaW5nO1xyXG4gIGRvbWFpbjogc3RyaW5nO1xyXG4gIGVuZ2luZTogc3RyaW5nO1xyXG4gIHNjb3JlPzogbnVtYmVyO1xyXG4gIGNvbnRlbnRTb3VyY2U6IFwiRkVUQ0hFRF9QQUdFXCI7XHJcbiAgY29udGVudDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVqZWN0ZWRTb3VyY2Uge1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgdXJsOiBzdHJpbmc7XHJcbiAgcmVhc29uOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIFJlc2VhcmNoIHBpcGVsaW5lIHNldHRpbmdzLlxyXG5jb25zdCBQQUdFX1dBSVRfTVMgPSA0MDAwO1xyXG5jb25zdCBSRVNFQVJDSF9DQU5ESURBVEVTID0gMTU7XHJcbmNvbnN0IERFRkFVTFRfUkVTRUFSQ0hfU09VUkNFUyA9IDU7XHJcblxyXG4vKipcclxuICogUGF1c2UgYmVmb3JlIGluc3BlY3RpbmcgYSBzdWNjZXNzZnVsbHkgZmV0Y2hlZCBwYWdlLlxyXG4gKlxyXG4gKiBUaGlzIGdpdmVzIHRyYW5zaWVudCBzZWN1cml0eS9jaGFsbGVuZ2UgcGFnZXMgYSBmZXcgc2Vjb25kc1xyXG4gKiB0byByZW5kZXIgYmVmb3JlIHdlIGRlY2lkZSB3aGV0aGVyIHRoZSBwYWdlIGlzIHVzYWJsZS5cclxuICovXHJcbmZ1bmN0aW9uIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE5vcm1hbGl6ZSB0ZXh0IGZvciBjaGFsbGVuZ2UgZGV0ZWN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplRm9yRGV0ZWN0aW9uKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIHRleHRcclxuICAgIC50b0xvd2VyQ2FzZSgpXHJcbiAgICAucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcclxuICAgIC50cmltKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlY3QgYW4gQUNUSVZFIGh1bWFuLXZlcmlmaWNhdGlvbiBwYWdlLlxyXG4gKlxyXG4gKiBJbXBvcnRhbnQ6XHJcbiAqXHJcbiAqIFdlIGRvIE5PVCByZWplY3QgYSBwYWdlIHNpbXBseSBiZWNhdXNlIGl0IG1lbnRpb25zOlxyXG4gKlxyXG4gKiAgIENsb3VkZmxhcmVcclxuICogICBib3RcclxuICogICBib3QgZGV0ZWN0aW9uXHJcbiAqICAgc2VjdXJpdHlcclxuICogICBDQVBUQ0hBXHJcbiAqICAgdmVyaWZpY2F0aW9uXHJcbiAqXHJcbiAqIFRob3NlIHdvcmRzIGNhbiBuYXR1cmFsbHkgb2NjdXIgaW4gbGVnaXRpbWF0ZSBhcnRpY2xlcy5cclxuICpcclxuICogV2UgYXJlIGxvb2tpbmcgZm9yIGxhbmd1YWdlIHRoYXQgaW5kaWNhdGVzIHRoZSBQQUdFIElTIENVUlJFTlRMWVxyXG4gKiBBU0tJTkcgVEhFIFZJU0lUT1IgVE8gQ09NUExFVEUgQSBIVU1BTi9CT1QgVkVSSUZJQ0FUSU9OLlxyXG4gKi9cclxuZnVuY3Rpb24gZGV0ZWN0QWN0aXZlQ2hhbGxlbmdlKHRleHQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVGb3JEZXRlY3Rpb24odGV4dCk7XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIEV4cGxpY2l0IGFjdGl2ZSB2ZXJpZmljYXRpb24gaW5zdHJ1Y3Rpb25zLlxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBjb25zdCBjaGFsbGVuZ2VQYXR0ZXJuczogQXJyYXk8W1JlZ0V4cCwgc3RyaW5nXT4gPSBbXHJcbiAgICBbXHJcbiAgICAgIC92ZXJpZnkgKD86eW91Jz9yZXx5b3UgYXJlKSBodW1hbi8sXHJcbiAgICAgIFwiYWN0aXZlIGh1bWFuIHZlcmlmaWNhdGlvblwiLFxyXG4gICAgXSxcclxuICAgIFtcclxuICAgICAgL3ZlcmlmeWluZyAoPzp5b3UnP3JlfHlvdSBhcmUpIGh1bWFuLyxcclxuICAgICAgXCJhY3RpdmUgaHVtYW4gdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvcGxlYXNlIHZlcmlmeSAoPzp5b3UnP3JlfHlvdSBhcmUpIGh1bWFuLyxcclxuICAgICAgXCJhY3RpdmUgaHVtYW4gdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvYXJlIHlvdSAoPzphICk/cm9ib3QvLFxyXG4gICAgICBcImFjdGl2ZSByb2JvdCB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9wcm92ZSAoPzp5b3UnP3JlfHlvdSBhcmUpIG5vdCBhIHJvYm90LyxcclxuICAgICAgXCJhY3RpdmUgcm9ib3QgdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvaSBhbSBub3QgYSByb2JvdC8sXHJcbiAgICAgIFwiYWN0aXZlIHJvYm90IHZlcmlmaWNhdGlvblwiLFxyXG4gICAgXSxcclxuICAgIFtcclxuICAgICAgL2knP20gbm90IGEgcm9ib3QvLFxyXG4gICAgICBcImFjdGl2ZSByb2JvdCB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9jaGVja2luZyB5b3VyIGJyb3dzZXIvLFxyXG4gICAgICBcImJyb3dzZXIgdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvY2hlY2tpbmcgaWYgeW91Jz9yZSBodW1hbi8sXHJcbiAgICAgIFwiaHVtYW4gdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvY2hlY2tpbmcgaWYgeW91IGFyZSBodW1hbi8sXHJcbiAgICAgIFwiaHVtYW4gdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvcGxlYXNlIHdhaXQgd2hpbGUgd2UgdmVyaWZ5LyxcclxuICAgICAgXCJ2ZXJpZmljYXRpb24gcHJvY2Vzc1wiLFxyXG4gICAgXSxcclxuICAgIFtcclxuICAgICAgL2NvbXBsZXRlICg/OnRoZSApPyg/OmNhcHRjaGF8Y2hhbGxlbmdlKS8sXHJcbiAgICAgIFwiQ0FQVENIQS9jaGFsbGVuZ2UgaW5zdHJ1Y3Rpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9jb21wbGV0ZSB0aGUgc2VjdXJpdHkgY2hlY2svLFxyXG4gICAgICBcInNlY3VyaXR5IGNoZWNrXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvY2xpY2sgdG8gdmVyaWZ5LyxcclxuICAgICAgXCJ2ZXJpZmljYXRpb24gaW5zdHJ1Y3Rpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9wcmVzcyBhbmQgaG9sZCB0byB2ZXJpZnkvLFxyXG4gICAgICBcInByZXNzLWFuZC1ob2xkIHZlcmlmaWNhdGlvblwiLFxyXG4gICAgXSxcclxuICAgIFtcclxuICAgICAgL3ByZXNzIGFuZCBob2xkIHRvIGNvbnRpbnVlLyxcclxuICAgICAgXCJwcmVzcy1hbmQtaG9sZCB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9kcmFnIHRoZSBzbGlkZXIvLFxyXG4gICAgICBcInNsaWRlciB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9kcmFnIHRoZSBoYW5kbGUvLFxyXG4gICAgICBcInNsaWRlciB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9tb3ZlIHRoZSBwdXp6bGUgcGllY2UvLFxyXG4gICAgICBcInB1enpsZSB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC9jb21wbGV0ZSB0aGUgcHV6emxlLyxcclxuICAgICAgXCJwdXp6bGUgdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvc2VsZWN0IGFsbCBpbWFnZXMvLFxyXG4gICAgICBcImltYWdlIHZlcmlmaWNhdGlvblwiLFxyXG4gICAgXSxcclxuICAgIFtcclxuICAgICAgL3NlbGVjdCBhbGwgc3F1YXJlcy8sXHJcbiAgICAgIFwiaW1hZ2UgdmVyaWZpY2F0aW9uXCIsXHJcbiAgICBdLFxyXG4gICAgW1xyXG4gICAgICAvc2VsZWN0IGFsbCB0aGUgKD86aW1hZ2VzfHNxdWFyZXN8cGljdHVyZXMpLyxcclxuICAgICAgXCJpbWFnZSB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC93aGljaCBpbWFnZSBtYXRjaGVzLyxcclxuICAgICAgXCJpbWFnZSB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC93aGljaCBpdGVtIG1hdGNoZXMvLFxyXG4gICAgICBcInNlbGVjdGlvbiB2ZXJpZmljYXRpb25cIixcclxuICAgIF0sXHJcbiAgICBbXHJcbiAgICAgIC93aGljaCBpdGVtIGRvZXNuJz90IGJlbG9uZy8sXHJcbiAgICAgIFwic2VsZWN0aW9uIHZlcmlmaWNhdGlvblwiLFxyXG4gICAgXSxcclxuICBdO1xyXG5cclxuICBmb3IgKGNvbnN0IFtwYXR0ZXJuLCByZWFzb25dIG9mIGNoYWxsZW5nZVBhdHRlcm5zKSB7XHJcbiAgICBpZiAocGF0dGVybi50ZXN0KG5vcm1hbGl6ZWQpKSB7XHJcbiAgICAgIHJldHVybiByZWFzb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBDQVBUQ0hBIHN5c3RlbXMuXHJcbiAgLy9cclxuICAvLyBBIHBhZ2Ugc2F5aW5nIFwidGhpcyBhcnRpY2xlIGRpc2N1c3NlcyBDQVBUQ0hBXCIgc2hvdWxkIG5vdCBiZVxyXG4gIC8vIHJlamVjdGVkLiBXZSB0aGVyZWZvcmUgcmVxdWlyZSBhY3RpdmUvaW5zdHJ1Y3Rpb25hbCBjb250ZXh0LlxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuY29uc3Qgd29yZENvdW50ID0gbm9ybWFsaXplZFxyXG4gIC5zcGxpdCgvXFxzKy8pXHJcbiAgLmZpbHRlcihCb29sZWFuKVxyXG4gIC5sZW5ndGg7XHJcblxyXG5jb25zdCBleHBsaWNpdENoYWxsZW5nZUluc3RydWN0aW9uID1cclxuICAvXFxidmVyaWZ5XFxzKyg/OnRoYXRcXHMrKT8oPzp5b3UoPzoncmV8IGFyZSl8eW91cnNlbGYpXFxzKyg/OmFyZVxccyspP2h1bWFuXFxiL2kudGVzdChub3JtYWxpemVkKSB8fFxyXG4gIC9cXGJpXFxzKig/OmFtfCdtKVxccytub3RcXHMrYVxccytyb2JvdFxcYi9pLnRlc3Qobm9ybWFsaXplZCkgfHxcclxuICAvXFxiKD86c2VsZWN0fGNob29zZSlcXHMrYWxsXFxzKyg/OnRoZVxccyspPyg/OmltYWdlc3xzcXVhcmVzfHRpbGVzKVxcYi9pLnRlc3Qobm9ybWFsaXplZCkgfHxcclxuICAvXFxiKD86bW92ZXxkcmFnKVxccysoPzp0aGVcXHMrKT8oPzpzbGlkZXJ8cHV6emxlXFxzK3BpZWNlKVxcYi9pLnRlc3Qobm9ybWFsaXplZCkgfHxcclxuICAvXFxiKD86cHJlc3N8Y2xpY2spXFxzK2FuZFxccytob2xkXFxzKyg/OnRvXFxzKyk/dmVyaWZ5XFxiL2kudGVzdChub3JtYWxpemVkKSB8fFxyXG4gIC9cXGJjb21wbGV0ZVxccysoPzp0aGVcXHMrKT8oPzpjYXB0Y2hhfGNoYWxsZW5nZXx2ZXJpZmljYXRpb24pXFxiL2kudGVzdChub3JtYWxpemVkKTtcclxuXHJcbmNvbnN0IGhhc0NhcHRjaGEgPVxyXG4gIC9cXGIoPzpjYXB0Y2hhfHJlY2FwdGNoYXxoY2FwdGNoYSlcXGIvaS50ZXN0KG5vcm1hbGl6ZWQpO1xyXG5cclxuY29uc3QgaGFzVHVybnN0aWxlID1cclxuICAvXFxidHVybnN0aWxlXFxiL2kudGVzdChub3JtYWxpemVkKTtcclxuXHJcbmNvbnN0IGhhc0NoYWxsZW5nZUNvbnRleHQgPVxyXG4gIC9cXGIoPzpjaGFsbGVuZ2V8dmVyaWZpY2F0aW9ufHZlcmlmeXxodW1hbnxyb2JvdClcXGIvaS50ZXN0KG5vcm1hbGl6ZWQpO1xyXG5cclxuaWYgKGV4cGxpY2l0Q2hhbGxlbmdlSW5zdHJ1Y3Rpb24pIHtcclxuICByZXR1cm4gXCJhY3RpdmUgdmVyaWZpY2F0aW9uIGNoYWxsZW5nZSBkZXRlY3RlZFwiO1xyXG59XHJcblxyXG5pZiAoXHJcbiAgd29yZENvdW50IDwgMTUwICYmXHJcbiAgKFxyXG4gICAgKGhhc0NhcHRjaGEgJiYgaGFzQ2hhbGxlbmdlQ29udGV4dCkgfHxcclxuICAgIChoYXNUdXJuc3RpbGUgJiYgaGFzQ2hhbGxlbmdlQ29udGV4dClcclxuICApXHJcbikge1xyXG4gIHJldHVybiBcImFjdGl2ZSB2ZXJpZmljYXRpb24gY2hhbGxlbmdlIGRldGVjdGVkXCI7XHJcbn1cclxuXHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdFJlbGV2YW50Q29udGVudChcclxuICBjb250ZW50OiBzdHJpbmcsXHJcbiAgcXVlcnk6IHN0cmluZyxcclxuICBtYXhMZW5ndGggPSA2MDAwXHJcbik6IHN0cmluZyB7XHJcbiAgaWYgKGNvbnRlbnQubGVuZ3RoIDw9IG1heExlbmd0aCkge1xyXG4gICAgcmV0dXJuIGNvbnRlbnQ7XHJcbiAgfVxyXG5cclxuXHRjb25zdCBzdG9wV29yZHMgPSBuZXcgU2V0KHN0b3B3b3JkcygpKTtcclxuXHJcbiAgY29uc3QgdGVybXMgPSBxdWVyeVxyXG4gICAgLnRvTG93ZXJDYXNlKClcclxuICAgIC5yZXBsYWNlKC9bXlxccHtMfVxccHtOfVxccy4tXS9ndSwgXCIgXCIpXHJcbiAgICAuc3BsaXQoL1xccysvKVxyXG4gICAgLmZpbHRlcihcclxuICAgICAgKHRlcm0pID0+XHJcbiAgICAgICAgdGVybS5sZW5ndGggPj0gMyAmJlxyXG4gICAgICAgICFzdG9wV29yZHMuaGFzKHRlcm0pXHJcbiAgICApO1xyXG5cdFxyXG5cdGNvbnN0IHF1ZXJ5UGhyYXNlID0gcXVlcnlcclxuXHQgIC50b0xvd2VyQ2FzZSgpXHJcblx0ICAucmVwbGFjZSgvW15cXHB7TH1cXHB7Tn1cXHMuLV0vZ3UsIFwiIFwiKVxyXG5cdCAgLnJlcGxhY2UoL1xccysvZywgXCIgXCIpXHJcblx0ICAudHJpbSgpO1xyXG5cclxuICBpZiAodGVybXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gY29udGVudC5zdWJzdHJpbmcoMCwgbWF4TGVuZ3RoKS50cmltKCkgK1xyXG4gICAgICBcIlxcbi4uLltzb3VyY2UgdHJ1bmNhdGVkXVwiO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcGFyYWdyYXBocyA9IGNvbnRlbnRcclxuICAgIC5zcGxpdCgvXFxuXFxzKlxcbi8pXHJcbiAgICAubWFwKCh0ZXh0KSA9PiB0ZXh0LnRyaW0oKSlcclxuICAgIC5maWx0ZXIoQm9vbGVhbik7XHJcblxyXG4gIGNvbnN0IHNjb3JlZCA9IHBhcmFncmFwaHMubWFwKChwYXJhZ3JhcGgsIGluZGV4KSA9PiB7XHJcbiAgICBjb25zdCBsb3dlciA9IHBhcmFncmFwaC50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgIGxldCBzY29yZSA9IDA7XHJcblxyXG5cdGlmIChcclxuXHQgIHF1ZXJ5UGhyYXNlLmxlbmd0aCA+PSA0ICYmXHJcblx0ICBsb3dlci5pbmNsdWRlcyhxdWVyeVBocmFzZSlcclxuXHQpIHtcclxuXHQgIHNjb3JlICs9IDU7XHJcblx0fVxyXG5cclxuICAgIGZvciAoY29uc3QgdGVybSBvZiB0ZXJtcykge1xyXG4gICAgICBjb25zdCBtYXRjaGVzID0gbG93ZXIuc3BsaXQodGVybSkubGVuZ3RoIC0gMTtcclxuICAgICAgc2NvcmUgKz0gTWF0aC5taW4obWF0Y2hlcywgMyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaW5kZXgsXHJcbiAgICAgIHBhcmFncmFwaCxcclxuICAgICAgc2NvcmUsXHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCByZWxldmFudCA9IHNjb3JlZFxyXG4gICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zY29yZSA+IDApXHJcbiAgICAuc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xyXG5cclxuICBpZiAocmVsZXZhbnQubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gY29udGVudC5zdWJzdHJpbmcoMCwgbWF4TGVuZ3RoKS50cmltKCkgK1xyXG4gICAgICBcIlxcbi4uLltzb3VyY2UgdHJ1bmNhdGVkXVwiO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgc2VsZWN0ZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcbiAgbGV0IHRvdGFsTGVuZ3RoID0gMDtcclxuXHJcbiAgZm9yIChjb25zdCBpdGVtIG9mIHJlbGV2YW50KSB7XHJcbiAgICAvLyBJbmNsdWRlIG5laWdoYm9yaW5nIHBhcmFncmFwaHMgc28gY29udGV4dCBpc24ndCBmcmFnbWVudGVkLlxyXG4gICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heCgwLCBpdGVtLmluZGV4IC0gMSk7XHJcbiAgICBjb25zdCBlbmQgPSBNYXRoLm1pbihcclxuICAgICAgcGFyYWdyYXBocy5sZW5ndGggLSAxLFxyXG4gICAgICBpdGVtLmluZGV4ICsgMVxyXG4gICAgKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcclxuICAgICAgaWYgKHNlbGVjdGVkLmhhcyhpKSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBhZGRpdGlvbiA9XHJcbiAgICAgICAgcGFyYWdyYXBoc1tpXSArIFwiXFxuXFxuXCI7XHJcblxyXG4gICAgICBpZiAoXHJcbiAgICAgICAgdG90YWxMZW5ndGggKyBhZGRpdGlvbi5sZW5ndGggPlxyXG4gICAgICAgIG1heExlbmd0aFxyXG4gICAgICApIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2VsZWN0ZWQuYWRkKGkpO1xyXG4gICAgICB0b3RhbExlbmd0aCArPSBhZGRpdGlvbi5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRvdGFsTGVuZ3RoID49IG1heExlbmd0aCAqIDAuOTUpIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb25zdCByZXN1bHQgPSBBcnJheS5mcm9tKHNlbGVjdGVkKVxyXG4gICAgLnNvcnQoKGEsIGIpID0+IGEgLSBiKVxyXG4gICAgLm1hcCgoaW5kZXgpID0+IHBhcmFncmFwaHNbaW5kZXhdKVxyXG4gICAgLmpvaW4oXCJcXG5cXG5cIik7XHJcblxyXG4gIHJldHVybiByZXN1bHQudHJpbSgpICtcclxuICAgIChyZXN1bHQubGVuZ3RoIDwgY29udGVudC5sZW5ndGhcclxuICAgICAgPyBcIlxcbi4uLltzb3VyY2UgdHJ1bmNhdGVkXVwiXHJcbiAgICAgIDogXCJcIik7XHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgcmVhZGFibGUgdGV4dCBmcm9tIEhUTUwuXHJcbiAqXHJcbiAqIFRoaXMgaXMgaW50ZW50aW9uYWxseSBkZXBlbmRlbmN5LWZyZWUgc28gdGhlIHBsdWdpbiBkb2VzIG5vdFxyXG4gKiByZXF1aXJlIGFub3RoZXIgcGFja2FnZSBqdXN0IGZvciBiYXNpYyBwYWdlIGV4dHJhY3Rpb24uXHJcbiAqL1xyXG4gXHJcbmZ1bmN0aW9uIGV4dHJhY3RUZXh0KGh0bWw6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgbGV0IHRleHQgPSBodG1sO1xyXG5cclxuICAvLyBSZW1vdmUgb2J2aW91cyBub24tY29udGVudCBlbGVtZW50cy5cclxuICB0ZXh0ID0gdGV4dFxyXG4gICAgLnJlcGxhY2UoLzxzY3JpcHRcXGJbXj5dKj5bXFxzXFxTXSo/PFxcL3NjcmlwdD4vZ2ksIFwiIFwiKVxyXG4gICAgLnJlcGxhY2UoLzxzdHlsZVxcYltePl0qPltcXHNcXFNdKj88XFwvc3R5bGU+L2dpLCBcIiBcIilcclxuICAgIC5yZXBsYWNlKC88bm9zY3JpcHRcXGJbXj5dKj5bXFxzXFxTXSo/PFxcL25vc2NyaXB0Pi9naSwgXCIgXCIpXHJcbiAgICAucmVwbGFjZSgvPHN2Z1xcYltePl0qPltcXHNcXFNdKj88XFwvc3ZnPi9naSwgXCIgXCIpXHJcbiAgICAucmVwbGFjZSgvPHRlbXBsYXRlXFxiW14+XSo+W1xcc1xcU10qPzxcXC90ZW1wbGF0ZT4vZ2ksIFwiIFwiKVxyXG4gICAgLnJlcGxhY2UoLzwhLS1bXFxzXFxTXSo/LS0+L2csIFwiIFwiKTtcclxuXHJcbiAgLy8gUHJlZmVyIHNlbWFudGljIGFydGljbGUvbWFpbiBjb250YWluZXJzLlxyXG4gIGNvbnN0IGNhbmRpZGF0ZXM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIGNvbnN0IG1haW5NYXRjaGVzID0gdGV4dC5tYXRjaChcclxuICAgIC88bWFpblxcYltePl0qPihbXFxzXFxTXSo/KTxcXC9tYWluPi9naVxyXG4gICk7XHJcblxyXG4gIGNvbnN0IGFydGljbGVNYXRjaGVzID0gdGV4dC5tYXRjaChcclxuICAgIC88YXJ0aWNsZVxcYltePl0qPihbXFxzXFxTXSo/KTxcXC9hcnRpY2xlPi9naVxyXG4gICk7XHJcblxyXG4gIGlmIChtYWluTWF0Y2hlcykgY2FuZGlkYXRlcy5wdXNoKC4uLm1haW5NYXRjaGVzKTtcclxuICBpZiAoYXJ0aWNsZU1hdGNoZXMpIGNhbmRpZGF0ZXMucHVzaCguLi5hcnRpY2xlTWF0Y2hlcyk7XHJcblxyXG4gIC8vIElmIHdlIGZvdW5kIHNlbWFudGljIGNvbnRlbnQsIHVzZSB0aGUgbGFyZ2VzdCBibG9jay5cclxuICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICB0ZXh0ID0gY2FuZGlkYXRlc1xyXG4gICAgICAuc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aClbMF07XHJcbiAgfVxyXG5cclxuICAvLyBSZW1vdmUgY29tbW9uIG5hdmlnYXRpb24gLyBmb290ZXIgLyBzaWRlYmFyIHNlY3Rpb25zLlxyXG4gIHRleHQgPSB0ZXh0XHJcbiAgICAucmVwbGFjZShcclxuICAgICAgLzxuYXZcXGJbXj5dKj5bXFxzXFxTXSo/PFxcL25hdj4vZ2ksXHJcbiAgICAgIFwiIFwiXHJcbiAgICApXHJcbiAgICAucmVwbGFjZShcclxuICAgICAgLzxmb290ZXJcXGJbXj5dKj5bXFxzXFxTXSo/PFxcL2Zvb3Rlcj4vZ2ksXHJcbiAgICAgIFwiIFwiXHJcbiAgICApXHJcbiAgICAucmVwbGFjZShcclxuICAgICAgLzxhc2lkZVxcYltePl0qPltcXHNcXFNdKj88XFwvYXNpZGU+L2dpLFxyXG4gICAgICBcIiBcIlxyXG4gICAgKVxyXG4gICAgLnJlcGxhY2UoXHJcbiAgICAgIC88Zm9ybVxcYltePl0qPltcXHNcXFNdKj88XFwvZm9ybT4vZ2ksXHJcbiAgICAgIFwiIFwiXHJcbiAgICApO1xyXG5cclxuICAvLyBQcmVzZXJ2ZSBwYXJhZ3JhcGgvaGVhZGluZy9saXN0IGJvdW5kYXJpZXMuXHJcbiAgdGV4dCA9IHRleHRcclxuICAgIC5yZXBsYWNlKFxyXG4gICAgICAvPFxcLyg/OnB8ZGl2fHNlY3Rpb258YXJ0aWNsZXxtYWlufGgxfGgyfGgzfGg0fGg1fGg2fGxpfHRyKT4vZ2ksXHJcbiAgICAgIFwiXFxuXCJcclxuICAgIClcclxuICAgIC5yZXBsYWNlKFxyXG4gICAgICAvPGJyXFxzKlxcLz8+L2dpLFxyXG4gICAgICBcIlxcblwiXHJcbiAgICApO1xyXG5cclxuICAvLyBSZW1vdmUgcmVtYWluaW5nIEhUTUwgdGFncy5cclxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC88W14+XSs+L2csIFwiIFwiKTtcclxuXHJcbiAgLy8gRGVjb2RlIGNvbW1vbiBIVE1MIGVudGl0aWVzLlxyXG4gIHRleHQgPSB0ZXh0XHJcbiAgICAucmVwbGFjZSgvJm5ic3A7L2dpLCBcIiBcIilcclxuICAgIC5yZXBsYWNlKC8mYW1wOy9naSwgXCImXCIpXHJcbiAgICAucmVwbGFjZSgvJmx0Oy9naSwgXCI8XCIpXHJcbiAgICAucmVwbGFjZSgvJmd0Oy9naSwgXCI+XCIpXHJcbiAgICAucmVwbGFjZSgvJnF1b3Q7L2dpLCAnXCInKVxyXG4gICAgLnJlcGxhY2UoLyYjMzk7L2dpLCBcIidcIik7XHJcblxyXG4gIC8vIE5vcm1hbGl6ZSB3aGl0ZXNwYWNlLlxyXG4gIHRleHQgPSB0ZXh0XHJcbiAgICAucmVwbGFjZSgvXFxyL2csIFwiXCIpXHJcbiAgICAucmVwbGFjZSgvWyBcXHRdKy9nLCBcIiBcIilcclxuICAgIC5yZXBsYWNlKC9bIFxcdF0rXFxuL2csIFwiXFxuXCIpXHJcbiAgICAucmVwbGFjZSgvXFxuWyBcXHRdKy9nLCBcIlxcblwiKVxyXG4gICAgLnJlcGxhY2UoL1xcblxccypcXG5cXHMqXFxuKy9nLCBcIlxcblxcblwiKVxyXG4gICAgLnRyaW0oKTtcclxuXHJcbiAgcmV0dXJuIHRleHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaCBhbmQgdmFsaWRhdGUgb25lIHJlc2VhcmNoIGNhbmRpZGF0ZS5cclxuICpcclxuICogUGlwZWxpbmU6XHJcbiAqXHJcbiAqICAgRkVUQ0hcclxuICogICAgICBcdTIxOTNcclxuICogICBIVFRQIHN0YXR1cyBjaGVja1xyXG4gKiAgICAgIFx1MjE5M1xyXG4gKiAgIDQtc2Vjb25kIHdhaXRcclxuICogICAgICBcdTIxOTNcclxuICogICBpbnNwZWN0IHJldHVybmVkIHBhZ2VcclxuICogICAgICBcdTIxOTNcclxuICogICBBQ0NFUFQgLyBSRUpFQ1RcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGZldGNoQ2FuZGlkYXRlKFxyXG4gIHJlc3VsdDogU2VhclhOR1Jlc3VsdCxcclxuICB0aW1lb3V0OiBudW1iZXIsXHJcbiAgcXVlcnk6IHN0cmluZyxcclxuICBzb3VyY2VJbmRleDogbnVtYmVyXHJcbik6XHJcbiAgUHJvbWlzZTxcclxuICAgIHwge1xyXG4gICAgICAgIHVzYWJsZTogdHJ1ZTtcclxuICAgICAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgICAgIHVybDogc3RyaW5nO1xyXG4gICAgICAgIGRvbWFpbjogc3RyaW5nO1xyXG4gICAgICAgIGVuZ2luZTogc3RyaW5nO1xyXG4gICAgICAgIHNjb3JlPzogbnVtYmVyO1xyXG4gICAgICAgIGNvbnRlbnQ6IHN0cmluZztcclxuICAgICAgfVxyXG4gICAgfCB7XHJcbiAgICAgICAgdXNhYmxlOiBmYWxzZTtcclxuICAgICAgICByZWFzb246IHN0cmluZztcclxuICAgICAgfVxyXG4gID4ge1xyXG4gIGxldCBkb21haW46IHN0cmluZztcclxuXHJcbiAgdHJ5IHtcclxuICAgIGRvbWFpbiA9XHJcbiAgICAgIG5ldyBVUkwocmVzdWx0LnVybCkuaG9zdG5hbWU7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1c2FibGU6IGZhbHNlLFxyXG4gICAgICByZWFzb246IFwiaW52YWxpZCBVUkxcIixcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgY29udHJvbGxlciA9XHJcbiAgICAgIG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcclxuXHJcbiAgICBjb25zdCB0aW1lb3V0SWQgPVxyXG4gICAgICBzZXRUaW1lb3V0KFxyXG4gICAgICAgICgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSxcclxuICAgICAgICB0aW1lb3V0XHJcbiAgICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgIGByZXNlYXJjaF93ZWI6IGZldGNoaW5nICR7cmVzdWx0LnVybH1gXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID1cclxuICAgICAgYXdhaXQgZmV0Y2gocmVzdWx0LnVybCwge1xyXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6XHJcbiAgICAgICAgICAgIFwiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgXCIgK1xyXG4gICAgICAgICAgICBcIkFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIFwiICtcclxuICAgICAgICAgICAgXCJDaHJvbWUvMTMxLjAgU2FmYXJpLzUzNy4zNlwiLFxyXG5cclxuICAgICAgICAgIEFjY2VwdDpcclxuICAgICAgICAgICAgXCJ0ZXh0L2h0bWwsYXBwbGljYXRpb24veGh0bWwreG1sLFwiICtcclxuICAgICAgICAgICAgXCJhcHBsaWNhdGlvbi94bWw7cT0wLjksdGV4dC9wbGFpbjtxPTAuOCwqLyo7cT0wLjdcIixcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBIVFRQIGFjY2Vzc2liaWxpdHkgY2hlY2tzLlxyXG4gICAgLy9cclxuICAgIC8vIFRoZXNlIGFyZSBtdWNoIHN0cm9uZ2VyIHNpZ25hbHMgdGhhbiBzaW1wbHkgZmluZGluZyB3b3Jkc1xyXG4gICAgLy8gc3VjaCBhcyBcIkNsb3VkZmxhcmVcIiBvciBcImJvdFwiIGluIHBhZ2UgY29udGVudC5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB1c2FibGU6IGZhbHNlLFxyXG4gICAgICAgIHJlYXNvbjpcclxuICAgICAgICAgIFwiSFRUUCA0MDEgVW5hdXRob3JpemVkXCIsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdXNhYmxlOiBmYWxzZSxcclxuICAgICAgICByZWFzb246XHJcbiAgICAgICAgICBcIkhUVFAgNDAzIEZvcmJpZGRlbiBcdTIwMTQgcGFnZSBpbmFjY2Vzc2libGVcIixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB1c2FibGU6IGZhbHNlLFxyXG4gICAgICAgIHJlYXNvbjpcclxuICAgICAgICAgIFwiSFRUUCA0MjkgVG9vIE1hbnkgUmVxdWVzdHMgXHUyMDE0IHJhdGUgbGltaXRlZFwiLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPj0gNTAwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdXNhYmxlOiBmYWxzZSxcclxuICAgICAgICByZWFzb246XHJcbiAgICAgICAgICBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fSBcdTIwMTQgc2VydmVyIGVycm9yYCxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdXNhYmxlOiBmYWxzZSxcclxuICAgICAgICByZWFzb246XHJcbiAgICAgICAgICBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWAsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gVGhlIEhUVFAgcmVxdWVzdCBzdWNjZWVkZWQuXHJcbiAgICAvL1xyXG4gICAgLy8gR2l2ZSB0aGUgcGFnZSA0IHNlY29uZHMgYmVmb3JlIGluc3BlY3RpbmcgaXQuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cclxuXHRhd2FpdCBzbGVlcCg0MDAwKTtcclxuXHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gUmVhZCB0aGUgcmV0dXJuZWQgcGFnZS5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBjb25zdCBodG1sID1cclxuICAgICAgYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgIC8vIEluc3BlY3QgZW5vdWdoIG9mIHRoZSByYXcgSFRNTCB0byBjYXRjaCBjaGFsbGVuZ2UgcGFnZXMuXHJcbiAgICBjb25zdCBpbnNwZWN0aW9uVGV4dCA9XHJcbiAgICAgIGh0bWxcclxuICAgICAgICAuc3Vic3RyaW5nKDAsIDEwMDAwMCk7XHJcblxyXG4gICAgY29uc3QgY2hhbGxlbmdlID1cclxuICAgICAgZGV0ZWN0QWN0aXZlQ2hhbGxlbmdlKFxyXG4gICAgICAgIGluc3BlY3Rpb25UZXh0XHJcbiAgICAgICk7XHJcblxyXG4gICAgaWYgKGNoYWxsZW5nZSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHVzYWJsZTogZmFsc2UsXHJcbiAgICAgICAgcmVhc29uOlxyXG4gICAgICAgICAgYGFjdGl2ZSB2ZXJpZmljYXRpb24gY2hhbGxlbmdlIGRldGVjdGVkOiAke2NoYWxsZW5nZX1gLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEV4dHJhY3QgcmVhZGFibGUgY29udGVudC5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBsZXQgY29udGVudCA9XHJcbiAgICAgIGV4dHJhY3RUZXh0KGh0bWwpO1xyXG5cclxuICAgIC8vIEEgcGFnZSB3aXRoIGFsbW9zdCBubyBjb250ZW50IGlzbid0IHVzZWZ1bCByZXNlYXJjaC5cclxuXHRjb25zdCB3b3JkQ291bnQgPSBjb250ZW50XHJcblx0ICAuc3BsaXQoL1xccysvKVxyXG5cdCAgLmZpbHRlcihCb29sZWFuKVxyXG5cdCAgLmxlbmd0aDtcclxuXHJcblx0aWYgKHdvcmRDb3VudCA8IDE1MCkge1xyXG5cdCAgcmV0dXJuIHtcclxuXHRcdHVzYWJsZTogZmFsc2UsXHJcblx0XHRyZWFzb246XHJcblx0XHQgIGBpbnN1ZmZpY2llbnQgcmVhZGFibGUgcGFnZSBjb250ZW50ICgke3dvcmRDb3VudH0gd29yZHMpYCxcclxuXHQgIH07XHJcblx0fVxyXG5cclxuXHRjb25zdCBjb250ZW50TGltaXRzID0gW1xyXG5cdCAgNDAwMCxcclxuXHQgIDMwMDAsXHJcblx0ICAyMDAwLFxyXG5cdCAgMTUwMCxcclxuXHQgIDE1MDAsXHJcblx0XTtcclxuXHJcblx0Y29uc3QgY29udGVudExpbWl0ID1cclxuXHQgIGNvbnRlbnRMaW1pdHNbXHJcblx0XHRNYXRoLm1pbihcclxuXHRcdCAgc291cmNlSW5kZXgsXHJcblx0XHQgIGNvbnRlbnRMaW1pdHMubGVuZ3RoIC0gMVxyXG5cdFx0KVxyXG5cdCAgXTtcclxuXHJcblx0Y29udGVudCA9IHNlbGVjdFJlbGV2YW50Q29udGVudChcclxuXHQgIGNvbnRlbnQsXHJcblx0ICBxdWVyeSxcclxuXHQgIGNvbnRlbnRMaW1pdFxyXG5cdCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdXNhYmxlOiB0cnVlLFxyXG4gICAgICB0aXRsZTogcmVzdWx0LnRpdGxlLFxyXG4gICAgICB1cmw6IHJlc3VsdC51cmwsXHJcbiAgICAgIGRvbWFpbixcclxuICAgICAgZW5naW5lOiByZXN1bHQuZW5naW5lLFxyXG4gICAgICBzY29yZTogcmVzdWx0LnNjb3JlLFxyXG4gICAgICBjb250ZW50LFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgaWYgKFxyXG4gICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmXHJcbiAgICAgIGVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiXHJcbiAgICApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB1c2FibGU6IGZhbHNlLFxyXG4gICAgICAgIHJlYXNvbjpcclxuICAgICAgICAgIGByZXF1ZXN0IHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXR9bXNgLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHVzYWJsZTogZmFsc2UsXHJcbiAgICAgIHJlYXNvbjpcclxuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yXHJcbiAgICAgICAgICA/IGVycm9yLm1lc3NhZ2VcclxuICAgICAgICAgIDogU3RyaW5nKGVycm9yKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdG9vbHNQcm92aWRlcihcclxuICBjdGw6IFRvb2xzUHJvdmlkZXJDb250cm9sbGVyXHJcbik6IFByb21pc2U8VG9vbFtdPiB7XHJcbiAgY29uc3QgdG9vbHM6IFRvb2xbXSA9IFtdO1xyXG5cclxuICBjb25zdCBjb25maWcgPVxyXG4gICAgY3RsLmdldFBsdWdpbkNvbmZpZyhcclxuICAgICAgY29uZmlnU2NoZW1hdGljc1xyXG4gICAgKTtcclxuXHJcbiAgY29uc3Qgc2VhcnhuZ1VybCA9XHJcbiAgICBjb25maWcuZ2V0KFxyXG4gICAgICBcInNlYXJ4bmdVcmxcIlxyXG4gICAgKSBhcyBzdHJpbmc7XHJcblxyXG4gIGNvbnN0IGRlZmF1bHRQYWdlU2l6ZSA9XHJcbiAgICBjb25maWcuZ2V0KFxyXG4gICAgICBcImRlZmF1bHRQYWdlU2l6ZVwiXHJcbiAgICApIGFzIG51bWJlcjtcclxuXHJcbiAgY29uc3QgdGltZW91dCA9XHJcbiAgICBjb25maWcuZ2V0KFxyXG4gICAgICBcInRpbWVvdXRcIlxyXG4gICAgKSBhcyBudW1iZXI7XHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBzZWFyY2hfd2ViXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBjb25zdCBzZWFyY2hUb29sID0gdG9vbCh7XHJcbiAgICBuYW1lOiBcInNlYXJjaF93ZWJcIixcclxuXHJcbiAgICBkZXNjcmlwdGlvbjpcclxuXHQgIFwiTGltaXRlZCB3ZWIgc2VhcmNoIHVzaW5nIGxvY2FsIFNlYXJYTkcuIFwiICtcclxuXHQgIFwiUmV0dXJucyBzbmlwcGV0cyBvbmx5IGFuZCBzaG91bGQgYmUgdXNlZCBvbmx5IHdoZW4gZnVsbCB3ZWJwYWdlIHJlc2VhcmNoIGlzIHVuYXZhaWxhYmxlIG9yIHVubmVjZXNzYXJ5LiBcIiArXHJcblx0ICBcIkZvciBmYWN0dWFsLCBkZXRhaWxlZCwgY3VycmVudCwgY29tcGFyYXRpdmUsIG9yIHJlc2VhcmNoIHF1ZXN0aW9ucywgdXNlIHJlc2VhcmNoX3dlYiBpbnN0ZWFkLlwiLFxyXG5cclxuICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgcXVlcnk6IHpcclxuICAgICAgICAuc3RyaW5nKClcclxuICAgICAgICAuZGVzY3JpYmUoXHJcbiAgICAgICAgICBcIlRoZSBzZWFyY2ggcXVlcnkgc3RyaW5nXCJcclxuICAgICAgICApLFxyXG5cclxuICAgICAgbnVtX3Jlc3VsdHM6IHpcclxuICAgICAgICAubnVtYmVyKClcclxuICAgICAgICAubWluKDEpXHJcbiAgICAgICAgLm1heCgyMClcclxuICAgICAgICAub3B0aW9uYWwoKVxyXG4gICAgICAgIC5kZXNjcmliZShcclxuICAgICAgICAgIGBOdW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm4gKDEtMjApLiBEZWZhdWx0OiAke2RlZmF1bHRQYWdlU2l6ZX1gXHJcbiAgICAgICAgKSxcclxuXHJcbiAgICAgIHRpbWVfcmFuZ2U6IHpcclxuICAgICAgICAuc3RyaW5nKClcclxuICAgICAgICAub3B0aW9uYWwoKVxyXG4gICAgICAgIC5kZXNjcmliZShcclxuICAgICAgICAgIFwiT3B0aW9uYWwgdGltZSBmaWx0ZXI6ICdkYXknLCAnd2VlaycsICdtb250aCcsIG9yICd5ZWFyJ1wiXHJcbiAgICAgICAgKSxcclxuICAgIH0sXHJcblxyXG4gICAgaW1wbGVtZW50YXRpb246IGFzeW5jIChwYXJhbXM6IHtcclxuICAgICAgcXVlcnk6IHN0cmluZztcclxuICAgICAgbnVtX3Jlc3VsdHM/OiBudW1iZXI7XHJcbiAgICAgIHRpbWVfcmFuZ2U/OiBzdHJpbmc7XHJcbiAgICB9KSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3Qge1xyXG4gICAgICAgICAgcXVlcnksXHJcbiAgICAgICAgICBudW1fcmVzdWx0cyxcclxuICAgICAgICAgIHRpbWVfcmFuZ2UsXHJcbiAgICAgICAgfSA9IHBhcmFtcztcclxuXHJcbiAgICAgICAgY29uc3QgcGFnZVNpemUgPVxyXG4gICAgICAgICAgbnVtX3Jlc3VsdHMgPz9cclxuICAgICAgICAgIGRlZmF1bHRQYWdlU2l6ZTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoUGFyYW1zID1cclxuICAgICAgICAgIG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICAgICAgICBxOiBxdWVyeSxcclxuICAgICAgICAgICAgZm9ybWF0OiBcImpzb25cIixcclxuICAgICAgICAgICAgcGFnZW5vOiBTdHJpbmcocGFnZSksXHJcbiAgICAgICAgICAgIHNhZmVzZWFyY2g6IFwiMFwiLFxyXG4gICAgICAgICAgfSk7XHJcblxyXG5cdFx0Y29uc3Qgbm9ybWFsaXplZFRpbWVSYW5nZSA9XHJcblx0XHQgIHRpbWVfcmFuZ2U/LnRvTG93ZXJDYXNlKCkudHJpbSgpO1xyXG5cclxuXHRcdGlmIChub3JtYWxpemVkVGltZVJhbmdlKSB7XHJcblx0XHQgIGNvbnN0IHZhbGlkUmFuZ2VzID0gW1xyXG5cdFx0XHRcImRheVwiLFxyXG5cdFx0XHRcIndlZWtcIixcclxuXHRcdFx0XCJtb250aFwiLFxyXG5cdFx0XHRcInllYXJcIixcclxuXHRcdCAgXTtcclxuXHJcblx0XHQgIGlmIChcclxuXHRcdFx0dmFsaWRSYW5nZXMuaW5jbHVkZXMoXHJcblx0XHRcdCAgbm9ybWFsaXplZFRpbWVSYW5nZVxyXG5cdFx0XHQpXHJcblx0XHQgICkge1xyXG5cdFx0XHRzZWFyY2hQYXJhbXMuYXBwZW5kKFxyXG5cdFx0XHQgIFwidGltZV9yYW5nZVwiLFxyXG5cdFx0XHQgIG5vcm1hbGl6ZWRUaW1lUmFuZ2VcclxuXHRcdFx0KTtcclxuXHRcdCAgfVxyXG5cdFx0fVxyXG5cclxuICAgICAgICBjb25zdCBzZWFyY2hVcmwgPVxyXG4gICAgICAgICAgYCR7c2VhcnhuZ1VybH0vc2VhcmNoPyR7c2VhcmNoUGFyYW1zLnRvU3RyaW5nKCl9YDtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICBgUXVlcnlpbmcgU2VhclhORzogJHtzZWFyY2hVcmwucmVwbGFjZShcclxuICAgICAgICAgICAgL2Zvcm1hdD1qc29uLyxcclxuICAgICAgICAgICAgXCJmb3JtYXQ9Li4uXCJcclxuICAgICAgICAgICl9YFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPVxyXG4gICAgICAgICAgbmV3IEFib3J0Q29udHJvbGxlcigpO1xyXG5cclxuICAgICAgICBjb25zdCB0aW1lb3V0SWQgPVxyXG4gICAgICAgICAgc2V0VGltZW91dChcclxuICAgICAgICAgICAgKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLFxyXG4gICAgICAgICAgICB0aW1lb3V0XHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICBjb25zdCByZXNwb25zZSA9XHJcbiAgICAgICAgICBhd2FpdCBmZXRjaChzZWFyY2hVcmwsIHtcclxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG5cclxuICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgIEFjY2VwdDpcclxuICAgICAgICAgICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICAgICAgICAgIFwiVXNlci1BZ2VudFwiOlxyXG4gICAgICAgICAgICAgICAgXCJMTS1TdHVkaW8tUGx1Z2luLzEuMFwiLFxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuXHJcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICBgU2VhclhORyByZXR1cm5lZCBzdGF0dXMgJHtyZXNwb25zZS5zdGF0dXN9OiBgICtcclxuICAgICAgICAgICAgYCR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9XHJcbiAgICAgICAgICAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBTZWFyWE5HUmVzcG9uc2U7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICFkYXRhLnJlc3VsdHMgfHxcclxuICAgICAgICAgIGRhdGEucmVzdWx0cy5sZW5ndGggPT09IDBcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHJldHVybiBgTm8gcmVzdWx0cyBmb3VuZCBmb3IgcXVlcnk6IFwiJHtxdWVyeX1cImA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXN1bHRzID1cclxuICAgICAgICAgIGRhdGEucmVzdWx0c1xyXG4gICAgICAgICAgICAuc2xpY2UoMCwgcGFnZVNpemUpXHJcbiAgICAgICAgICAgIC5tYXAoXHJcbiAgICAgICAgICAgICAgKHJlc3VsdCwgaW5kZXgpID0+XHJcbiAgICAgICAgICAgICAgICBgWyR7aW5kZXggKyAxfV0gJHtyZXN1bHQudGl0bGV9XFxuYCArXHJcbiAgICAgICAgICAgICAgICBgVVJMOiAke3Jlc3VsdC51cmx9XFxuYCArXHJcbiAgICAgICAgICAgICAgICBgU25pcHBldDogJHtyZXN1bHQuY29udGVudC5zdWJzdHJpbmcoXHJcbiAgICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgIDMwMFxyXG4gICAgICAgICAgICAgICAgKX0ke1xyXG4gICAgICAgICAgICAgICAgICByZXN1bHQuY29udGVudC5sZW5ndGggPiAzMDBcclxuICAgICAgICAgICAgICAgICAgICA/IFwiLi4uXCJcclxuICAgICAgICAgICAgICAgICAgICA6IFwiXCJcclxuICAgICAgICAgICAgICAgIH1cXG5gICtcclxuICAgICAgICAgICAgICAgIGBTb3VyY2U6ICR7cmVzdWx0LmVuZ2luZX1gXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICAgLmpvaW4oXCJcXG5cXG5cIik7XHJcblxyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICBgU2VhcmNoIHJlc3VsdHMgZm9yIFwiJHtxdWVyeX1cIiBgICtcclxuICAgICAgICAgIGAoJHtNYXRoLm1pbihcclxuICAgICAgICAgICAgZGF0YS5yZXN1bHRzLmxlbmd0aCxcclxuICAgICAgICAgICAgcGFnZVNpemVcclxuICAgICAgICAgICl9IG9mICR7ZGF0YS5udW1iZXJfb2ZfcmVzdWx0c30gdG90YWwpOlxcblxcbmAgK1xyXG4gICAgICAgICAgZm9ybWF0dGVkUmVzdWx0cyArXHJcbiAgICAgICAgICBcIlxcblxcbk5vdGU6IFRoZXNlIHJlc3VsdHMgYXJlIGZyb20gU2VhclhORyBcIiArXHJcbiAgICAgICAgICBcIm1ldGFzZWFyY2ggZW5naW5lIGFnZ3JlZ2F0aW5nIG11bHRpcGxlIHNvdXJjZXMuXCJcclxuICAgICAgICApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiZcclxuICAgICAgICAgIGVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICBgRXJyb3I6IFNlYXJYTkcgcmVxdWVzdCB0aW1lZCBvdXQgYWZ0ZXIgYCArXHJcbiAgICAgICAgICAgIGAke3RpbWVvdXR9bXMuIENoZWNrIHRoYXQgU2VhclhORyBpcyBydW5uaW5nIGF0IGAgK1xyXG4gICAgICAgICAgICBgJHtzZWFyeG5nVXJsfS5gXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgIGBFcnJvciBzZWFyY2hpbmcgU2VhclhORzogYCArXHJcbiAgICAgICAgICBgJHtcclxuICAgICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvclxyXG4gICAgICAgICAgICAgID8gZXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgICAgIDogU3RyaW5nKGVycm9yKVxyXG4gICAgICAgICAgfWBcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gZmV0Y2hfcGFnZV9jb250ZW50XHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICBjb25zdCBmZXRjaFBhZ2VUb29sID0gdG9vbCh7XHJcbiAgICBuYW1lOiBcImZldGNoX3BhZ2VfY29udGVudFwiLFxyXG5cclxuICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICBcIkZldGNoIGFuZCBleHRyYWN0IHRleHQgY29udGVudCBmcm9tIGEgc3BlY2lmaWMgVVJMLlwiLFxyXG5cclxuICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgdXJsOiB6XHJcbiAgICAgICAgLnN0cmluZygpXHJcbiAgICAgICAgLnVybCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKFxyXG4gICAgICAgICAgXCJUaGUgVVJMIHRvIGZldGNoXCJcclxuICAgICAgICApLFxyXG5cclxuICAgICAgbWF4X2xlbmd0aDogelxyXG4gICAgICAgIC5udW1iZXIoKVxyXG4gICAgICAgIC5taW4oMTAwKVxyXG4gICAgICAgIC5tYXgoMTAwMDApXHJcbiAgICAgICAgLm9wdGlvbmFsKClcclxuICAgICAgICAuZGVzY3JpYmUoXHJcbiAgICAgICAgICBcIk1heGltdW0gY2hhcmFjdGVycyB0byByZXR1cm4uIERlZmF1bHQ6IDIwMDAuXCJcclxuICAgICAgICApLFxyXG4gICAgfSxcclxuXHJcbiAgICBpbXBsZW1lbnRhdGlvbjogYXN5bmMgKHBhcmFtczoge1xyXG4gICAgICB1cmw6IHN0cmluZztcclxuICAgICAgbWF4X2xlbmd0aD86IG51bWJlcjtcclxuICAgIH0pID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB7XHJcbiAgICAgICAgICB1cmwsXHJcbiAgICAgICAgICBtYXhfbGVuZ3RoLFxyXG4gICAgICAgIH0gPSBwYXJhbXM7XHJcblxyXG4gICAgICAgIGNvbnN0IG1heExlbmd0aCA9XHJcbiAgICAgICAgICBtYXhfbGVuZ3RoID8/IDIwMDA7XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID1cclxuICAgICAgICAgIGF3YWl0IGZldGNoKHVybCwge1xyXG4gICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6XHJcbiAgICAgICAgICAgICAgICBcIk1vemlsbGEvNS4wIChjb21wYXRpYmxlOyBMTS1TdHVkaW8tQm90LzEuMClcIixcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICBgRmFpbGVkIHRvIGZldGNoICR7dXJsfTogYCArXHJcbiAgICAgICAgICAgIGAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBodG1sID1cclxuICAgICAgICAgIGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuXHJcbiAgICAgICAgbGV0IHRleHQgPVxyXG4gICAgICAgICAgZXh0cmFjdFRleHQoaHRtbCk7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgIHRleHQubGVuZ3RoID5cclxuICAgICAgICAgIG1heExlbmd0aFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgdGV4dCA9XHJcbiAgICAgICAgICAgIHRleHQuc3Vic3RyaW5nKFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgbWF4TGVuZ3RoXHJcbiAgICAgICAgICAgICkgK1xyXG4gICAgICAgICAgICBcIi4uLiBbdHJ1bmNhdGVkXVwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgIGBDb250ZW50IGZyb20gJHt1cmx9OlxcblxcbiR7dGV4dH1gXHJcbiAgICAgICAgKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgYEVycm9yIGZldGNoaW5nIHBhZ2U6IGAgK1xyXG4gICAgICAgICAgYCR7XHJcbiAgICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3JcclxuICAgICAgICAgICAgICA/IGVycm9yLm1lc3NhZ2VcclxuICAgICAgICAgICAgICA6IFN0cmluZyhlcnJvcilcclxuICAgICAgICAgIH1gXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9KTtcclxuXHJcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gIC8vIHJlc2VhcmNoX3dlYlxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgY29uc3QgcmVzZWFyY2hUb29sID0gdG9vbCh7XHJcbiAgICBuYW1lOiBcInJlc2VhcmNoX3dlYlwiLFxyXG5cclxuICAgIGRlc2NyaXB0aW9uOlxyXG5cdFx0XCJQcmltYXJ5IHdlYiByZXNlYXJjaCB0b29sIHVzaW5nIGxvY2FsIFNlYXJYTkcuIFwiICtcclxuXHRcdFwiVXNlIGZvciBmYWN0dWFsLCBkZXRhaWxlZCwgY3VycmVudCwgY29tcGFyYXRpdmUsIG9yIHJlc2VhcmNoIHF1ZXN0aW9ucy4gXCIgK1xyXG5cdFx0XCJGZXRjaGVzIGFuZCByZWFkcyBhY3R1YWwgd2VicGFnZXMsIG5vdCBzbmlwcGV0cywgYW5kIGNvbGxlY3RzIHVwIHRvIDUgdXNhYmxlIHNvdXJjZXMuIFwiICtcclxuXHRcdFwiUmVqZWN0cyBpbmFjY2Vzc2libGUgcGFnZXMgYW5kIGFjdGl2ZSB2ZXJpZmljYXRpb24gY2hhbGxlbmdlcy4gXCIgK1xyXG5cdFx0XCJDb21wYXJlIG11bHRpcGxlIHNvdXJjZXMgYW5kIGFuc3dlciBmcm9tIHRoZSByZXR1cm5lZCBTT1VSQ0UgY29udGVudC4gXCIgK1xyXG5cdFx0XCJGb3IgYWxsIGZhY3R1YWwgY2xhaW1zLCBpbmNsdWRlIGEgTWFya2Rvd24gbGluayB0byBpdHMgc3VwcG9ydGluZyBTT1VSQ0UgXCIgK1xyXG5cdFx0XCJpbW1lZGlhdGVseSBhZnRlciB0aGUgY2xhaW0uIFVzZSB0aGUgU09VUkNFIHRpdGxlIGFzIHRoZSBsaW5rIHRleHQsIGluY2x1ZGluZyB0aGUgYXJ0aWNsZSdzIGRhdGUgaWYgYXZhaWxhYmxlLiBcIiArXHJcblx0XHRcIk9ubHkgbGluayB0byBVUkxzIHByZXNlbnQgaW4gdGhlIHJldHVybmVkIFNPVVJDRSBsaXN0LiBcIiArXHJcblx0XHRcIklmIG5vIHVzYWJsZSB3ZWJwYWdlcyBhcmUgZm91bmQgb24gcGFnZSAxLCBhc2sgd2hldGhlciB0aGUgdXNlciB3YW50cyBcIiArXHJcblx0XHRcInRoZSBhdmFpbGFibGUgc25pcHBldHMgb3IgdGhlIG5leHQgMTUgY2FuZGlkYXRlcyBmcm9tIHBhZ2UgMi4gXCIgK1xyXG5cdFx0XCJJZiB0aGUgdXNlciByZXF1ZXN0cyB0aGUgbmV4dCByZXN1bHRzLCBjYWxsIHRoaXMgdG9vbCBhZ2FpbiB3aXRoIHBhZ2UgMi4gXCIgK1xyXG5cdFx0XCJEbyBub3QgYXV0b21hdGljYWxseSB1c2Ugc25pcHBldHMgdW5sZXNzIHRoZSB1c2VyIGNob29zZXMgdGhlbS4gXCIgK1xyXG5cdFx0XCJQcmVzZW50IGRpc3RpbmN0IG5ld3Mgc3RvcmllcyBzZXBhcmF0ZWx5IHJhdGhlciB0aGFuIGNvbWJpbmluZyB0aGVtIGludG8gYSBzaW5nbGUgbmFycmF0aXZlLlwiLFxyXG5cclxuICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgcXVlcnk6IHpcclxuICAgICAgICAuc3RyaW5nKClcclxuICAgICAgICAuZGVzY3JpYmUoXHJcbiAgICAgICAgICBcIlRoZSB0b3BpYyBvciBxdWVzdGlvbiB0byByZXNlYXJjaFwiXHJcbiAgICAgICAgKSxcclxuXHJcbiAgICAgIHNvdXJjZXM6IHpcclxuICAgICAgICAubnVtYmVyKClcclxuICAgICAgICAubWluKDEpXHJcbiAgICAgICAgLm1heCg1KVxyXG4gICAgICAgIC5vcHRpb25hbCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKFxyXG4gICAgICAgICAgXCJOdW1iZXIgb2YgdXNhYmxlIHdlYnBhZ2VzIHRvIGNvbGxlY3QuIERlZmF1bHQ6IDUuXCJcclxuICAgICAgICApLFxyXG5cclxuICAgICAgdGltZV9yYW5nZTogelxyXG4gICAgICAgIC5zdHJpbmcoKVxyXG4gICAgICAgIC5vcHRpb25hbCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKFxyXG4gICAgICAgICAgXCJPcHRpb25hbCBmcmVzaG5lc3MgZmlsdGVyOiAnZGF5JywgJ3dlZWsnLCAnbW9udGgnLCBvciAneWVhcidcIlxyXG4gICAgICAgICksXHJcblx0XHRcclxuXHRcdHBhZ2U6IHpcclxuXHRcdCAgLm51bWJlcigpXHJcblx0XHQgIC5pbnQoKVxyXG5cdFx0ICAubWluKDEpXHJcblx0XHQgIC5vcHRpb25hbCgpXHJcblx0XHQgIC5kZXNjcmliZShcclxuXHRcdFx0XCJTZWFyWE5HIHJlc3VsdCBwYWdlIHRvIHJlc2VhcmNoLiBEZWZhdWx0OiAxLlwiXHJcblx0XHQpLFxyXG5cdFx0XHJcbiAgICB9LFxyXG5cclxuICAgIGltcGxlbWVudGF0aW9uOiBhc3luYyAocGFyYW1zOiB7XHJcbiAgICAgIHF1ZXJ5OiBzdHJpbmc7XHJcbiAgICAgIHNvdXJjZXM/OiBudW1iZXI7XHJcbiAgICAgIHRpbWVfcmFuZ2U/OiBzdHJpbmc7XHJcblx0ICBwYWdlPzogbnVtYmVyO1xyXG4gICAgfSkgPT4ge1xyXG4gICAgICBjb25zdCB7XHJcbiAgICAgICAgcXVlcnksXHJcbiAgICAgICAgc291cmNlcyxcclxuICAgICAgICB0aW1lX3JhbmdlLFxyXG5cdFx0cGFnZSA9IDEsXHJcbiAgICAgIH0gPSBwYXJhbXM7XHJcblxyXG4gICAgICBjb25zdCB0YXJnZXRTb3VyY2VzID1cclxuICAgICAgICBzb3VyY2VzID8/XHJcbiAgICAgICAgREVGQVVMVF9SRVNFQVJDSF9TT1VSQ0VTO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgICAgLy8gU1RFUCAxOiBBc2sgU2VhclhORyBmb3IgMTAgY2FuZGlkYXRlcy5cclxuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFBhcmFtcyA9XHJcbiAgICAgICAgICBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcclxuICAgICAgICAgICAgcTogcXVlcnksXHJcbiAgICAgICAgICAgIGZvcm1hdDogXCJqc29uXCIsXHJcbiAgICAgICAgICAgIHBhZ2VubzogU3RyaW5nKHBhZ2UpLFxyXG4gICAgICAgICAgICBzYWZlc2VhcmNoOiBcIjBcIixcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAodGltZV9yYW5nZSkge1xyXG4gICAgICAgICAgY29uc3QgdmFsaWRSYW5nZXMgPSBbXHJcbiAgICAgICAgICAgIFwiZGF5XCIsXHJcbiAgICAgICAgICAgIFwid2Vla1wiLFxyXG4gICAgICAgICAgICBcIm1vbnRoXCIsXHJcbiAgICAgICAgICAgIFwieWVhclwiLFxyXG4gICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIHZhbGlkUmFuZ2VzLmluY2x1ZGVzKFxyXG4gICAgICAgICAgICAgIHRpbWVfcmFuZ2VcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHNlYXJjaFBhcmFtcy5hcHBlbmQoXHJcbiAgICAgICAgICAgICAgXCJ0aW1lX3JhbmdlXCIsXHJcbiAgICAgICAgICAgICAgdGltZV9yYW5nZVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc2VhcmNoVXJsID1cclxuICAgICAgICAgIGAke3NlYXJ4bmdVcmx9L3NlYXJjaD8ke3NlYXJjaFBhcmFtcy50b1N0cmluZygpfWA7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgYHJlc2VhcmNoX3dlYjogc2VhcmNoaW5nIGZvciBcIiR7cXVlcnl9XCJgXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9XHJcbiAgICAgICAgICBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHRpbWVvdXRJZCA9XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICAoKSA9PiBjb250cm9sbGVyLmFib3J0KCksXHJcbiAgICAgICAgICAgIHRpbWVvdXRcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFJlc3BvbnNlID1cclxuICAgICAgICAgIGF3YWl0IGZldGNoKHNlYXJjaFVybCwge1xyXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcblxyXG4gICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgQWNjZXB0OlxyXG4gICAgICAgICAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6XHJcbiAgICAgICAgICAgICAgICBcIkxNLVN0dWRpby1QbHVnaW4vMS4wXCIsXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAhc2VhcmNoUmVzcG9uc2Uub2tcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgYFNlYXJYTkcgcmV0dXJuZWQgJHtzZWFyY2hSZXNwb25zZS5zdGF0dXN9OiBgICtcclxuICAgICAgICAgICAgYCR7c2VhcmNoUmVzcG9uc2Uuc3RhdHVzVGV4dH1gXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9XHJcbiAgICAgICAgICAoYXdhaXQgc2VhcmNoUmVzcG9uc2UuanNvbigpKSBhcyBTZWFyWE5HUmVzcG9uc2U7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICFkYXRhLnJlc3VsdHMgfHxcclxuICAgICAgICAgIGRhdGEucmVzdWx0cy5sZW5ndGggPT09IDBcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIGBObyBzZWFyY2ggcmVzdWx0cyBmb3VuZCBmb3IgXCIke3F1ZXJ5fVwiLmBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID1cclxuICAgICAgICAgIGRhdGEucmVzdWx0cy5zbGljZShcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgUkVTRUFSQ0hfQ0FORElEQVRFU1xyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICBgcmVzZWFyY2hfd2ViOiByZWNlaXZlZCAke2NhbmRpZGF0ZXMubGVuZ3RofSBjYW5kaWRhdGVzYFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgICAvLyBTVEVQIDI6IENoZWNrIGNhbmRpZGF0ZXMgc2VxdWVudGlhbGx5LlxyXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAgICAgY29uc3QgYWNjZXB0ZWQ6IEFjY2VwdGVkU291cmNlW10gPVxyXG4gICAgICAgICAgW107XHJcblxyXG4gICAgICAgIGNvbnN0IHJlamVjdGVkOiBSZWplY3RlZFNvdXJjZVtdID1cclxuICAgICAgICAgIFtdO1xyXG5cclxuICAgICAgICBjb25zdCBzZWVuRG9tYWlucyA9XHJcbiAgICAgICAgICBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbiAgICAgICAgbGV0IGNhbmRpZGF0ZUluZGV4ID0gMDtcclxuXHJcbiAgICAgICAgd2hpbGUgKFxyXG4gICAgICAgICAgYWNjZXB0ZWQubGVuZ3RoIDxcclxuICAgICAgICAgICAgdGFyZ2V0U291cmNlcyAmJlxyXG4gICAgICAgICAgY2FuZGlkYXRlSW5kZXggPFxyXG4gICAgICAgICAgICBjYW5kaWRhdGVzLmxlbmd0aFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgY29uc3QgY2FuZGlkYXRlID1cclxuICAgICAgICAgICAgY2FuZGlkYXRlc1tcclxuICAgICAgICAgICAgICBjYW5kaWRhdGVJbmRleFxyXG4gICAgICAgICAgICBdO1xyXG5cclxuICAgICAgICAgIGNhbmRpZGF0ZUluZGV4Kys7XHJcblxyXG4gICAgICAgICAgbGV0IGRvbWFpbjogc3RyaW5nO1xyXG5cclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGRvbWFpbiA9XHJcbiAgICAgICAgICAgICAgbmV3IFVSTChcclxuICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS51cmxcclxuICAgICAgICAgICAgICApLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmVqZWN0ZWQucHVzaCh7XHJcbiAgICAgICAgICAgICAgdGl0bGU6XHJcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGUudGl0bGUsXHJcbiAgICAgICAgICAgICAgdXJsOlxyXG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlLnVybCxcclxuICAgICAgICAgICAgICByZWFzb246XHJcbiAgICAgICAgICAgICAgICBcImludmFsaWQgVVJMXCIsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gS2VlcCB0aGUgc291cmNlIHNldCBkaXZlcnNlLlxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBzZWVuRG9tYWlucy5oYXMoXHJcbiAgICAgICAgICAgICAgZG9tYWluXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICByZWplY3RlZC5wdXNoKHtcclxuICAgICAgICAgICAgICB0aXRsZTpcclxuICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS50aXRsZSxcclxuICAgICAgICAgICAgICB1cmw6XHJcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGUudXJsLFxyXG4gICAgICAgICAgICAgIHJlYXNvbjpcclxuICAgICAgICAgICAgICAgIFwiZHVwbGljYXRlIGRvbWFpblwiLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBgcmVzZWFyY2hfd2ViOiBjaGVja2luZyBjYW5kaWRhdGUgYCArXHJcbiAgICAgICAgICAgIGAke2NhbmRpZGF0ZUluZGV4fS8ke2NhbmRpZGF0ZXMubGVuZ3RofTogYCArXHJcbiAgICAgICAgICAgIGAke2NhbmRpZGF0ZS51cmx9YFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPVxyXG4gICAgICAgICAgICBhd2FpdCBmZXRjaENhbmRpZGF0ZShcclxuICAgICAgICAgICAgICBjYW5kaWRhdGUsXHJcbiAgICAgICAgICAgICAgdGltZW91dCxcclxuXHRcdFx0ICBxdWVyeSxcclxuXHRcdFx0ICBhY2NlcHRlZC5sZW5ndGhcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICBpZiAoIXJlc3VsdC51c2FibGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgYHJlc2VhcmNoX3dlYjogUkVKRUNURUQgXHUyMDE0IGAgK1xyXG4gICAgICAgICAgICAgIGAke2NhbmRpZGF0ZS51cmx9IFx1MjAxNCAke3Jlc3VsdC5yZWFzb259YFxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgcmVqZWN0ZWQucHVzaCh7XHJcbiAgICAgICAgICAgICAgdGl0bGU6XHJcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGUudGl0bGUsXHJcbiAgICAgICAgICAgICAgdXJsOlxyXG4gICAgICAgICAgICAgICAgY2FuZGlkYXRlLnVybCxcclxuICAgICAgICAgICAgICByZWFzb246XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucmVhc29uLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIENhbmRpZGF0ZSBpcyBkaXNjYXJkZWQuXHJcbiAgICAgICAgICAgIC8vIE1vdmUgZGlyZWN0bHkgdG8gdGhlIG5leHQgU2VhclhORyByZXN1bHQuXHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgICAgICAvLyBBQ0NFUFRFRCBTT1VSQ0UuXHJcbiAgICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgICAgICAgIHNlZW5Eb21haW5zLmFkZChcclxuICAgICAgICAgICAgZG9tYWluXHJcbiAgICAgICAgICApO1xyXG5cclxuXHRcdFx0YWNjZXB0ZWQucHVzaCh7XHJcblx0XHRcdCAgdGl0bGU6IHJlc3VsdC50aXRsZSxcclxuXHRcdFx0ICB1cmw6IHJlc3VsdC51cmwsXHJcblx0XHRcdCAgZG9tYWluOiByZXN1bHQuZG9tYWluLFxyXG5cdFx0XHQgIGVuZ2luZTogcmVzdWx0LmVuZ2luZSxcclxuXHRcdFx0ICBzY29yZTogcmVzdWx0LnNjb3JlLFxyXG5cdFx0XHQgIGNvbnRlbnRTb3VyY2U6IFwiRkVUQ0hFRF9QQUdFXCIsXHJcblx0XHRcdCAgY29udGVudDogcmVzdWx0LmNvbnRlbnQsXHJcblx0XHRcdH0pO1xyXG5cclxuICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBgcmVzZWFyY2hfd2ViOiBBQ0NFUFRFRCBgICtcclxuICAgICAgICAgICAgYCR7YWNjZXB0ZWQubGVuZ3RofS8ke3RhcmdldFNvdXJjZXN9OiBgICtcclxuICAgICAgICAgICAgYCR7cmVzdWx0LnVybH1gXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICAgIC8vIFNURVAgMzogUmV0dXJuIHJlc2VhcmNoIHBhY2thZ2UuXHJcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGlmIChhY2NlcHRlZC5sZW5ndGggPT09IDApIHtcclxuXHRcdCAgY29uc3Qgc25pcHBldFJlc3VsdHMgPSBjYW5kaWRhdGVzXHJcblx0XHRcdC5tYXAoXHJcblx0XHRcdCAgKGNhbmRpZGF0ZSwgaW5kZXgpID0+XHJcblx0XHRcdFx0YFske2luZGV4ICsgMX1dICR7Y2FuZGlkYXRlLnRpdGxlfVxcbmAgK1xyXG5cdFx0XHRcdGBVUkw6ICR7Y2FuZGlkYXRlLnVybH1cXG5gICtcclxuXHRcdFx0XHRgU25pcHBldDogJHtjYW5kaWRhdGUuY29udGVudC5zdWJzdHJpbmcoMCwgNTAwKX1gXHJcblx0XHRcdClcclxuXHRcdFx0LmpvaW4oXCJcXG5cXG5cIik7XHJcblxyXG5cdFx0ICByZXR1cm4gKFxyXG5cdFx0XHRgSSBjb3VsZG4ndCBhY2Nlc3MgYW55IG9mIHRoZSBjdXJyZW50IGAgK1xyXG5cdFx0XHRgJHtjYW5kaWRhdGVJbmRleH0gY2FuZGlkYXRlIHdlYnBhZ2VzIGZvciBcIiR7cXVlcnl9XCIuXFxuXFxuYCArXHJcblx0XHRcdGBXb3VsZCB5b3UgbGlrZSBtZSB0byB1c2UgdGhlIGF2YWlsYWJsZSBzZWFyY2ggc25pcHBldHMsIGAgK1xyXG5cdFx0XHRgb3IgYXR0ZW1wdCB0aGUgbmV4dCAxNSBzZWFyY2ggcmVzdWx0cz9cXG5cXG5gICtcclxuXHRcdFx0YEFWQUlMQUJMRSBTTklQUEVUUzpcXG5cXG5gICtcclxuXHRcdFx0c25pcHBldFJlc3VsdHNcclxuXHRcdCAgKTtcclxuXHRcdH1cclxuXHJcbiAgICAgICAgbGV0IG91dHB1dCA9XHJcbiAgICAgICAgICBgUkVTRUFSQ0ggUkVTVUxUU1xcbmAgK1xyXG4gICAgICAgICAgYFF1ZXJ5OiAke3F1ZXJ5fVxcbmAgK1xyXG4gICAgICAgICAgYFVzYWJsZSBzb3VyY2VzOiAke2FjY2VwdGVkLmxlbmd0aH0vJHt0YXJnZXRTb3VyY2VzfVxcbmAgK1xyXG4gICAgICAgICAgYENhbmRpZGF0ZXMgY2hlY2tlZDogJHtjYW5kaWRhdGVJbmRleH1cXG5cXG5gICtcclxuICAgICAgICAgIGBPbmx5IHNvdXJjZXMgbGlzdGVkIHVuZGVyIFNPVVJDRSAxIHRocm91Z2ggYCArXHJcbiAgICAgICAgICBgU09VUkNFICR7YWNjZXB0ZWQubGVuZ3RofSB3ZXJlIGFjY2VwdGVkIGFuZCBzdXBwbGllZCBgICtcclxuICAgICAgICAgIGBhcyByZXNlYXJjaCBtYXRlcmlhbC5cXG5cXG5gO1xyXG5cclxuICAgICAgICBhY2NlcHRlZC5mb3JFYWNoKFxyXG4gICAgICAgICAgKHNvdXJjZSwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgb3V0cHV0ICs9XHJcbiAgICAgICAgICAgICAgYFNPVVJDRSAke2luZGV4ICsgMX1cXG5gICtcclxuICAgICAgICAgICAgICBgVGl0bGU6ICR7c291cmNlLnRpdGxlfVxcbmAgK1xyXG4gICAgICAgICAgICAgIGBVUkw6ICR7c291cmNlLnVybH1cXG5gICtcclxuICAgICAgICAgICAgICBgJHtzb3VyY2UuY29udGVudH1cXG5cXG5gO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHJldHVybiBvdXRwdXQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJlxyXG4gICAgICAgICAgZXJyb3IubmFtZSA9PT0gXCJBYm9ydEVycm9yXCJcclxuICAgICAgICApIHtcclxuICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIGBSZXNlYXJjaCByZXF1ZXN0IHRpbWVkIG91dCBhZnRlciBgICtcclxuICAgICAgICAgICAgYCR7dGltZW91dH1tcy4gQ2hlY2sgU2VhclhORyBhdCAke3NlYXJ4bmdVcmx9LmBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgYEVycm9yIHJlc2VhcmNoaW5nIFwiJHtxdWVyeX1cIjogYCArXHJcbiAgICAgICAgICBgJHtcclxuICAgICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvclxyXG4gICAgICAgICAgICAgID8gZXJyb3IubWVzc2FnZVxyXG4gICAgICAgICAgICAgIDogU3RyaW5nKGVycm9yKVxyXG4gICAgICAgICAgfWBcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICB0b29scy5wdXNoKHNlYXJjaFRvb2wpO1xyXG4gIHRvb2xzLnB1c2goZmV0Y2hQYWdlVG9vbCk7XHJcbiAgdG9vbHMucHVzaChyZXNlYXJjaFRvb2wpO1xyXG5cclxuICByZXR1cm4gdG9vbHM7XHJcbn0iLCAiaW1wb3J0IHsgUGx1Z2luQ29udGV4dCB9IGZyb20gXCJAbG1zdHVkaW8vc2RrXCI7XHJcbmltcG9ydCB7IHRvb2xzUHJvdmlkZXIgfSBmcm9tIFwiLi90b29sc1Byb3ZpZGVyXCI7XHJcbmltcG9ydCB7IGNvbmZpZ1NjaGVtYXRpY3MgfSBmcm9tIFwiLi9jb25maWdcIjtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGNvbnRleHQ6IFBsdWdpbkNvbnRleHQpIHtcclxuICAvLyBSZWdpc3RlciBjb25maWd1cmF0aW9uIHNjaGVtYXRpY3NcclxuICBjb250ZXh0LndpdGhDb25maWdTY2hlbWF0aWNzKGNvbmZpZ1NjaGVtYXRpY3MpO1xyXG5cclxuICAvLyBSZWdpc3RlciB0aGUgdG9vbHMgcHJvdmlkZXJcclxuICBjb250ZXh0LndpdGhUb29sc1Byb3ZpZGVyKHRvb2xzUHJvdmlkZXIpO1xyXG5cclxuICAvLyBVc2UgY29uc29sZS5sb2cgaW5zdGVhZCBvZiBjb250ZXh0LmxvZ1xyXG4gIGNvbnNvbGUubG9nKFwiU2VhclhORyBTZWFyY2ggUGx1Z2luIGluaXRpYWxpemVkXCIpO1xyXG59XHJcbiIsICJpbXBvcnQgeyBMTVN0dWRpb0NsaWVudCwgdHlwZSBQbHVnaW5Db250ZXh0IH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcblxuZGVjbGFyZSB2YXIgcHJvY2VzczogYW55O1xuXG4vLyBXZSByZWNlaXZlIHJ1bnRpbWUgaW5mb3JtYXRpb24gaW4gdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbmNvbnN0IGNsaWVudElkZW50aWZpZXIgPSBwcm9jZXNzLmVudi5MTVNfUExVR0lOX0NMSUVOVF9JREVOVElGSUVSO1xuY29uc3QgY2xpZW50UGFzc2tleSA9IHByb2Nlc3MuZW52LkxNU19QTFVHSU5fQ0xJRU5UX1BBU1NLRVk7XG5jb25zdCBiYXNlVXJsID0gcHJvY2Vzcy5lbnYuTE1TX1BMVUdJTl9CQVNFX1VSTDtcblxuY29uc3QgY2xpZW50ID0gbmV3IExNU3R1ZGlvQ2xpZW50KHtcbiAgY2xpZW50SWRlbnRpZmllcixcbiAgY2xpZW50UGFzc2tleSxcbiAgYmFzZVVybCxcbn0pO1xuXG4oZ2xvYmFsVGhpcyBhcyBhbnkpLl9fTE1TX1BMVUdJTl9DT05URVhUID0gdHJ1ZTtcblxubGV0IHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCA9IGZhbHNlO1xubGV0IHByb21wdFByZXByb2Nlc3NvclNldCA9IGZhbHNlO1xubGV0IGNvbmZpZ1NjaGVtYXRpY3NTZXQgPSBmYWxzZTtcbmxldCBnbG9iYWxDb25maWdTY2hlbWF0aWNzU2V0ID0gZmFsc2U7XG5sZXQgdG9vbHNQcm92aWRlclNldCA9IGZhbHNlO1xubGV0IGdlbmVyYXRvclNldCA9IGZhbHNlO1xuXG5jb25zdCBzZWxmUmVnaXN0cmF0aW9uSG9zdCA9IGNsaWVudC5wbHVnaW5zLmdldFNlbGZSZWdpc3RyYXRpb25Ib3N0KCk7XG5cbmNvbnN0IHBsdWdpbkNvbnRleHQ6IFBsdWdpbkNvbnRleHQgPSB7XG4gIHdpdGhQcmVkaWN0aW9uTG9vcEhhbmRsZXI6IChnZW5lcmF0ZSkgPT4ge1xuICAgIGlmIChwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByZWRpY3Rpb25Mb29wSGFuZGxlciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGlmICh0b29sc1Byb3ZpZGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcmVkaWN0aW9uTG9vcEhhbmRsZXIgY2Fubm90IGJlIHVzZWQgd2l0aCBhIHRvb2xzIHByb3ZpZGVyXCIpO1xuICAgIH1cblxuICAgIHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0UHJlZGljdGlvbkxvb3BIYW5kbGVyKGdlbmVyYXRlKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aFByb21wdFByZXByb2Nlc3NvcjogKHByZXByb2Nlc3MpID0+IHtcbiAgICBpZiAocHJvbXB0UHJlcHJvY2Vzc29yU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm9tcHRQcmVwcm9jZXNzb3IgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBwcm9tcHRQcmVwcm9jZXNzb3JTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldFByb21wdFByZXByb2Nlc3NvcihwcmVwcm9jZXNzKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aENvbmZpZ1NjaGVtYXRpY3M6IChjb25maWdTY2hlbWF0aWNzKSA9PiB7XG4gICAgaWYgKGNvbmZpZ1NjaGVtYXRpY3NTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbmZpZyBzY2hlbWF0aWNzIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgY29uZmlnU2NoZW1hdGljc1NldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0Q29uZmlnU2NoZW1hdGljcyhjb25maWdTY2hlbWF0aWNzKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aEdsb2JhbENvbmZpZ1NjaGVtYXRpY3M6IChnbG9iYWxDb25maWdTY2hlbWF0aWNzKSA9PiB7XG4gICAgaWYgKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3NTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdsb2JhbCBjb25maWcgc2NoZW1hdGljcyBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGdsb2JhbENvbmZpZ1NjaGVtYXRpY3NTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldEdsb2JhbENvbmZpZ1NjaGVtYXRpY3MoZ2xvYmFsQ29uZmlnU2NoZW1hdGljcyk7XG4gICAgcmV0dXJuIHBsdWdpbkNvbnRleHQ7XG4gIH0sXG4gIHdpdGhUb29sc1Byb3ZpZGVyOiAodG9vbHNQcm92aWRlcikgPT4ge1xuICAgIGlmICh0b29sc1Byb3ZpZGVyU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb29scyBwcm92aWRlciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIGlmIChwcmVkaWN0aW9uTG9vcEhhbmRsZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvb2xzIHByb3ZpZGVyIGNhbm5vdCBiZSB1c2VkIHdpdGggYSBwcmVkaWN0aW9uTG9vcEhhbmRsZXJcIik7XG4gICAgfVxuXG4gICAgdG9vbHNQcm92aWRlclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0VG9vbHNQcm92aWRlcih0b29sc1Byb3ZpZGVyKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aEdlbmVyYXRvcjogKGdlbmVyYXRvcikgPT4ge1xuICAgIGlmIChnZW5lcmF0b3JTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbmVyYXRvciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuXG4gICAgZ2VuZXJhdG9yU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRHZW5lcmF0b3IoZ2VuZXJhdG9yKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbn07XG5cbmltcG9ydChcIi4vLi4vc3JjL2luZGV4LnRzXCIpLnRoZW4oYXN5bmMgbW9kdWxlID0+IHtcbiAgcmV0dXJuIGF3YWl0IG1vZHVsZS5tYWluKHBsdWdpbkNvbnRleHQpO1xufSkudGhlbigoKSA9PiB7XG4gIHNlbGZSZWdpc3RyYXRpb25Ib3N0LmluaXRDb21wbGV0ZWQoKTtcbn0pLmNhdGNoKChlcnJvcikgPT4ge1xuICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGV4ZWN1dGUgdGhlIG1haW4gZnVuY3Rpb24gb2YgdGhlIHBsdWdpbi5cIik7XG4gIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdCQUVhO0FBRmI7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBRWhDLElBQU0sdUJBQW1CLG1DQUF1QixFQUNwRDtBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUE7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNFLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDRSxhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQTtBQUFBLElBQ0YsRUFDQyxNQUFNO0FBQUE7QUFBQTs7O0FDWVQsU0FBUyxNQUFNLElBQTJCO0FBQ3hDLFNBQU8sSUFBSSxRQUFRLENBQUMsWUFBWSxXQUFXLFNBQVMsRUFBRSxDQUFDO0FBQ3pEO0FBS0EsU0FBUyxzQkFBc0IsTUFBc0I7QUFDbkQsU0FBTyxLQUNKLFlBQVksRUFDWixRQUFRLFFBQVEsR0FBRyxFQUNuQixLQUFLO0FBQ1Y7QUFxQkEsU0FBUyxzQkFBc0IsTUFBNkI7QUFDMUQsUUFBTSxhQUFhLHNCQUFzQixJQUFJO0FBTTdDLFFBQU0sb0JBQTZDO0FBQUEsSUFDakQ7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0U7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxNQUNFO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBO0FBQUEsTUFDRTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLGFBQVcsQ0FBQyxTQUFTLE1BQU0sS0FBSyxtQkFBbUI7QUFDakQsUUFBSSxRQUFRLEtBQUssVUFBVSxHQUFHO0FBQzVCLGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQVNGLFFBQU0sWUFBWSxXQUNmLE1BQU0sS0FBSyxFQUNYLE9BQU8sT0FBTyxFQUNkO0FBRUgsUUFBTSwrQkFDSiw0RUFBNEUsS0FBSyxVQUFVLEtBQzNGLHVDQUF1QyxLQUFLLFVBQVUsS0FDdEQscUVBQXFFLEtBQUssVUFBVSxLQUNwRiw0REFBNEQsS0FBSyxVQUFVLEtBQzNFLHVEQUF1RCxLQUFLLFVBQVUsS0FDdEUsZ0VBQWdFLEtBQUssVUFBVTtBQUVqRixRQUFNLGFBQ0osc0NBQXNDLEtBQUssVUFBVTtBQUV2RCxRQUFNLGVBQ0osaUJBQWlCLEtBQUssVUFBVTtBQUVsQyxRQUFNLHNCQUNKLHFEQUFxRCxLQUFLLFVBQVU7QUFFdEUsTUFBSSw4QkFBOEI7QUFDaEMsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUNFLFlBQVksUUFFVCxjQUFjLHVCQUNkLGdCQUFnQixzQkFFbkI7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUVFLFNBQU87QUFDVDtBQUVBLFNBQVMsc0JBQ1AsU0FDQSxPQUNBLFlBQVksS0FDSjtBQUNSLE1BQUksUUFBUSxVQUFVLFdBQVc7QUFDL0IsV0FBTztBQUFBLEVBQ1Q7QUFFRCxRQUFNLFlBQVksSUFBSSxRQUFJLDZCQUFBQSxTQUFVLENBQUM7QUFFcEMsUUFBTSxRQUFRLE1BQ1gsWUFBWSxFQUNaLFFBQVEsdUJBQXVCLEdBQUcsRUFDbEMsTUFBTSxLQUFLLEVBQ1g7QUFBQSxJQUNDLENBQUMsU0FDQyxLQUFLLFVBQVUsS0FDZixDQUFDLFVBQVUsSUFBSSxJQUFJO0FBQUEsRUFDdkI7QUFFSCxRQUFNLGNBQWMsTUFDakIsWUFBWSxFQUNaLFFBQVEsdUJBQXVCLEdBQUcsRUFDbEMsUUFBUSxRQUFRLEdBQUcsRUFDbkIsS0FBSztBQUVQLE1BQUksTUFBTSxXQUFXLEdBQUc7QUFDdEIsV0FBTyxRQUFRLFVBQVUsR0FBRyxTQUFTLEVBQUUsS0FBSyxJQUMxQztBQUFBLEVBQ0o7QUFFQSxRQUFNLGFBQWEsUUFDaEIsTUFBTSxTQUFTLEVBQ2YsSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsRUFDekIsT0FBTyxPQUFPO0FBRWpCLFFBQU0sU0FBUyxXQUFXLElBQUksQ0FBQyxXQUFXLFVBQVU7QUFDbEQsVUFBTSxRQUFRLFVBQVUsWUFBWTtBQUVwQyxRQUFJLFFBQVE7QUFFZixRQUNFLFlBQVksVUFBVSxLQUN0QixNQUFNLFNBQVMsV0FBVyxHQUMxQjtBQUNBLGVBQVM7QUFBQSxJQUNYO0FBRUcsZUFBVyxRQUFRLE9BQU87QUFDeEIsWUFBTSxVQUFVLE1BQU0sTUFBTSxJQUFJLEVBQUUsU0FBUztBQUMzQyxlQUFTLEtBQUssSUFBSSxTQUFTLENBQUM7QUFBQSxJQUM5QjtBQUVBLFdBQU87QUFBQSxNQUNMO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRixDQUFDO0FBRUQsUUFBTSxXQUFXLE9BQ2QsT0FBTyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsRUFDL0IsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLO0FBRW5DLE1BQUksU0FBUyxXQUFXLEdBQUc7QUFDekIsV0FBTyxRQUFRLFVBQVUsR0FBRyxTQUFTLEVBQUUsS0FBSyxJQUMxQztBQUFBLEVBQ0o7QUFFQSxRQUFNLFdBQVcsb0JBQUksSUFBWTtBQUVqQyxNQUFJLGNBQWM7QUFFbEIsYUFBVyxRQUFRLFVBQVU7QUFFM0IsVUFBTSxRQUFRLEtBQUssSUFBSSxHQUFHLEtBQUssUUFBUSxDQUFDO0FBQ3hDLFVBQU0sTUFBTSxLQUFLO0FBQUEsTUFDZixXQUFXLFNBQVM7QUFBQSxNQUNwQixLQUFLLFFBQVE7QUFBQSxJQUNmO0FBRUEsYUFBUyxJQUFJLE9BQU8sS0FBSyxLQUFLLEtBQUs7QUFDakMsVUFBSSxTQUFTLElBQUksQ0FBQyxFQUFHO0FBRXJCLFlBQU0sV0FDSixXQUFXLENBQUMsSUFBSTtBQUVsQixVQUNFLGNBQWMsU0FBUyxTQUN2QixXQUNBO0FBQ0E7QUFBQSxNQUNGO0FBRUEsZUFBUyxJQUFJLENBQUM7QUFDZCxxQkFBZSxTQUFTO0FBQUEsSUFDMUI7QUFFQSxRQUFJLGVBQWUsWUFBWSxNQUFNO0FBQ25DO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLFNBQVMsTUFBTSxLQUFLLFFBQVEsRUFDL0IsS0FBSyxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsRUFDcEIsSUFBSSxDQUFDLFVBQVUsV0FBVyxLQUFLLENBQUMsRUFDaEMsS0FBSyxNQUFNO0FBRWQsU0FBTyxPQUFPLEtBQUssS0FDaEIsT0FBTyxTQUFTLFFBQVEsU0FDckIsNEJBQ0E7QUFDUjtBQVdBLFNBQVMsWUFBWSxNQUFzQjtBQUN6QyxNQUFJLE9BQU87QUFHWCxTQUFPLEtBQ0osUUFBUSx1Q0FBdUMsR0FBRyxFQUNsRCxRQUFRLHFDQUFxQyxHQUFHLEVBQ2hELFFBQVEsMkNBQTJDLEdBQUcsRUFDdEQsUUFBUSxpQ0FBaUMsR0FBRyxFQUM1QyxRQUFRLDJDQUEyQyxHQUFHLEVBQ3RELFFBQVEsb0JBQW9CLEdBQUc7QUFHbEMsUUFBTSxhQUF1QixDQUFDO0FBRTlCLFFBQU0sY0FBYyxLQUFLO0FBQUEsSUFDdkI7QUFBQSxFQUNGO0FBRUEsUUFBTSxpQkFBaUIsS0FBSztBQUFBLElBQzFCO0FBQUEsRUFDRjtBQUVBLE1BQUksWUFBYSxZQUFXLEtBQUssR0FBRyxXQUFXO0FBQy9DLE1BQUksZUFBZ0IsWUFBVyxLQUFLLEdBQUcsY0FBYztBQUdyRCxNQUFJLFdBQVcsU0FBUyxHQUFHO0FBQ3pCLFdBQU8sV0FDSixLQUFLLENBQUMsR0FBRyxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBQUEsRUFDMUM7QUFHQSxTQUFPLEtBQ0o7QUFBQSxJQUNDO0FBQUEsSUFDQTtBQUFBLEVBQ0YsRUFDQztBQUFBLElBQ0M7QUFBQSxJQUNBO0FBQUEsRUFDRixFQUNDO0FBQUEsSUFDQztBQUFBLElBQ0E7QUFBQSxFQUNGLEVBQ0M7QUFBQSxJQUNDO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFHRixTQUFPLEtBQ0o7QUFBQSxJQUNDO0FBQUEsSUFDQTtBQUFBLEVBQ0YsRUFDQztBQUFBLElBQ0M7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUdGLFNBQU8sS0FBSyxRQUFRLFlBQVksR0FBRztBQUduQyxTQUFPLEtBQ0osUUFBUSxZQUFZLEdBQUcsRUFDdkIsUUFBUSxXQUFXLEdBQUcsRUFDdEIsUUFBUSxVQUFVLEdBQUcsRUFDckIsUUFBUSxVQUFVLEdBQUcsRUFDckIsUUFBUSxZQUFZLEdBQUcsRUFDdkIsUUFBUSxXQUFXLEdBQUc7QUFHekIsU0FBTyxLQUNKLFFBQVEsT0FBTyxFQUFFLEVBQ2pCLFFBQVEsV0FBVyxHQUFHLEVBQ3RCLFFBQVEsYUFBYSxJQUFJLEVBQ3pCLFFBQVEsYUFBYSxJQUFJLEVBQ3pCLFFBQVEsa0JBQWtCLE1BQU0sRUFDaEMsS0FBSztBQUVSLFNBQU87QUFDVDtBQWlCQSxlQUFlLGVBQ2IsUUFDQSxTQUNBLE9BQ0EsYUFnQkU7QUFDRixNQUFJO0FBRUosTUFBSTtBQUNGLGFBQ0UsSUFBSSxJQUFJLE9BQU8sR0FBRyxFQUFFO0FBQUEsRUFDeEIsUUFBUTtBQUNOLFdBQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUVBLE1BQUk7QUFDRixVQUFNLGFBQ0osSUFBSSxnQkFBZ0I7QUFFdEIsVUFBTSxZQUNKO0FBQUEsTUFDRSxNQUFNLFdBQVcsTUFBTTtBQUFBLE1BQ3ZCO0FBQUEsSUFDRjtBQUVGLFlBQVE7QUFBQSxNQUNOLDBCQUEwQixPQUFPLEdBQUc7QUFBQSxJQUN0QztBQUVBLFVBQU0sV0FDSixNQUFNLE1BQU0sT0FBTyxLQUFLO0FBQUEsTUFDdEIsUUFBUTtBQUFBLE1BRVIsU0FBUztBQUFBLFFBQ1AsY0FDRTtBQUFBLFFBSUYsUUFDRTtBQUFBLE1BRUo7QUFBQSxNQUVBLFFBQVEsV0FBVztBQUFBLElBQ3JCLENBQUM7QUFFSCxpQkFBYSxTQUFTO0FBU3RCLFFBQUksU0FBUyxXQUFXLEtBQUs7QUFDM0IsYUFBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsUUFDRTtBQUFBLE1BQ0o7QUFBQSxJQUNGO0FBRUEsUUFBSSxTQUFTLFdBQVcsS0FBSztBQUMzQixhQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsUUFDUixRQUNFO0FBQUEsTUFDSjtBQUFBLElBQ0Y7QUFFQSxRQUFJLFNBQVMsV0FBVyxLQUFLO0FBQzNCLGFBQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLFFBQ0U7QUFBQSxNQUNKO0FBQUEsSUFDRjtBQUVBLFFBQUksU0FBUyxVQUFVLEtBQUs7QUFDMUIsYUFBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsUUFDRSxRQUFRLFNBQVMsTUFBTSxJQUFJLFNBQVMsVUFBVTtBQUFBLE1BQ2xEO0FBQUEsSUFDRjtBQUVBLFFBQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsYUFBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsUUFDRSxRQUFRLFNBQVMsTUFBTSxJQUFJLFNBQVMsVUFBVTtBQUFBLE1BQ2xEO0FBQUEsSUFDRjtBQVNILFVBQU0sTUFBTSxHQUFJO0FBT2IsVUFBTSxPQUNKLE1BQU0sU0FBUyxLQUFLO0FBR3RCLFVBQU0saUJBQ0osS0FDRyxVQUFVLEdBQUcsR0FBTTtBQUV4QixVQUFNLFlBQ0o7QUFBQSxNQUNFO0FBQUEsSUFDRjtBQUVGLFFBQUksV0FBVztBQUNiLGFBQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxRQUNSLFFBQ0UsMkNBQTJDLFNBQVM7QUFBQSxNQUN4RDtBQUFBLElBQ0Y7QUFNQSxRQUFJLFVBQ0YsWUFBWSxJQUFJO0FBR3JCLFVBQU0sWUFBWSxRQUNmLE1BQU0sS0FBSyxFQUNYLE9BQU8sT0FBTyxFQUNkO0FBRUgsUUFBSSxZQUFZLEtBQUs7QUFDbkIsYUFBTztBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsUUFDRSx1Q0FBdUMsU0FBUztBQUFBLE1BQ2pEO0FBQUEsSUFDRjtBQUVBLFVBQU0sZ0JBQWdCO0FBQUEsTUFDcEI7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUVBLFVBQU0sZUFDSixjQUNELEtBQUs7QUFBQSxNQUNIO0FBQUEsTUFDQSxjQUFjLFNBQVM7QUFBQSxJQUN6QixDQUNDO0FBRUYsY0FBVTtBQUFBLE1BQ1I7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFFRyxXQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixPQUFPLE9BQU87QUFBQSxNQUNkLEtBQUssT0FBTztBQUFBLE1BQ1o7QUFBQSxNQUNBLFFBQVEsT0FBTztBQUFBLE1BQ2YsT0FBTyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFBQSxFQUNGLFNBQVMsT0FBTztBQUNkLFFBQ0UsaUJBQWlCLFNBQ2pCLE1BQU0sU0FBUyxjQUNmO0FBQ0EsYUFBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsUUFDRSwyQkFBMkIsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUVBLFdBQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLFFBQ0UsaUJBQWlCLFFBQ2IsTUFBTSxVQUNOLE9BQU8sS0FBSztBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUNGO0FBRUEsZUFBc0IsY0FDcEIsS0FDaUI7QUFDakIsUUFBTSxRQUFnQixDQUFDO0FBRXZCLFFBQU0sU0FDSixJQUFJO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFRixRQUFNLGFBQ0osT0FBTztBQUFBLElBQ0w7QUFBQSxFQUNGO0FBRUYsUUFBTSxrQkFDSixPQUFPO0FBQUEsSUFDTDtBQUFBLEVBQ0Y7QUFFRixRQUFNLFVBQ0osT0FBTztBQUFBLElBQ0w7QUFBQSxFQUNGO0FBTUYsUUFBTSxpQkFBYSxrQkFBSztBQUFBLElBQ3RCLE1BQU07QUFBQSxJQUVOLGFBQ0Q7QUFBQSxJQUlDLFlBQVk7QUFBQSxNQUNWLE9BQU8sYUFDSixPQUFPLEVBQ1A7QUFBQSxRQUNDO0FBQUEsTUFDRjtBQUFBLE1BRUYsYUFBYSxhQUNWLE9BQU8sRUFDUCxJQUFJLENBQUMsRUFDTCxJQUFJLEVBQUUsRUFDTixTQUFTLEVBQ1Q7QUFBQSxRQUNDLGdEQUFnRCxlQUFlO0FBQUEsTUFDakU7QUFBQSxNQUVGLFlBQVksYUFDVCxPQUFPLEVBQ1AsU0FBUyxFQUNUO0FBQUEsUUFDQztBQUFBLE1BQ0Y7QUFBQSxJQUNKO0FBQUEsSUFFQSxnQkFBZ0IsT0FBTyxXQUlqQjtBQUNKLFVBQUk7QUFDRixjQUFNO0FBQUEsVUFDSjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDRixJQUFJO0FBRUosY0FBTSxXQUNKLGVBQ0E7QUFFRixjQUFNLGVBQ0osSUFBSSxnQkFBZ0I7QUFBQSxVQUNsQixHQUFHO0FBQUEsVUFDSCxRQUFRO0FBQUEsVUFDUixRQUFRLE9BQU8sSUFBSTtBQUFBLFVBQ25CLFlBQVk7QUFBQSxRQUNkLENBQUM7QUFFVCxjQUFNLHNCQUNKLFlBQVksWUFBWSxFQUFFLEtBQUs7QUFFakMsWUFBSSxxQkFBcUI7QUFDdkIsZ0JBQU0sY0FBYztBQUFBLFlBQ3JCO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDQztBQUVBLGNBQ0QsWUFBWTtBQUFBLFlBQ1Y7QUFBQSxVQUNGLEdBQ0c7QUFDSCx5QkFBYTtBQUFBLGNBQ1g7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBLFVBQ0M7QUFBQSxRQUNGO0FBRU0sY0FBTSxZQUNKLEdBQUcsVUFBVSxXQUFXLGFBQWEsU0FBUyxDQUFDO0FBRWpELGdCQUFRO0FBQUEsVUFDTixxQkFBcUIsVUFBVTtBQUFBLFlBQzdCO0FBQUEsWUFDQTtBQUFBLFVBQ0YsQ0FBQztBQUFBLFFBQ0g7QUFFQSxjQUFNLGFBQ0osSUFBSSxnQkFBZ0I7QUFFdEIsY0FBTSxZQUNKO0FBQUEsVUFDRSxNQUFNLFdBQVcsTUFBTTtBQUFBLFVBQ3ZCO0FBQUEsUUFDRjtBQUVGLGNBQU0sV0FDSixNQUFNLE1BQU0sV0FBVztBQUFBLFVBQ3JCLFFBQVE7QUFBQSxVQUVSLFNBQVM7QUFBQSxZQUNQLFFBQ0U7QUFBQSxZQUNGLGNBQ0U7QUFBQSxVQUNKO0FBQUEsVUFFQSxRQUFRLFdBQVc7QUFBQSxRQUNyQixDQUFDO0FBRUgscUJBQWEsU0FBUztBQUV0QixZQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLGdCQUFNLElBQUk7QUFBQSxZQUNSLDJCQUEyQixTQUFTLE1BQU0sS0FDdkMsU0FBUyxVQUFVO0FBQUEsVUFDeEI7QUFBQSxRQUNGO0FBRUEsY0FBTSxPQUNILE1BQU0sU0FBUyxLQUFLO0FBRXZCLFlBQ0UsQ0FBQyxLQUFLLFdBQ04sS0FBSyxRQUFRLFdBQVcsR0FDeEI7QUFDQSxpQkFBTyxnQ0FBZ0MsS0FBSztBQUFBLFFBQzlDO0FBRUEsY0FBTSxtQkFDSixLQUFLLFFBQ0YsTUFBTSxHQUFHLFFBQVEsRUFDakI7QUFBQSxVQUNDLENBQUMsUUFBUSxVQUNQLElBQUksUUFBUSxDQUFDLEtBQUssT0FBTyxLQUFLO0FBQUEsT0FDdEIsT0FBTyxHQUFHO0FBQUEsV0FDTixPQUFPLFFBQVE7QUFBQSxZQUN6QjtBQUFBLFlBQ0E7QUFBQSxVQUNGLENBQUMsR0FDQyxPQUFPLFFBQVEsU0FBUyxNQUNwQixRQUNBLEVBQ047QUFBQSxVQUNXLE9BQU8sTUFBTTtBQUFBLFFBQzVCLEVBQ0MsS0FBSyxNQUFNO0FBRWhCLGVBQ0UsdUJBQXVCLEtBQUssTUFDeEIsS0FBSztBQUFBLFVBQ1AsS0FBSyxRQUFRO0FBQUEsVUFDYjtBQUFBLFFBQ0YsQ0FBQyxPQUFPLEtBQUssaUJBQWlCO0FBQUE7QUFBQSxJQUM5QixtQkFDQTtBQUFBLE1BR0osU0FBUyxPQUFPO0FBQ2QsWUFDRSxpQkFBaUIsU0FDakIsTUFBTSxTQUFTLGNBQ2Y7QUFDQSxpQkFDRSwwQ0FDRyxPQUFPLHdDQUNQLFVBQVU7QUFBQSxRQUVqQjtBQUVBLGVBQ0UsNEJBRUUsaUJBQWlCLFFBQ2IsTUFBTSxVQUNOLE9BQU8sS0FBSyxDQUNsQjtBQUFBLE1BRUo7QUFBQSxJQUNGO0FBQUEsRUFDRixDQUFDO0FBTUQsUUFBTSxvQkFBZ0Isa0JBQUs7QUFBQSxJQUN6QixNQUFNO0FBQUEsSUFFTixhQUNFO0FBQUEsSUFFRixZQUFZO0FBQUEsTUFDVixLQUFLLGFBQ0YsT0FBTyxFQUNQLElBQUksRUFDSjtBQUFBLFFBQ0M7QUFBQSxNQUNGO0FBQUEsTUFFRixZQUFZLGFBQ1QsT0FBTyxFQUNQLElBQUksR0FBRyxFQUNQLElBQUksR0FBSyxFQUNULFNBQVMsRUFDVDtBQUFBLFFBQ0M7QUFBQSxNQUNGO0FBQUEsSUFDSjtBQUFBLElBRUEsZ0JBQWdCLE9BQU8sV0FHakI7QUFDSixVQUFJO0FBQ0YsY0FBTTtBQUFBLFVBQ0o7QUFBQSxVQUNBO0FBQUEsUUFDRixJQUFJO0FBRUosY0FBTSxZQUNKLGNBQWM7QUFFaEIsY0FBTSxXQUNKLE1BQU0sTUFBTSxLQUFLO0FBQUEsVUFDZixTQUFTO0FBQUEsWUFDUCxjQUNFO0FBQUEsVUFDSjtBQUFBLFFBQ0YsQ0FBQztBQUVILFlBQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsaUJBQ0UsbUJBQW1CLEdBQUcsS0FDbkIsU0FBUyxNQUFNLElBQUksU0FBUyxVQUFVO0FBQUEsUUFFN0M7QUFFQSxjQUFNLE9BQ0osTUFBTSxTQUFTLEtBQUs7QUFFdEIsWUFBSSxPQUNGLFlBQVksSUFBSTtBQUVsQixZQUNFLEtBQUssU0FDTCxXQUNBO0FBQ0EsaUJBQ0UsS0FBSztBQUFBLFlBQ0g7QUFBQSxZQUNBO0FBQUEsVUFDRixJQUNBO0FBQUEsUUFDSjtBQUVBLGVBQ0UsZ0JBQWdCLEdBQUc7QUFBQTtBQUFBLEVBQVEsSUFBSTtBQUFBLE1BRW5DLFNBQVMsT0FBTztBQUNkLGVBQ0Usd0JBRUUsaUJBQWlCLFFBQ2IsTUFBTSxVQUNOLE9BQU8sS0FBSyxDQUNsQjtBQUFBLE1BRUo7QUFBQSxJQUNGO0FBQUEsRUFDRixDQUFDO0FBTUQsUUFBTSxtQkFBZSxrQkFBSztBQUFBLElBQ3hCLE1BQU07QUFBQSxJQUVOLGFBQ0Y7QUFBQSxJQWNFLFlBQVk7QUFBQSxNQUNWLE9BQU8sYUFDSixPQUFPLEVBQ1A7QUFBQSxRQUNDO0FBQUEsTUFDRjtBQUFBLE1BRUYsU0FBUyxhQUNOLE9BQU8sRUFDUCxJQUFJLENBQUMsRUFDTCxJQUFJLENBQUMsRUFDTCxTQUFTLEVBQ1Q7QUFBQSxRQUNDO0FBQUEsTUFDRjtBQUFBLE1BRUYsWUFBWSxhQUNULE9BQU8sRUFDUCxTQUFTLEVBQ1Q7QUFBQSxRQUNDO0FBQUEsTUFDRjtBQUFBLE1BRU4sTUFBTSxhQUNILE9BQU8sRUFDUCxJQUFJLEVBQ0osSUFBSSxDQUFDLEVBQ0wsU0FBUyxFQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Q7QUFBQSxJQUVFO0FBQUEsSUFFQSxnQkFBZ0IsT0FBTyxXQUtqQjtBQUNKLFlBQU07QUFBQSxRQUNKO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNOLE1BQUFDLFFBQU87QUFBQSxNQUNILElBQUk7QUFFSixZQUFNLGdCQUNKLFdBQ0E7QUFFRixVQUFJO0FBS0YsY0FBTSxlQUNKLElBQUksZ0JBQWdCO0FBQUEsVUFDbEIsR0FBRztBQUFBLFVBQ0gsUUFBUTtBQUFBLFVBQ1IsUUFBUSxPQUFPQSxLQUFJO0FBQUEsVUFDbkIsWUFBWTtBQUFBLFFBQ2QsQ0FBQztBQUVILFlBQUksWUFBWTtBQUNkLGdCQUFNLGNBQWM7QUFBQSxZQUNsQjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFFQSxjQUNFLFlBQVk7QUFBQSxZQUNWO0FBQUEsVUFDRixHQUNBO0FBQ0EseUJBQWE7QUFBQSxjQUNYO0FBQUEsY0FDQTtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUVBLGNBQU0sWUFDSixHQUFHLFVBQVUsV0FBVyxhQUFhLFNBQVMsQ0FBQztBQUVqRCxnQkFBUTtBQUFBLFVBQ04sZ0NBQWdDLEtBQUs7QUFBQSxRQUN2QztBQUVBLGNBQU0sYUFDSixJQUFJLGdCQUFnQjtBQUV0QixjQUFNLFlBQ0o7QUFBQSxVQUNFLE1BQU0sV0FBVyxNQUFNO0FBQUEsVUFDdkI7QUFBQSxRQUNGO0FBRUYsY0FBTSxpQkFDSixNQUFNLE1BQU0sV0FBVztBQUFBLFVBQ3JCLFFBQVE7QUFBQSxVQUVSLFNBQVM7QUFBQSxZQUNQLFFBQ0U7QUFBQSxZQUNGLGNBQ0U7QUFBQSxVQUNKO0FBQUEsVUFFQSxRQUFRLFdBQVc7QUFBQSxRQUNyQixDQUFDO0FBRUgscUJBQWEsU0FBUztBQUV0QixZQUNFLENBQUMsZUFBZSxJQUNoQjtBQUNBLGdCQUFNLElBQUk7QUFBQSxZQUNSLG9CQUFvQixlQUFlLE1BQU0sS0FDdEMsZUFBZSxVQUFVO0FBQUEsVUFDOUI7QUFBQSxRQUNGO0FBRUEsY0FBTSxPQUNILE1BQU0sZUFBZSxLQUFLO0FBRTdCLFlBQ0UsQ0FBQyxLQUFLLFdBQ04sS0FBSyxRQUFRLFdBQVcsR0FDeEI7QUFDQSxpQkFDRSxnQ0FBZ0MsS0FBSztBQUFBLFFBRXpDO0FBRUEsY0FBTSxhQUNKLEtBQUssUUFBUTtBQUFBLFVBQ1g7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUVGLGdCQUFRO0FBQUEsVUFDTiwwQkFBMEIsV0FBVyxNQUFNO0FBQUEsUUFDN0M7QUFNQSxjQUFNLFdBQ0osQ0FBQztBQUVILGNBQU0sV0FDSixDQUFDO0FBRUgsY0FBTSxjQUNKLG9CQUFJLElBQVk7QUFFbEIsWUFBSSxpQkFBaUI7QUFFckIsZUFDRSxTQUFTLFNBQ1AsaUJBQ0YsaUJBQ0UsV0FBVyxRQUNiO0FBQ0EsZ0JBQU0sWUFDSixXQUNFLGNBQ0Y7QUFFRjtBQUVBLGNBQUk7QUFFSixjQUFJO0FBQ0YscUJBQ0UsSUFBSTtBQUFBLGNBQ0YsVUFBVTtBQUFBLFlBQ1osRUFBRSxTQUFTLFlBQVk7QUFBQSxVQUMzQixRQUFRO0FBQ04scUJBQVMsS0FBSztBQUFBLGNBQ1osT0FDRSxVQUFVO0FBQUEsY0FDWixLQUNFLFVBQVU7QUFBQSxjQUNaLFFBQ0U7QUFBQSxZQUNKLENBQUM7QUFFRDtBQUFBLFVBQ0Y7QUFHQSxjQUNFLFlBQVk7QUFBQSxZQUNWO0FBQUEsVUFDRixHQUNBO0FBQ0EscUJBQVMsS0FBSztBQUFBLGNBQ1osT0FDRSxVQUFVO0FBQUEsY0FDWixLQUNFLFVBQVU7QUFBQSxjQUNaLFFBQ0U7QUFBQSxZQUNKLENBQUM7QUFFRDtBQUFBLFVBQ0Y7QUFFQSxrQkFBUTtBQUFBLFlBQ04sb0NBQ0csY0FBYyxJQUFJLFdBQVcsTUFBTSxLQUNuQyxVQUFVLEdBQUc7QUFBQSxVQUNsQjtBQUVBLGdCQUFNLFNBQ0osTUFBTTtBQUFBLFlBQ0o7QUFBQSxZQUNBO0FBQUEsWUFDVDtBQUFBLFlBQ0EsU0FBUztBQUFBLFVBQ0Y7QUFFRixjQUFJLENBQUMsT0FBTyxRQUFRO0FBQ2xCLG9CQUFRO0FBQUEsY0FDTixpQ0FDRyxVQUFVLEdBQUcsV0FBTSxPQUFPLE1BQU07QUFBQSxZQUNyQztBQUVBLHFCQUFTLEtBQUs7QUFBQSxjQUNaLE9BQ0UsVUFBVTtBQUFBLGNBQ1osS0FDRSxVQUFVO0FBQUEsY0FDWixRQUNFLE9BQU87QUFBQSxZQUNYLENBQUM7QUFJRDtBQUFBLFVBQ0Y7QUFNQSxzQkFBWTtBQUFBLFlBQ1Y7QUFBQSxVQUNGO0FBRVAsbUJBQVMsS0FBSztBQUFBLFlBQ1osT0FBTyxPQUFPO0FBQUEsWUFDZCxLQUFLLE9BQU87QUFBQSxZQUNaLFFBQVEsT0FBTztBQUFBLFlBQ2YsUUFBUSxPQUFPO0FBQUEsWUFDZixPQUFPLE9BQU87QUFBQSxZQUNkLGVBQWU7QUFBQSxZQUNmLFNBQVMsT0FBTztBQUFBLFVBQ2xCLENBQUM7QUFFTSxrQkFBUTtBQUFBLFlBQ04sMEJBQ0csU0FBUyxNQUFNLElBQUksYUFBYSxLQUNoQyxPQUFPLEdBQUc7QUFBQSxVQUNmO0FBQUEsUUFDRjtBQU1OLFlBQUksU0FBUyxXQUFXLEdBQUc7QUFDekIsZ0JBQU0saUJBQWlCLFdBQ3ZCO0FBQUEsWUFDQyxDQUFDLFdBQVcsVUFDYixJQUFJLFFBQVEsQ0FBQyxLQUFLLFVBQVUsS0FBSztBQUFBLE9BQ3pCLFVBQVUsR0FBRztBQUFBLFdBQ1QsVUFBVSxRQUFRLFVBQVUsR0FBRyxHQUFHLENBQUM7QUFBQSxVQUNoRCxFQUNDLEtBQUssTUFBTTtBQUVYLGlCQUNELHdDQUNHLGNBQWMsNEJBQTRCLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFJbEQ7QUFBQSxRQUVEO0FBRU0sWUFBSSxTQUNGO0FBQUEsU0FDVSxLQUFLO0FBQUEsa0JBQ0ksU0FBUyxNQUFNLElBQUksYUFBYTtBQUFBLHNCQUM1QixjQUFjO0FBQUE7QUFBQSxvREFFM0IsU0FBUyxNQUFNO0FBQUE7QUFBQTtBQUczQixpQkFBUztBQUFBLFVBQ1AsQ0FBQyxRQUFRLFVBQVU7QUFDakIsc0JBQ0UsVUFBVSxRQUFRLENBQUM7QUFBQSxTQUNULE9BQU8sS0FBSztBQUFBLE9BQ2QsT0FBTyxHQUFHO0FBQUEsRUFDZixPQUFPLE9BQU87QUFBQTtBQUFBO0FBQUEsVUFDckI7QUFBQSxRQUNGO0FBRUEsZUFBTztBQUFBLE1BQ1QsU0FBUyxPQUFPO0FBQ2QsWUFDRSxpQkFBaUIsU0FDakIsTUFBTSxTQUFTLGNBQ2Y7QUFDQSxpQkFDRSxvQ0FDRyxPQUFPLHdCQUF3QixVQUFVO0FBQUEsUUFFaEQ7QUFFQSxlQUNFLHNCQUFzQixLQUFLLE1BRXpCLGlCQUFpQixRQUNiLE1BQU0sVUFDTixPQUFPLEtBQUssQ0FDbEI7QUFBQSxNQUVKO0FBQUEsSUFDRjtBQUFBLEVBQ0YsQ0FBQztBQUVELFFBQU0sS0FBSyxVQUFVO0FBQ3JCLFFBQU0sS0FBSyxhQUFhO0FBQ3hCLFFBQU0sS0FBSyxZQUFZO0FBRXZCLFNBQU87QUFDVDtBQWwxQ0EsSUFBQUMsYUFDQSxZQUVBLDhCQWtDTSxxQkFDQTtBQXRDTjtBQUFBO0FBQUE7QUFBQSxJQUFBQSxjQUFvRDtBQUNwRCxpQkFBa0I7QUFDbEI7QUFDQSxtQ0FBc0I7QUFrQ3RCLElBQU0sc0JBQXNCO0FBQzVCLElBQU0sMkJBQTJCO0FBQUE7QUFBQTs7O0FDdENqQztBQUFBO0FBQUE7QUFBQTtBQUlBLGVBQXNCLEtBQUssU0FBd0I7QUFFakQsVUFBUSxxQkFBcUIsZ0JBQWdCO0FBRzdDLFVBQVEsa0JBQWtCLGFBQWE7QUFHdkMsVUFBUSxJQUFJLG1DQUFtQztBQUNqRDtBQWJBO0FBQUE7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUFBOzs7QUNGQSxJQUFBQyxjQUFtRDtBQUtuRCxJQUFNLG1CQUFtQixRQUFRLElBQUk7QUFDckMsSUFBTSxnQkFBZ0IsUUFBUSxJQUFJO0FBQ2xDLElBQU0sVUFBVSxRQUFRLElBQUk7QUFFNUIsSUFBTSxTQUFTLElBQUksMkJBQWU7QUFBQSxFQUNoQztBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0YsQ0FBQztBQUVBLFdBQW1CLHVCQUF1QjtBQUUzQyxJQUFJLDJCQUEyQjtBQUMvQixJQUFJLHdCQUF3QjtBQUM1QixJQUFJLHNCQUFzQjtBQUMxQixJQUFJLDRCQUE0QjtBQUNoQyxJQUFJLG1CQUFtQjtBQUN2QixJQUFJLGVBQWU7QUFFbkIsSUFBTSx1QkFBdUIsT0FBTyxRQUFRLHdCQUF3QjtBQUVwRSxJQUFNLGdCQUErQjtBQUFBLEVBQ25DLDJCQUEyQixDQUFDLGFBQWE7QUFDdkMsUUFBSSwwQkFBMEI7QUFDNUIsWUFBTSxJQUFJLE1BQU0sMENBQTBDO0FBQUEsSUFDNUQ7QUFDQSxRQUFJLGtCQUFrQjtBQUNwQixZQUFNLElBQUksTUFBTSw0REFBNEQ7QUFBQSxJQUM5RTtBQUVBLCtCQUEyQjtBQUMzQix5QkFBcUIseUJBQXlCLFFBQVE7QUFDdEQsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLHdCQUF3QixDQUFDLGVBQWU7QUFDdEMsUUFBSSx1QkFBdUI7QUFDekIsWUFBTSxJQUFJLE1BQU0sdUNBQXVDO0FBQUEsSUFDekQ7QUFDQSw0QkFBd0I7QUFDeEIseUJBQXFCLHNCQUFzQixVQUFVO0FBQ3JELFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxzQkFBc0IsQ0FBQ0Msc0JBQXFCO0FBQzFDLFFBQUkscUJBQXFCO0FBQ3ZCLFlBQU0sSUFBSSxNQUFNLHNDQUFzQztBQUFBLElBQ3hEO0FBQ0EsMEJBQXNCO0FBQ3RCLHlCQUFxQixvQkFBb0JBLGlCQUFnQjtBQUN6RCxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsNEJBQTRCLENBQUMsMkJBQTJCO0FBQ3RELFFBQUksMkJBQTJCO0FBQzdCLFlBQU0sSUFBSSxNQUFNLDZDQUE2QztBQUFBLElBQy9EO0FBQ0EsZ0NBQTRCO0FBQzVCLHlCQUFxQiwwQkFBMEIsc0JBQXNCO0FBQ3JFLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxtQkFBbUIsQ0FBQ0MsbUJBQWtCO0FBQ3BDLFFBQUksa0JBQWtCO0FBQ3BCLFlBQU0sSUFBSSxNQUFNLG1DQUFtQztBQUFBLElBQ3JEO0FBQ0EsUUFBSSwwQkFBMEI7QUFDNUIsWUFBTSxJQUFJLE1BQU0sNERBQTREO0FBQUEsSUFDOUU7QUFFQSx1QkFBbUI7QUFDbkIseUJBQXFCLGlCQUFpQkEsY0FBYTtBQUNuRCxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsZUFBZSxDQUFDLGNBQWM7QUFDNUIsUUFBSSxjQUFjO0FBQ2hCLFlBQU0sSUFBSSxNQUFNLDhCQUE4QjtBQUFBLElBQ2hEO0FBRUEsbUJBQWU7QUFDZix5QkFBcUIsYUFBYSxTQUFTO0FBQzNDLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSx3REFBNEIsS0FBSyxPQUFNQyxZQUFVO0FBQy9DLFNBQU8sTUFBTUEsUUFBTyxLQUFLLGFBQWE7QUFDeEMsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUNaLHVCQUFxQixjQUFjO0FBQ3JDLENBQUMsRUFBRSxNQUFNLENBQUMsVUFBVTtBQUNsQixVQUFRLE1BQU0sb0RBQW9EO0FBQ2xFLFVBQVEsTUFBTSxLQUFLO0FBQ3JCLENBQUM7IiwKICAibmFtZXMiOiBbInN0b3B3b3JkcyIsICJwYWdlIiwgImltcG9ydF9zZGsiLCAiaW1wb3J0X3NkayIsICJjb25maWdTY2hlbWF0aWNzIiwgInRvb2xzUHJvdmlkZXIiLCAibW9kdWxlIl0KfQo=
