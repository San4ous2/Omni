"use strict";
// Pollinations.ai provider implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollinationsProvider = void 0;
const providers_1 = require("../providers");

class PollinationsProvider extends providers_1.Provider {
    constructor() {
        super(...arguments);
        this.name = "pollinations";
        this.supportsTools = true;
        this.supportsStreaming = true;
        this.supportsImageGeneration = true;
        this.supportsAudioGeneration = true;
    }

    async call(messages, options) {
        // Use streaming if enabled and callback provided
        if (options.stream && options.onToken) {
            return this.callWithStreaming(messages, options);
        }

        try {
            const response = await fetch(`${this.config.url}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: options.model || "openai",
                    messages: messages,
                    tools: options.tools,
                    tool_choice: options.tool_choice || "auto",
                    max_tokens: options.max_tokens || 8192,
                    temperature: options.temperature || 0.7,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new providers_1.ProviderError(
                    `API error: ${response.status} - ${text.slice(0, 200)}`,
                    this.name,
                    response.status
                );
            }

            const data = await response.json();
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
        } catch (error) {
            if (error instanceof providers_1.ProviderError) throw error;
            throw new providers_1.ProviderError(
                `Network error: ${error instanceof Error ? error.message : String(error)}`,
                this.name,
                undefined,
                error
            );
        }
    }

    async callWithStreaming(messages, options) {
        const response = await fetch(`${this.config.url}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: options.model || "openai",
                messages: messages,
                tools: options.tools,
                tool_choice: options.tool_choice || "auto",
                max_tokens: options.max_tokens || 8192,
                temperature: options.temperature || 0.7,
                stream: true,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new providers_1.ProviderError(
                `API error: ${response.status} - ${text.slice(0, 200)}`,
                this.name,
                response.status
            );
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
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter(l => l.trim().startsWith("data:"));

                for (const line of lines) {
                    const json = line.replace(/^data:\s*/, "").trim();
                    if (json === "[DONE]") break;
                    if (!json) continue;

                    try {
                        const data = JSON.parse(json);
                        const delta = data.choices?.[0]?.delta;
                        if (!delta) continue;

                        if (delta.content) {
                            content += delta.content;
                            options.onToken?.(delta.content);
                        }

                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const i = tc.index ?? 0;
                                if (!toolCalls[i]) {
                                    toolCalls[i] = {
                                        id: "",
                                        type: "function",
                                        function: { name: "", arguments: "" }
                                    };
                                }
                                if (tc.id) toolCalls[i].id = tc.id;
                                if (tc.function?.name) toolCalls[i].function.name += tc.function.name;
                                if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
                            }
                        }
                    } catch (e) {
                        // Skip malformed chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return {
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.length ? toolCalls : undefined,
            finish_reason: "stop",
        };
    }

    async generateImage(prompt, options = {}) {
        const params = new URLSearchParams({
            model: options.model || "flux",
            width: options.width || "1024",
            height: options.height || "1024",
            nologo: "true",
            enhance: options.enhance ? "true" : "false",
        });

        if (options.seed) params.append("seed", options.seed.toString());

        const url = `${this.config.url}/image/${encodeURIComponent(prompt)}?${params}`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new providers_1.ProviderError(
                `Image generation failed: ${response.status}`,
                this.name,
                response.status
            );
        }

        return {
            url: url,
            data: await response.arrayBuffer(),
        };
    }

    async generateAudio(text, options = {}) {
        const params = new URLSearchParams({
            voice: options.voice || "alloy",
            model: options.model || "openai",
        });

        if (options.speed) params.append("speed", options.speed.toString());

        const url = `${this.config.url}/audio/${encodeURIComponent(text)}?${params}`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.config.apiKey}`,
            },
        });

        if (!response.ok) {
            throw new providers_1.ProviderError(
                `Audio generation failed: ${response.status}`,
                this.name,
                response.status
            );
        }

        return {
            url: url,
            data: await response.arrayBuffer(),
        };
    }

    async listModels() {
        try {
            const response = await fetch(`${this.config.url}/v1/models`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    return data.data.map((m) => m.id);
                }
            }
        } catch (e) {
            // Fall back to configured models
        }
        return this.config.models || ["openai", "claude-3.5-sonnet", "gemini-2.0-flash-exp"];
    }

    async isAvailable() {
        try {
            const response = await fetch(`${this.config.url}/v1/models`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.config.apiKey}`,
                },
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

exports.PollinationsProvider = PollinationsProvider;
