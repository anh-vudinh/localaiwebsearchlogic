"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/config.ts
var import_sdk, configSchematics;
var init_config = __esm({
  "../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/config.ts"() {
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
      5
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

// ../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/toolsProvider.ts
async function toolsProvider(ctl) {
  const tools = [];
  const config = ctl.getPluginConfig(configSchematics);
  const searxngUrl = config.get("searxngUrl");
  const defaultPageSize = config.get("defaultPageSize");
  const timeout = config.get("timeout");
  const searchTool = (0, import_sdk2.tool)({
    name: "search_web",
    description: `Search the web using a local SearXNG instance. 
Returns search results with titles, URLs, and snippets.
Use this when you need up-to-date information or specific facts not in your training data.`,
    parameters: {
      query: import_zod.z.string().describe("The search query string"),
      num_results: import_zod.z.number().min(1).max(20).optional().describe(`Number of results to return (1-20). Default: ${defaultPageSize}`),
      time_range: import_zod.z.string().optional().describe("Optional time filter: 'day', 'week', 'month', or 'year'")
    },
    implementation: async (params) => {
      try {
        const { query, num_results, time_range } = params;
        const pageSize = num_results ?? defaultPageSize;
        const searchParams = new URLSearchParams({
          q: query,
          format: "json",
          pageno: "1",
          safesearch: "0"
        });
        if (time_range) {
          const validRanges = ["day", "week", "month", "year"];
          if (validRanges.includes(time_range)) {
            searchParams.append("time_range", time_range);
          } else {
            console.log(`Warning: Invalid time_range "${time_range}" provided. Ignoring.`);
          }
        }
        const searchUrl = `${searxngUrl}/search?${searchParams.toString()}`;
        console.log(`Querying SearXNG: ${searchUrl.replace(/format=json/, "format=...")}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "LM-Studio-Plugin/1.0"
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`SearXNG returned status ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.results || data.results.length === 0) {
          return `No results found for query: "${query}"`;
        }
        const formattedResults = data.results.slice(0, pageSize).map((result, index) => {
          return `[${index + 1}] ${result.title}
URL: ${result.url}
Snippet: ${result.content.substring(0, 300)}${result.content.length > 300 ? "..." : ""}
Source: ${result.engine}`;
        }).join("\n\n");
        return `Search results for "${query}" (${Math.min(data.results.length, pageSize)} of ${data.number_of_results} total):

${formattedResults}

Note: These results are from SearXNG metasearch engine aggregating multiple sources.`;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            return `Error: SearXNG request timed out after ${timeout}ms. Please check if your SearXNG instance is running at ${searxngUrl}`;
          }
          return `Error searching SearXNG: ${error.message}. Please ensure your SearXNG instance is accessible at ${searxngUrl} and has JSON API enabled in settings.yml (search: formats: - json).`;
        }
        return `Unknown error occurred while searching.`;
      }
    }
  });
  const fetchPageTool = (0, import_sdk2.tool)({
    name: "fetch_page_content",
    description: "Fetch and extract text content from a specific URL found in search results.",
    parameters: {
      url: import_zod.z.string().url().describe("The URL to fetch content from"),
      max_length: import_zod.z.number().min(100).max(1e4).optional().describe("Maximum characters to return (default: 2000)")
    },
    implementation: async (params) => {
      try {
        const { url, max_length } = params;
        const maxLength = max_length ?? 2e3;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LM-Studio-Bot/1.0)"
          }
        });
        if (!response.ok) {
          return `Failed to fetch ${url}: ${response.statusText}`;
        }
        const html = await response.text();
        let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (text.length > maxLength) {
          text = text.substring(0, maxLength) + "... [truncated]";
        }
        return `Content from ${url}:

${text}`;
      } catch (error) {
        return `Error fetching page: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
  tools.push(searchTool);
  tools.push(fetchPageTool);
  return tools;
}
var import_sdk2, import_zod;
var init_toolsProvider = __esm({
  "../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/toolsProvider.ts"() {
    "use strict";
    import_sdk2 = require("@lmstudio/sdk");
    import_zod = require("zod");
    init_config();
  }
});

// ../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/index.ts
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
  "../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/src/index.ts"() {
    "use strict";
    init_toolsProvider();
    init_config();
  }
});

// ../../Users/VU-W11/.lmstudio/extensions/plugins/rzk/searxng-search/.lmstudio/entry.ts
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZy50cyIsICIuLi9zcmMvdG9vbHNQcm92aWRlci50cyIsICIuLi9zcmMvaW5kZXgudHMiLCAiZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNyZWF0ZUNvbmZpZ1NjaGVtYXRpY3MgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xyXG5cclxuZXhwb3J0IGNvbnN0IGNvbmZpZ1NjaGVtYXRpY3MgPSBjcmVhdGVDb25maWdTY2hlbWF0aWNzKClcclxuICAuZmllbGQoXHJcbiAgICBcInNlYXJ4bmdVcmxcIixcclxuICAgIFwic3RyaW5nXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIlNlYXJYTkcgVVJMXCIsXHJcbiAgICAgIHN1YnRpdGxlOiBcIkJhc2UgVVJMIG9mIHlvdXIgbG9jYWwgU2VhclhORyBpbnN0YW5jZVwiLFxyXG4gICAgfSxcclxuICAgIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgxXCIgIC8vIERlZmF1bHQgdmFsdWUgYXMgNHRoIHBhcmFtZXRlclxyXG4gIClcclxuICAuZmllbGQoXHJcbiAgICBcImRlZmF1bHRQYWdlU2l6ZVwiLFxyXG4gICAgXCJudW1lcmljXCIsXHJcbiAgICB7XHJcbiAgICAgIGRpc3BsYXlOYW1lOiBcIkRlZmF1bHQgUmVzdWx0cyBDb3VudFwiLFxyXG4gICAgICBzdWJ0aXRsZTogXCJOdW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm4gKDEtMjApXCIsXHJcbiAgICAgIG1pbjogMSxcclxuICAgICAgbWF4OiAyMCxcclxuICAgIH0sXHJcbiAgICA1ICAvLyBEZWZhdWx0IHZhbHVlIGFzIDR0aCBwYXJhbWV0ZXJcclxuICApXHJcbiAgLmZpZWxkKFxyXG4gICAgXCJ0aW1lb3V0XCIsXHJcbiAgICBcIm51bWVyaWNcIixcclxuICAgIHtcclxuICAgICAgZGlzcGxheU5hbWU6IFwiUmVxdWVzdCBUaW1lb3V0IChtcylcIixcclxuICAgICAgc3VidGl0bGU6IFwiVGltZW91dCBmb3IgU2VhclhORyByZXF1ZXN0c1wiLFxyXG4gICAgICBtaW46IDEwMDAsXHJcbiAgICAgIG1heDogNjAwMDAsXHJcbiAgICB9LFxyXG4gICAgMTAwMDAgIC8vIERlZmF1bHQgdmFsdWUgYXMgNHRoIHBhcmFtZXRlclxyXG4gIClcclxuICAuYnVpbGQoKTtcclxuIiwgImltcG9ydCB7IHRvb2wsIFRvb2wsIFRvb2xzUHJvdmlkZXJDb250cm9sbGVyIH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcclxuaW1wb3J0IHsgeiB9IGZyb20gXCJ6b2RcIjtcclxuaW1wb3J0IHsgY29uZmlnU2NoZW1hdGljcyB9IGZyb20gXCIuL2NvbmZpZ1wiO1xyXG5cclxuaW50ZXJmYWNlIFNlYXJYTkdSZXN1bHQge1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgdXJsOiBzdHJpbmc7XHJcbiAgY29udGVudDogc3RyaW5nO1xyXG4gIGVuZ2luZTogc3RyaW5nO1xyXG4gIHNjb3JlPzogbnVtYmVyO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgU2VhclhOR1Jlc3BvbnNlIHtcclxuICBxdWVyeTogc3RyaW5nO1xyXG4gIG51bWJlcl9vZl9yZXN1bHRzOiBudW1iZXI7XHJcbiAgcmVzdWx0czogU2VhclhOR1Jlc3VsdFtdO1xyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdG9vbHNQcm92aWRlcihjdGw6IFRvb2xzUHJvdmlkZXJDb250cm9sbGVyKTogUHJvbWlzZTxUb29sW10+IHtcclxuICBjb25zdCB0b29sczogVG9vbFtdID0gW107XHJcbiAgY29uc3QgY29uZmlnID0gY3RsLmdldFBsdWdpbkNvbmZpZyhjb25maWdTY2hlbWF0aWNzKTtcclxuXHJcbiAgY29uc3Qgc2VhcnhuZ1VybCA9IGNvbmZpZy5nZXQoXCJzZWFyeG5nVXJsXCIpIGFzIHN0cmluZztcclxuICBjb25zdCBkZWZhdWx0UGFnZVNpemUgPSBjb25maWcuZ2V0KFwiZGVmYXVsdFBhZ2VTaXplXCIpIGFzIG51bWJlcjtcclxuICBjb25zdCB0aW1lb3V0ID0gY29uZmlnLmdldChcInRpbWVvdXRcIikgYXMgbnVtYmVyO1xyXG5cclxuICBjb25zdCBzZWFyY2hUb29sID0gdG9vbCh7XHJcbiAgICBuYW1lOiBcInNlYXJjaF93ZWJcIixcclxuICAgIGRlc2NyaXB0aW9uOiBgU2VhcmNoIHRoZSB3ZWIgdXNpbmcgYSBsb2NhbCBTZWFyWE5HIGluc3RhbmNlLiBcclxuUmV0dXJucyBzZWFyY2ggcmVzdWx0cyB3aXRoIHRpdGxlcywgVVJMcywgYW5kIHNuaXBwZXRzLlxyXG5Vc2UgdGhpcyB3aGVuIHlvdSBuZWVkIHVwLXRvLWRhdGUgaW5mb3JtYXRpb24gb3Igc3BlY2lmaWMgZmFjdHMgbm90IGluIHlvdXIgdHJhaW5pbmcgZGF0YS5gLFxyXG4gICAgcGFyYW1ldGVyczoge1xyXG4gICAgICBxdWVyeTogei5zdHJpbmcoKS5kZXNjcmliZShcIlRoZSBzZWFyY2ggcXVlcnkgc3RyaW5nXCIpLFxyXG4gICAgICBudW1fcmVzdWx0czogei5udW1iZXIoKS5taW4oMSkubWF4KDIwKS5vcHRpb25hbCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKGBOdW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm4gKDEtMjApLiBEZWZhdWx0OiAke2RlZmF1bHRQYWdlU2l6ZX1gKSxcclxuICAgICAgdGltZV9yYW5nZTogei5zdHJpbmcoKS5vcHRpb25hbCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKFwiT3B0aW9uYWwgdGltZSBmaWx0ZXI6ICdkYXknLCAnd2VlaycsICdtb250aCcsIG9yICd5ZWFyJ1wiKVxyXG4gICAgfSxcclxuICAgIGltcGxlbWVudGF0aW9uOiBhc3luYyAocGFyYW1zOiB7IHF1ZXJ5OiBzdHJpbmc7IG51bV9yZXN1bHRzPzogbnVtYmVyOyB0aW1lX3JhbmdlPzogc3RyaW5nIH0pID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBudW1fcmVzdWx0cywgdGltZV9yYW5nZSB9ID0gcGFyYW1zO1xyXG4gICAgICAgIGNvbnN0IHBhZ2VTaXplID0gbnVtX3Jlc3VsdHMgPz8gZGVmYXVsdFBhZ2VTaXplO1xyXG5cclxuICAgICAgICAvLyBCdWlsZCBTZWFyWE5HIEFQSSBVUkwgd2l0aCBKU09OIGZvcm1hdFxyXG4gICAgICAgIGNvbnN0IHNlYXJjaFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICAgICAgcTogcXVlcnksXHJcbiAgICAgICAgICBmb3JtYXQ6IFwianNvblwiLFxyXG4gICAgICAgICAgcGFnZW5vOiBcIjFcIixcclxuICAgICAgICAgIHNhZmVzZWFyY2g6IFwiMFwiXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFZhbGlkYXRlIGFuZCBhZGQgdGltZSByYW5nZSBpZiBzcGVjaWZpZWRcclxuICAgICAgICBpZiAodGltZV9yYW5nZSkge1xyXG4gICAgICAgICAgY29uc3QgdmFsaWRSYW5nZXMgPSBbXCJkYXlcIiwgXCJ3ZWVrXCIsIFwibW9udGhcIiwgXCJ5ZWFyXCJdO1xyXG4gICAgICAgICAgaWYgKHZhbGlkUmFuZ2VzLmluY2x1ZGVzKHRpbWVfcmFuZ2UpKSB7XHJcbiAgICAgICAgICAgIHNlYXJjaFBhcmFtcy5hcHBlbmQoXCJ0aW1lX3JhbmdlXCIsIHRpbWVfcmFuZ2UpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFdhcm5pbmc6IEludmFsaWQgdGltZV9yYW5nZSBcIiR7dGltZV9yYW5nZX1cIiBwcm92aWRlZC4gSWdub3JpbmcuYCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzZWFyY2hVcmwgPSBgJHtzZWFyeG5nVXJsfS9zZWFyY2g/JHtzZWFyY2hQYXJhbXMudG9TdHJpbmcoKX1gO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhgUXVlcnlpbmcgU2VhclhORzogJHtzZWFyY2hVcmwucmVwbGFjZSgvZm9ybWF0PWpzb24vLCBcImZvcm1hdD0uLi5cIil9YCk7XHJcblxyXG4gICAgICAgIC8vIEV4ZWN1dGUgc2VhcmNoIHdpdGggdGltZW91dFxyXG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcbiAgICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRpbWVvdXQpO1xyXG5cclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNlYXJjaFVybCwge1xyXG4gICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICBcIkFjY2VwdFwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcclxuICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6IFwiTE0tU3R1ZGlvLVBsdWdpbi8xLjBcIlxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcblxyXG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU2VhclhORyByZXR1cm5lZCBzdGF0dXMgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkYXRhOiBTZWFyWE5HUmVzcG9uc2UgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcblxyXG4gICAgICAgIGlmICghZGF0YS5yZXN1bHRzIHx8IGRhdGEucmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiBgTm8gcmVzdWx0cyBmb3VuZCBmb3IgcXVlcnk6IFwiJHtxdWVyeX1cImA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGb3JtYXQgcmVzdWx0cyBmb3IgdGhlIExMTVxyXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3VsdHMgPSBkYXRhLnJlc3VsdHNcclxuICAgICAgICAgIC5zbGljZSgwLCBwYWdlU2l6ZSlcclxuICAgICAgICAgIC5tYXAoKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIGBbJHtpbmRleCArIDF9XSAke3Jlc3VsdC50aXRsZX1cclxuVVJMOiAke3Jlc3VsdC51cmx9XHJcblNuaXBwZXQ6ICR7cmVzdWx0LmNvbnRlbnQuc3Vic3RyaW5nKDAsIDMwMCl9JHtyZXN1bHQuY29udGVudC5sZW5ndGggPiAzMDAgPyAnLi4uJyA6ICcnfVxyXG5Tb3VyY2U6ICR7cmVzdWx0LmVuZ2luZX1gO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIC5qb2luKFwiXFxuXFxuXCIpO1xyXG5cclxuICAgICAgICByZXR1cm4gYFNlYXJjaCByZXN1bHRzIGZvciBcIiR7cXVlcnl9XCIgKCR7TWF0aC5taW4oZGF0YS5yZXN1bHRzLmxlbmd0aCwgcGFnZVNpemUpfSBvZiAke2RhdGEubnVtYmVyX29mX3Jlc3VsdHN9IHRvdGFsKTpcclxuXHJcbiR7Zm9ybWF0dGVkUmVzdWx0c31cclxuXHJcbk5vdGU6IFRoZXNlIHJlc3VsdHMgYXJlIGZyb20gU2VhclhORyBtZXRhc2VhcmNoIGVuZ2luZSBhZ2dyZWdhdGluZyBtdWx0aXBsZSBzb3VyY2VzLmA7XHJcblxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PT0gXCJBYm9ydEVycm9yXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGBFcnJvcjogU2VhclhORyByZXF1ZXN0IHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXR9bXMuIFBsZWFzZSBjaGVjayBpZiB5b3VyIFNlYXJYTkcgaW5zdGFuY2UgaXMgcnVubmluZyBhdCAke3NlYXJ4bmdVcmx9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBgRXJyb3Igc2VhcmNoaW5nIFNlYXJYTkc6ICR7ZXJyb3IubWVzc2FnZX0uIFBsZWFzZSBlbnN1cmUgeW91ciBTZWFyWE5HIGluc3RhbmNlIGlzIGFjY2Vzc2libGUgYXQgJHtzZWFyeG5nVXJsfSBhbmQgaGFzIEpTT04gQVBJIGVuYWJsZWQgaW4gc2V0dGluZ3MueW1sIChzZWFyY2g6IGZvcm1hdHM6IC0ganNvbikuYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGBVbmtub3duIGVycm9yIG9jY3VycmVkIHdoaWxlIHNlYXJjaGluZy5gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGZldGNoUGFnZVRvb2wgPSB0b29sKHtcclxuICAgIG5hbWU6IFwiZmV0Y2hfcGFnZV9jb250ZW50XCIsXHJcbiAgICBkZXNjcmlwdGlvbjogXCJGZXRjaCBhbmQgZXh0cmFjdCB0ZXh0IGNvbnRlbnQgZnJvbSBhIHNwZWNpZmljIFVSTCBmb3VuZCBpbiBzZWFyY2ggcmVzdWx0cy5cIixcclxuICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgdXJsOiB6LnN0cmluZygpLnVybCgpLmRlc2NyaWJlKFwiVGhlIFVSTCB0byBmZXRjaCBjb250ZW50IGZyb21cIiksXHJcbiAgICAgIG1heF9sZW5ndGg6IHoubnVtYmVyKCkubWluKDEwMCkubWF4KDEwMDAwKS5vcHRpb25hbCgpXHJcbiAgICAgICAgLmRlc2NyaWJlKFwiTWF4aW11bSBjaGFyYWN0ZXJzIHRvIHJldHVybiAoZGVmYXVsdDogMjAwMClcIilcclxuICAgIH0sXHJcbiAgICBpbXBsZW1lbnRhdGlvbjogYXN5bmMgKHBhcmFtczogeyB1cmw6IHN0cmluZzsgbWF4X2xlbmd0aD86IG51bWJlciB9KSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgeyB1cmwsIG1heF9sZW5ndGggfSA9IHBhcmFtcztcclxuICAgICAgICBjb25zdCBtYXhMZW5ndGggPSBtYXhfbGVuZ3RoID8/IDIwMDA7XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgIFwiVXNlci1BZ2VudFwiOiBcIk1vemlsbGEvNS4wIChjb21wYXRpYmxlOyBMTS1TdHVkaW8tQm90LzEuMClcIlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICByZXR1cm4gYEZhaWxlZCB0byBmZXRjaCAke3VybH06ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuXHJcbiAgICAgICAgLy8gU2ltcGxlIEhUTUwgdG8gdGV4dCBleHRyYWN0aW9uXHJcbiAgICAgICAgbGV0IHRleHQgPSBodG1sXHJcbiAgICAgICAgICAucmVwbGFjZSgvPHNjcmlwdFxcYltePF0qKD86KD8hPFxcL3NjcmlwdD4pPFtePF0qKSo8XFwvc2NyaXB0Pi9naSwgJycpXHJcbiAgICAgICAgICAucmVwbGFjZSgvPHN0eWxlXFxiW148XSooPzooPyE8XFwvc3R5bGU+KTxbXjxdKikqPFxcL3N0eWxlPi9naSwgJycpXHJcbiAgICAgICAgICAucmVwbGFjZSgvPFtePl0rPi9nLCAnICcpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgICAgICAudHJpbSgpO1xyXG5cclxuICAgICAgICAvLyBMaW1pdCBsZW5ndGhcclxuICAgICAgICBpZiAodGV4dC5sZW5ndGggPiBtYXhMZW5ndGgpIHtcclxuICAgICAgICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCBtYXhMZW5ndGgpICsgXCIuLi4gW3RydW5jYXRlZF1cIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBgQ29udGVudCBmcm9tICR7dXJsfTpcXG5cXG4ke3RleHR9YDtcclxuXHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgcmV0dXJuIGBFcnJvciBmZXRjaGluZyBwYWdlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHRvb2xzLnB1c2goc2VhcmNoVG9vbCk7XHJcbiAgdG9vbHMucHVzaChmZXRjaFBhZ2VUb29sKTtcclxuXHJcbiAgcmV0dXJuIHRvb2xzO1xyXG59XHJcbiIsICJpbXBvcnQgeyBQbHVnaW5Db250ZXh0IH0gZnJvbSBcIkBsbXN0dWRpby9zZGtcIjtcclxuaW1wb3J0IHsgdG9vbHNQcm92aWRlciB9IGZyb20gXCIuL3Rvb2xzUHJvdmlkZXJcIjtcclxuaW1wb3J0IHsgY29uZmlnU2NoZW1hdGljcyB9IGZyb20gXCIuL2NvbmZpZ1wiO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oY29udGV4dDogUGx1Z2luQ29udGV4dCkge1xyXG4gIC8vIFJlZ2lzdGVyIGNvbmZpZ3VyYXRpb24gc2NoZW1hdGljc1xyXG4gIGNvbnRleHQud2l0aENvbmZpZ1NjaGVtYXRpY3MoY29uZmlnU2NoZW1hdGljcyk7XHJcblxyXG4gIC8vIFJlZ2lzdGVyIHRoZSB0b29scyBwcm92aWRlclxyXG4gIGNvbnRleHQud2l0aFRvb2xzUHJvdmlkZXIodG9vbHNQcm92aWRlcik7XHJcblxyXG4gIC8vIFVzZSBjb25zb2xlLmxvZyBpbnN0ZWFkIG9mIGNvbnRleHQubG9nXHJcbiAgY29uc29sZS5sb2coXCJTZWFyWE5HIFNlYXJjaCBQbHVnaW4gaW5pdGlhbGl6ZWRcIik7XHJcbn1cclxuIiwgImltcG9ydCB7IExNU3R1ZGlvQ2xpZW50LCB0eXBlIFBsdWdpbkNvbnRleHQgfSBmcm9tIFwiQGxtc3R1ZGlvL3Nka1wiO1xuXG5kZWNsYXJlIHZhciBwcm9jZXNzOiBhbnk7XG5cbi8vIFdlIHJlY2VpdmUgcnVudGltZSBpbmZvcm1hdGlvbiBpbiB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuY29uc3QgY2xpZW50SWRlbnRpZmllciA9IHByb2Nlc3MuZW52LkxNU19QTFVHSU5fQ0xJRU5UX0lERU5USUZJRVI7XG5jb25zdCBjbGllbnRQYXNza2V5ID0gcHJvY2Vzcy5lbnYuTE1TX1BMVUdJTl9DTElFTlRfUEFTU0tFWTtcbmNvbnN0IGJhc2VVcmwgPSBwcm9jZXNzLmVudi5MTVNfUExVR0lOX0JBU0VfVVJMO1xuXG5jb25zdCBjbGllbnQgPSBuZXcgTE1TdHVkaW9DbGllbnQoe1xuICBjbGllbnRJZGVudGlmaWVyLFxuICBjbGllbnRQYXNza2V5LFxuICBiYXNlVXJsLFxufSk7XG5cbihnbG9iYWxUaGlzIGFzIGFueSkuX19MTVNfUExVR0lOX0NPTlRFWFQgPSB0cnVlO1xuXG5sZXQgcHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0ID0gZmFsc2U7XG5sZXQgcHJvbXB0UHJlcHJvY2Vzc29yU2V0ID0gZmFsc2U7XG5sZXQgY29uZmlnU2NoZW1hdGljc1NldCA9IGZhbHNlO1xubGV0IGdsb2JhbENvbmZpZ1NjaGVtYXRpY3NTZXQgPSBmYWxzZTtcbmxldCB0b29sc1Byb3ZpZGVyU2V0ID0gZmFsc2U7XG5sZXQgZ2VuZXJhdG9yU2V0ID0gZmFsc2U7XG5cbmNvbnN0IHNlbGZSZWdpc3RyYXRpb25Ib3N0ID0gY2xpZW50LnBsdWdpbnMuZ2V0U2VsZlJlZ2lzdHJhdGlvbkhvc3QoKTtcblxuY29uc3QgcGx1Z2luQ29udGV4dDogUGx1Z2luQ29udGV4dCA9IHtcbiAgd2l0aFByZWRpY3Rpb25Mb29wSGFuZGxlcjogKGdlbmVyYXRlKSA9PiB7XG4gICAgaWYgKHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJlZGljdGlvbkxvb3BIYW5kbGVyIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKHRvb2xzUHJvdmlkZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByZWRpY3Rpb25Mb29wSGFuZGxlciBjYW5ub3QgYmUgdXNlZCB3aXRoIGEgdG9vbHMgcHJvdmlkZXJcIik7XG4gICAgfVxuXG4gICAgcHJlZGljdGlvbkxvb3BIYW5kbGVyU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRQcmVkaWN0aW9uTG9vcEhhbmRsZXIoZ2VuZXJhdGUpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoUHJvbXB0UHJlcHJvY2Vzc29yOiAocHJlcHJvY2VzcykgPT4ge1xuICAgIGlmIChwcm9tcHRQcmVwcm9jZXNzb3JTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb21wdFByZXByb2Nlc3NvciBhbHJlYWR5IHJlZ2lzdGVyZWRcIik7XG4gICAgfVxuICAgIHByb21wdFByZXByb2Nlc3NvclNldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0UHJvbXB0UHJlcHJvY2Vzc29yKHByZXByb2Nlc3MpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoQ29uZmlnU2NoZW1hdGljczogKGNvbmZpZ1NjaGVtYXRpY3MpID0+IHtcbiAgICBpZiAoY29uZmlnU2NoZW1hdGljc1NldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29uZmlnIHNjaGVtYXRpY3MgYWxyZWFkeSByZWdpc3RlcmVkXCIpO1xuICAgIH1cbiAgICBjb25maWdTY2hlbWF0aWNzU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRDb25maWdTY2hlbWF0aWNzKGNvbmZpZ1NjaGVtYXRpY3MpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoR2xvYmFsQ29uZmlnU2NoZW1hdGljczogKGdsb2JhbENvbmZpZ1NjaGVtYXRpY3MpID0+IHtcbiAgICBpZiAoZ2xvYmFsQ29uZmlnU2NoZW1hdGljc1NldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2xvYmFsIGNvbmZpZyBzY2hlbWF0aWNzIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgZ2xvYmFsQ29uZmlnU2NoZW1hdGljc1NldCA9IHRydWU7XG4gICAgc2VsZlJlZ2lzdHJhdGlvbkhvc3Quc2V0R2xvYmFsQ29uZmlnU2NoZW1hdGljcyhnbG9iYWxDb25maWdTY2hlbWF0aWNzKTtcbiAgICByZXR1cm4gcGx1Z2luQ29udGV4dDtcbiAgfSxcbiAgd2l0aFRvb2xzUHJvdmlkZXI6ICh0b29sc1Byb3ZpZGVyKSA9PiB7XG4gICAgaWYgKHRvb2xzUHJvdmlkZXJTZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvb2xzIHByb3ZpZGVyIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG4gICAgaWYgKHByZWRpY3Rpb25Mb29wSGFuZGxlclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vbHMgcHJvdmlkZXIgY2Fubm90IGJlIHVzZWQgd2l0aCBhIHByZWRpY3Rpb25Mb29wSGFuZGxlclwiKTtcbiAgICB9XG5cbiAgICB0b29sc1Byb3ZpZGVyU2V0ID0gdHJ1ZTtcbiAgICBzZWxmUmVnaXN0cmF0aW9uSG9zdC5zZXRUb29sc1Byb3ZpZGVyKHRvb2xzUHJvdmlkZXIpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxuICB3aXRoR2VuZXJhdG9yOiAoZ2VuZXJhdG9yKSA9PiB7XG4gICAgaWYgKGdlbmVyYXRvclNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2VuZXJhdG9yIGFscmVhZHkgcmVnaXN0ZXJlZFwiKTtcbiAgICB9XG5cbiAgICBnZW5lcmF0b3JTZXQgPSB0cnVlO1xuICAgIHNlbGZSZWdpc3RyYXRpb25Ib3N0LnNldEdlbmVyYXRvcihnZW5lcmF0b3IpO1xuICAgIHJldHVybiBwbHVnaW5Db250ZXh0O1xuICB9LFxufTtcblxuaW1wb3J0KFwiLi8uLi9zcmMvaW5kZXgudHNcIikudGhlbihhc3luYyBtb2R1bGUgPT4ge1xuICByZXR1cm4gYXdhaXQgbW9kdWxlLm1haW4ocGx1Z2luQ29udGV4dCk7XG59KS50aGVuKCgpID0+IHtcbiAgc2VsZlJlZ2lzdHJhdGlvbkhvc3QuaW5pdENvbXBsZXRlZCgpO1xufSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gZXhlY3V0ZSB0aGUgbWFpbiBmdW5jdGlvbiBvZiB0aGUgcGx1Z2luLlwiKTtcbiAgY29uc29sZS5lcnJvcihlcnJvcik7XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7OztBQUFBLGdCQUVhO0FBRmI7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBRWhDLElBQU0sdUJBQW1CLG1DQUF1QixFQUNwRDtBQUFBLE1BQ0M7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUE7QUFBQSxJQUNGLEVBQ0M7QUFBQSxNQUNDO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxRQUNFLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFDQztBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsUUFDRSxhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQTtBQUFBLElBQ0YsRUFDQyxNQUFNO0FBQUE7QUFBQTs7O0FDaEJULGVBQXNCLGNBQWMsS0FBK0M7QUFDakYsUUFBTSxRQUFnQixDQUFDO0FBQ3ZCLFFBQU0sU0FBUyxJQUFJLGdCQUFnQixnQkFBZ0I7QUFFbkQsUUFBTSxhQUFhLE9BQU8sSUFBSSxZQUFZO0FBQzFDLFFBQU0sa0JBQWtCLE9BQU8sSUFBSSxpQkFBaUI7QUFD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
