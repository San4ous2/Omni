"use strict";
// Ollama provider implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const providers_1 = require("../providers");
class OllamaProvider extends providers_1.Provider {
    constructor() {
        super(...arguments);
        this.name = "ollama";
        this.supportsTools = true;
        this.supportsStreaming = true;
    }
    async call(messages, options) {
        try {
            const response = await fetch(`${this.config.url}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: options.model,
                    messages: this.convertMessages(messages),
                    tools: options.tools ? this.convertTools(options.tools) : undefined,
                    stream: false,
                    options: {
                        temperature: options.temperature,
                        num_predict: options.max_tokens,
                    },
                }),
            });
            if (!response.ok) {
                const text = await response.text();
                throw new providers_1.ProviderError(`Ollama error: ${response.status} - ${text.slice(0, 200)}`, this.name, response.status);
            }
            const data = await response.json();
            return {
                role: "assistant",
                content: data.message?.content || null,
                tool_calls: data.message?.tool_calls,
                finish_reason: data.done ? "stop" : "length",
            };
        }
        catch (error) {
            if (error instanceof providers_1.ProviderError)
                throw error;
            throw new providers_1.ProviderError(`Ollama connection error: ${error instanceof Error ? error.message : String(error)}`, this.name, undefined, error);
        }
    }
    convertMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === "tool" ? "user" : msg.role,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }));
    }
    convertTools(tools) {
        return tools.map(tool => ({
            type: "function",
            function: {
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters,
            },
        }));
    }
    async listModels() {
        try {
            const response = await fetch(`${this.config.url}/api/tags`);
            if (!response.ok)
                return this.config.models;
            const data = await response.json();
            return data.models?.map((m) => m.name) || this.config.models;
        }
        catch {
            return this.config.models;
        }
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.config.url}/api/tags`, {
                method: "GET",
                signal: AbortSignal.timeout(3000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
exports.OllamaProvider = OllamaProvider;
