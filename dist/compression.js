"use strict";
// Context Compression System
// Auto-summarize old messages to save tokens when context grows
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCompressor = void 0;
exports.createCompressor = createCompressor;
exports.compressIfNeeded = compressIfNeeded;
class ContextCompressor {
    constructor(options = {}) {
        this.options = options;
        this.defaultOptions = {
            maxTokens: 150000, // Start compressing at 150k tokens
            targetTokens: 100000, // Compress down to 100k tokens
            preserveRecent: 10, // Keep last 10 messages intact
            summaryModel: "kr/claude-haiku-4.5", // Use fast model for summaries
        };
        this.options = { ...this.defaultOptions, ...options };
    }
    /**
     * Check if messages need compression
     */
    needsCompression(messages) {
        const tokens = this.estimateTokens(messages);
        return tokens > this.options.maxTokens;
    }
    /**
     * Compress messages by summarizing old ones
     */
    async compress(messages, provider) {
        const originalTokens = this.estimateTokens(messages);
        if (originalTokens <= this.options.maxTokens) {
            return {
                compressed: messages,
                originalTokens,
                compressedTokens: originalTokens,
                savings: 0,
                summaryCount: 0,
            };
        }
        const preserveRecent = this.options.preserveRecent;
        const targetTokens = this.options.targetTokens;
        // Split messages into old (to compress) and recent (to preserve)
        const recentMessages = messages.slice(-preserveRecent);
        const oldMessages = messages.slice(0, -preserveRecent);
        // Always preserve system messages
        const systemMessages = oldMessages.filter(m => m.role === "system");
        const nonSystemMessages = oldMessages.filter(m => m.role !== "system");
        // Compress old messages in chunks
        const summaries = [];
        let summaryCount = 0;
        // Group messages into conversation chunks (user + assistant pairs)
        const chunks = this.groupIntoChunks(nonSystemMessages);
        for (const chunk of chunks) {
            const chunkTokens = this.estimateTokens(chunk);
            // If chunk is small enough, keep it as-is
            if (chunkTokens < 1000) {
                summaries.push(...chunk);
                continue;
            }
            // Otherwise, summarize the chunk
            const summary = await this.summarizeChunk(chunk, provider);
            summaries.push({
                role: "user",
                content: `[Previous conversation summary: ${summary}]`,
            });
            summaryCount++;
        }
        // Combine: system messages + summaries + recent messages
        const compressed = [...systemMessages, ...summaries, ...recentMessages];
        const compressedTokens = this.estimateTokens(compressed);
        return {
            compressed,
            originalTokens,
            compressedTokens,
            savings: originalTokens - compressedTokens,
            summaryCount,
        };
    }
    /**
     * Group messages into conversation chunks
     */
    groupIntoChunks(messages) {
        const chunks = [];
        let currentChunk = [];
        for (const msg of messages) {
            currentChunk.push(msg);
            // End chunk after assistant response
            if (msg.role === "assistant") {
                chunks.push(currentChunk);
                currentChunk = [];
            }
        }
        // Add remaining messages
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    /**
     * Summarize a chunk of messages
     */
    async summarizeChunk(chunk, provider) {
        // If no provider, use simple extraction
        if (!provider) {
            return this.extractKeySummary(chunk);
        }
        // Use AI to create a concise summary
        const conversation = chunk
            .map(m => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
            .join("\n\n");
        try {
            const response = await provider.call([
                {
                    role: "system",
                    content: "Summarize the following conversation in 2-3 sentences, preserving key decisions, actions, and context.",
                },
                {
                    role: "user",
                    content: conversation,
                },
            ], {
                model: this.options.summaryModel,
                max_tokens: 200,
                temperature: 0.3,
            });
            return response.content || this.extractKeySummary(chunk);
        }
        catch (error) {
            // Fallback to simple extraction
            return this.extractKeySummary(chunk);
        }
    }
    /**
     * Extract key information without AI (fallback)
     */
    extractKeySummary(chunk) {
        const parts = [];
        for (const msg of chunk) {
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            // Extract first sentence or first 100 chars
            const firstSentence = content.match(/^[^.!?]+[.!?]/)?.[0] || content.slice(0, 100);
            parts.push(`${msg.role}: ${firstSentence}`);
        }
        return parts.join("; ");
    }
    /**
     * Estimate token count (rough approximation)
     * 1 token ≈ 4 characters for English text
     */
    estimateTokens(messages) {
        let total = 0;
        for (const msg of messages) {
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            total += Math.ceil(content.length / 4);
            // Add tokens for tool calls
            if (msg.tool_calls) {
                total += Math.ceil(JSON.stringify(msg.tool_calls).length / 4);
            }
        }
        return total;
    }
    /**
     * Get compression statistics
     */
    getStats(messages) {
        const totalTokens = this.estimateTokens(messages);
        const threshold = this.options.maxTokens;
        return {
            totalTokens,
            needsCompression: totalTokens > threshold,
            compressionThreshold: threshold,
            utilizationPercent: Math.round((totalTokens / threshold) * 100),
        };
    }
    /**
     * Smart compression - only compress what's needed
     */
    async smartCompress(messages, provider) {
        const stats = this.getStats(messages);
        if (!stats.needsCompression) {
            return messages;
        }
        const result = await this.compress(messages, provider);
        console.log(`[Compression] ${result.originalTokens} → ${result.compressedTokens} tokens (${Math.round((result.savings / result.originalTokens) * 100)}% saved, ${result.summaryCount} summaries)`);
        return result.compressed;
    }
}
exports.ContextCompressor = ContextCompressor;
/**
 * Create a context compressor with default settings
 */
function createCompressor(options) {
    return new ContextCompressor(options);
}
/**
 * Quick compression helper
 */
async function compressIfNeeded(messages, provider, options) {
    const compressor = createCompressor(options);
    return compressor.smartCompress(messages, provider);
}
