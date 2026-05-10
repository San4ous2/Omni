"use strict";
// OmniRoute provider implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmniRouteProvider = void 0;
const providers_1 = require("../providers");
class OmniRouteProvider extends providers_1.Provider {
    constructor() {
        super(...arguments);
        this.name = "omniroute";
        this.supportsTools = true;
        this.supportsStreaming = true;
    }
    async call(messages, options) {
        // Use streaming if enabled and callback provided
        if (options.stream && options.onToken) {
            return this.callWithStreaming(messages, options);
        }
        try {
            const response = await fetch(`${this.config.url}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiKey || "any"}`,
                },
                body: JSON.stringify({
                    model: options.model,
                    messages: this.prepareMessages(messages),
                    tools: this.prepareTools(options.tools),
                    tool_choice: options.tool_choice || "auto",
                    max_tokens: options.max_tokens || 8192,
                    temperature: options.temperature,
                    stream: false,
                }),
            });
            const rawText = await response.text();
            // Handle SSE format
            if (rawText.trimStart().startsWith("data:")) {
                return this.parseSSE(rawText);
            }
            // Handle rate limiting and retries
            if (!response.ok) {
                const resetMatch = rawText.match(/reset after (\d+)s/i);
                if (resetMatch || response.status >= 500) {
                    throw new providers_1.ProviderError(`API error: ${response.status} - ${rawText.slice(0, 200)}`, this.name, response.status, { canRetry: true, retryAfter: resetMatch ? parseInt(resetMatch[1]) : 2 });
                }
                throw new providers_1.ProviderError(`API error: ${response.status} - ${rawText.slice(0, 200)}`, this.name, response.status);
            }
            // Parse JSON response
            try {
                const data = JSON.parse(rawText);
                const choice = data.choices?.[0];
                if (!choice) {
                    throw new providers_1.ProviderError("Empty API response", this.name);
                }
                return {
                    role: "assistant",
                    content: choice.message.content,
                    tool_calls: choice.message.tool_calls,
                    finish_reason: choice.finish_reason || "stop",
                };
            }
            catch (e) {
                throw new providers_1.ProviderError(`Failed to parse response: ${rawText.slice(0, 150)}`, this.name, undefined, e);
            }
        }
        catch (error) {
            if (error instanceof providers_1.ProviderError)
                throw error;
            throw new providers_1.ProviderError(`Network error: ${error instanceof Error ? error.message : String(error)}`, this.name, undefined, error);
        }
    }
    async callWithStreaming(messages, options) {
        const response = await fetch(`${this.config.url}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiKey || "any"}`,
            },
            body: JSON.stringify({
                model: options.model,
                messages: this.prepareMessages(messages),
                tools: this.prepareTools(options.tools),
                tool_choice: options.tool_choice || "auto",
                max_tokens: options.max_tokens || 8192,
                temperature: options.temperature,
                stream: true,
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new providers_1.ProviderError(`API error: ${response.status} - ${text.slice(0, 200)}`, this.name, response.status);
        }
        let content = "";
        const toolCalls = [];
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
            throw new providers_1.ProviderError("No response body", this.name);
        }
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter(l => l.trim().startsWith("data:"));
                for (const line of lines) {
                    const json = line.replace(/^data:\s*/, "").trim();
                    if (json === "[DONE]")
                        break;
                    if (!json)
                        continue;
                    try {
                        const data = JSON.parse(json);
                        const delta = data.choices?.[0]?.delta;
                        if (!delta)
                            continue;
                        if (delta.content) {
                            content += delta.content;
                            options.onToken?.(delta.content);
                        }
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const i = tc.index ?? 0;
                                if (!toolCalls[i]) {
                                    toolCalls[i] = { id: "", type: "function", function: { name: "", arguments: "" } };
                                }
                                if (tc.id)
                                    toolCalls[i].id = tc.id;
                                if (tc.function?.name)
                                    toolCalls[i].function.name += tc.function.name;
                                if (tc.function?.arguments)
                                    toolCalls[i].function.arguments += tc.function.arguments;
                            }
                        }
                    }
                    catch (e) {
                        // Skip malformed chunks
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
        return {
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.length ? toolCalls : undefined,
            finish_reason: "stop",
        };
    }
    parseSSE(raw) {
        let content = "";
        const toolCalls = [];
        for (const line of raw.split("\n").filter(l => l.startsWith("data:"))) {
            const json = line.slice(5).trim();
            if (json === "[DONE]")
                break;
            try {
                const delta = JSON.parse(json).choices?.[0]?.delta;
                if (!delta)
                    continue;
                if (delta.content)
                    content += delta.content;
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const i = tc.index ?? 0;
                        if (!toolCalls[i]) {
                            toolCalls[i] = { id: "", type: "function", function: { name: "", arguments: "" } };
                        }
                        if (tc.id)
                            toolCalls[i].id = tc.id;
                        if (tc.function?.name)
                            toolCalls[i].function.name += tc.function.name;
                        if (tc.function?.arguments)
                            toolCalls[i].function.arguments += tc.function.arguments;
                    }
                }
            }
            catch (e) {
                // Skip malformed SSE chunks
            }
        }
        return {
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.length ? toolCalls : undefined,
            finish_reason: "stop",
        };
    }
    async listModels() {
        try {
            const response = await fetch(`${this.config.url}/models`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${this.config.apiKey || "any"}` },
                signal: AbortSignal.timeout(5000),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    return data.data.map((m) => m.id);
                }
            }
        }
        catch (e) {
            // Fall back to configured models
        }
        return this.config.models;
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.config.url}/models`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${this.config.apiKey || "any"}` },
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * Prepare messages with prompt caching
     * Adds cache_control to system messages and tool definitions for 90% cost reduction
     */
    prepareMessages(messages) {
        // Clone messages to avoid mutating originals
        const prepared = messages.map(m => ({ ...m }));
        // Add cache_control to the last system message (if any)
        // This caches the system prompt across requests
        for (let i = prepared.length - 1; i >= 0; i--) {
            if (prepared[i].role === "system") {
                prepared[i].cache_control = { type: "ephemeral" };
                break;
            }
        }
        // Also cache the last few user messages to preserve context
        // This is useful for long conversations
        let userMessageCount = 0;
        for (let i = prepared.length - 1; i >= 0; i--) {
            if (prepared[i].role === "user") {
                userMessageCount++;
                // Cache the 3rd-to-last user message to preserve context window
                if (userMessageCount === 3) {
                    prepared[i].cache_control = { type: "ephemeral" };
                    break;
                }
            }
        }
        return prepared;
    }
    /**
     * Prepare tools with prompt caching
     * Adds cache_control to the tools array for cost reduction
     * Tools rarely change between requests, so caching them saves tokens
     */
    prepareTools(tools) {
        if (!tools || tools.length === 0)
            return tools;
        // Clone tools to avoid mutating originals
        const prepared = tools.map(t => ({ ...t }));
        // Add cache_control to the last tool
        // This caches the entire tools array across requests
        if (prepared.length > 0) {
            prepared[prepared.length - 1].cache_control = { type: "ephemeral" };
        }
        return prepared;
    }
}
exports.OmniRouteProvider = OmniRouteProvider;
