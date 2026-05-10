"use strict";
// Web skill - web search, fetch, and scraping
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSkill = void 0;
async function handleSearch(args) {
    const query = args.join(" ");
    if (!query) {
        return { success: false, message: "Usage: /search <query>" };
    }
    try {
        // Use DuckDuckGo HTML search (no API key needed)
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        const html = await response.text();
        // Simple parsing of DuckDuckGo results
        const results = parseSearchResults(html);
        return {
            success: true,
            message: `Found ${results.length} results for: ${query}`,
            data: { query, results: results.slice(0, 10) },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
            error: String(error),
        };
    }
}
async function handleFetch(args) {
    const url = args[0];
    if (!url) {
        return { success: false, message: "Usage: /fetch <url>" };
    }
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        if (!response.ok) {
            return {
                success: false,
                message: `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const json = await response.json();
            return {
                success: true,
                message: `Fetched JSON from: ${url}`,
                data: { url, contentType, content: json },
            };
        }
        else if (contentType.includes("text/html")) {
            const html = await response.text();
            const text = extractTextFromHTML(html);
            return {
                success: true,
                message: `Fetched HTML from: ${url}`,
                data: { url, contentType, content: text.slice(0, 5000) },
            };
        }
        else {
            const text = await response.text();
            return {
                success: true,
                message: `Fetched content from: ${url}`,
                data: { url, contentType, content: text.slice(0, 5000) },
            };
        }
    }
    catch (error) {
        return {
            success: false,
            message: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
            error: String(error),
        };
    }
}
async function handleScrape(args) {
    const url = args[0];
    const selector = args.slice(1).join(" ");
    if (!url || !selector) {
        return { success: false, message: "Usage: /scrape <url> <selector>" };
    }
    try {
        const response = await fetch(url);
        const html = await response.text();
        // Simple CSS selector matching (basic implementation)
        const matches = simpleQuerySelector(html, selector);
        return {
            success: true,
            message: `Scraped ${matches.length} elements from: ${url}`,
            data: { url, selector, matches },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Scrape failed: ${error instanceof Error ? error.message : String(error)}`,
            error: String(error),
        };
    }
}
function parseSearchResults(html) {
    const results = [];
    // Simple regex-based parsing (not perfect but works for basic cases)
    const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g;
    let match;
    const urls = [];
    const titles = [];
    while ((match = resultRegex.exec(html)) !== null) {
        urls.push(match[1]);
        titles.push(match[2]);
    }
    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1]);
    }
    for (let i = 0; i < Math.min(urls.length, titles.length); i++) {
        results.push({
            url: urls[i],
            title: titles[i],
            snippet: snippets[i] || "",
        });
    }
    return results;
}
function extractTextFromHTML(html) {
    // Remove scripts and styles
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, " ");
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();
    return text;
}
function simpleQuerySelector(html, selector) {
    const matches = [];
    // Very basic selector support (class and id only)
    if (selector.startsWith(".")) {
        const className = selector.slice(1);
        const regex = new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\/[^>]+>`, "g");
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1].replace(/<[^>]+>/g, "").trim());
        }
    }
    else if (selector.startsWith("#")) {
        const id = selector.slice(1);
        const regex = new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\/[^>]+>`, "g");
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1].replace(/<[^>]+>/g, "").trim());
        }
    }
    else {
        // Tag selector
        const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\/${selector}>`, "g");
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1].replace(/<[^>]+>/g, "").trim());
        }
    }
    return matches;
}
exports.webSkill = {
    name: "web",
    description: "Web operations: search, fetch, scrape",
    usage: "/search <query>, /fetch <url>, /scrape <url> <selector>",
    trigger: /^\/(search|fetch|scrape|web)/,
    async execute(context) {
        const { input, args } = context;
        try {
            if (input.startsWith("/search")) {
                return await handleSearch(args);
            }
            else if (input.startsWith("/fetch")) {
                return await handleFetch(args);
            }
            else if (input.startsWith("/scrape")) {
                return await handleScrape(args);
            }
            return {
                success: false,
                message: "Unknown web command. Use: /search, /fetch, /scrape",
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Web operation failed: ${error instanceof Error ? error.message : String(error)}`,
                error: String(error),
            };
        }
    },
};
