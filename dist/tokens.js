"use strict";
// Better token estimation using BPE-style approximation
// More accurate than simple chars/4
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokens = estimateTokens;
exports.estimateMessagesTokens = estimateMessagesTokens;
exports.formatTokens = formatTokens;
const tokenCache = new Map();
function estimateTokens(text) {
    if (tokenCache.has(text)) {
        return tokenCache.get(text);
    }
    let tokens = 0;
    // Split on whitespace and punctuation
    const words = text.split(/\s+/);
    for (const word of words) {
        if (!word)
            continue;
        // Code-like patterns (camelCase, snake_case, etc.) have higher token density
        const isCode = /[_\-.]/.test(word) || /[a-z][A-Z]/.test(word);
        if (isCode) {
            // Code tokens: ~1 token per 3 chars
            tokens += Math.ceil(word.length / 3);
        }
        else if (word.length <= 4) {
            // Short words: usually 1 token
            tokens += 1;
        }
        else {
            // Regular words: ~1.3 tokens per word on average
            tokens += Math.ceil(word.length / 4);
        }
    }
    // Add tokens for special characters and punctuation
    const specialChars = text.match(/[^\w\s]/g);
    if (specialChars) {
        tokens += Math.ceil(specialChars.length / 2);
    }
    // Cache the result
    if (tokenCache.size > 1000) {
        // Clear cache if it gets too large
        tokenCache.clear();
    }
    tokenCache.set(text, tokens);
    return tokens;
}
function estimateMessagesTokens(messages) {
    return messages.reduce((acc, m) => {
        const content = typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content || "");
        return acc + estimateTokens(content);
    }, 0);
}
function formatTokens(n) {
    if (n >= 1000000)
        return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)
        return (n / 1000).toFixed(1) + "k";
    return String(n);
}
