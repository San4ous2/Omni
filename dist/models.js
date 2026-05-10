"use strict";
// Comprehensive list of Qoder AI models available through Omniroute
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODELS = void 0;
exports.fetchAvailableModels = fetchAvailableModels;
exports.formatModelForDisplay = formatModelForDisplay;
// Default models list - will be augmented with API data
exports.DEFAULT_MODELS = [
    // Kiro (Claude via Qoder)
    { id: "kr/claude-sonnet-4.5", desc: "Claude Sonnet 4.5    ★  Kiro", provider: "kiro", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "kr/claude-haiku-4.5", desc: "Claude Haiku 4.5        Kiro", provider: "kiro", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "kiro/claude-sonnet-4.5", desc: "Claude Sonnet 4.5       Kiro", provider: "kiro", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "kiro/claude-haiku-4.5", desc: "Claude Haiku 4.5        Kiro", provider: "kiro", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    // Kimi Coding
    { id: "kmc/kimi-k2.5", desc: "Kimi K2.5               Kimi Coding", provider: "kimi", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    { id: "kmc/kimi-k2.5-thinking", desc: "Kimi K2.5 Thinking      Kimi Coding", provider: "kimi", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    { id: "kmc/kimi-latest", desc: "Kimi Latest              Kimi Coding", provider: "kimi", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    // Qwen
    { id: "qw/qwen3-coder-plus", desc: "Qwen3 Coder Plus         Qwen", provider: "qwen", contextLength: 32768, capabilities: { tools: true, streaming: true } },
    { id: "qw/qwen3-coder-flash", desc: "Qwen3 Coder Flash        Qwen", provider: "qwen", contextLength: 32768, capabilities: { tools: true, streaming: true } },
    // Gemini CLI
    { id: "gc/gemini-2.5-flash", desc: "Gemini 2.5 Flash         Gemini CLI", provider: "gemini", contextLength: 1000000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "gc/gemini-2.5-pro", desc: "Gemini 2.5 Pro           Gemini CLI", provider: "gemini", contextLength: 2000000, capabilities: { vision: true, tools: true, streaming: true } },
    // DeepSeek
    { id: "deepseek/deepseek-chat", desc: "DeepSeek Chat            DeepSeek", provider: "deepseek", contextLength: 64000, capabilities: { tools: true, streaming: true } },
    { id: "deepseek/deepseek-coder", desc: "DeepSeek Coder           DeepSeek", provider: "deepseek", contextLength: 64000, capabilities: { tools: true, streaming: true } },
    // OpenAI (if available through Omniroute)
    { id: "openai/gpt-4o", desc: "GPT-4o                   OpenAI", provider: "openai", contextLength: 128000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "openai/gpt-4o-mini", desc: "GPT-4o Mini              OpenAI", provider: "openai", contextLength: 128000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "openai/o1", desc: "O1                       OpenAI", provider: "openai", contextLength: 200000, capabilities: { tools: true, streaming: true } },
    { id: "openai/o1-mini", desc: "O1 Mini                  OpenAI", provider: "openai", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    // Anthropic (direct)
    { id: "anthropic/claude-3-5-sonnet", desc: "Claude 3.5 Sonnet        Anthropic", provider: "anthropic", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "anthropic/claude-3-5-haiku", desc: "Claude 3.5 Haiku         Anthropic", provider: "anthropic", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    // Google (direct)
    { id: "google/gemini-2.0-flash-exp", desc: "Gemini 2.0 Flash Exp     Google", provider: "google", contextLength: 1000000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "google/gemini-1.5-pro", desc: "Gemini 1.5 Pro           Google", provider: "google", contextLength: 2000000, capabilities: { vision: true, tools: true, streaming: true } },
    // Meta
    { id: "meta/llama-3.3-70b", desc: "Llama 3.3 70B            Meta", provider: "meta", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    { id: "meta/llama-3.1-405b", desc: "Llama 3.1 405B           Meta", provider: "meta", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    // Mistral
    { id: "mistral/mistral-large", desc: "Mistral Large            Mistral", provider: "mistral", contextLength: 128000, capabilities: { tools: true, streaming: true } },
    { id: "mistral/codestral", desc: "Codestral                Mistral", provider: "mistral", contextLength: 32000, capabilities: { tools: true, streaming: true } },
    // Pollinations.ai
    { id: "pollinations/openai", desc: "OpenAI                   Pollinations", provider: "pollinations", contextLength: 128000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "pollinations/claude-3.5-sonnet", desc: "Claude 3.5 Sonnet        Pollinations", provider: "pollinations", contextLength: 200000, capabilities: { vision: true, tools: true, streaming: true } },
    { id: "pollinations/gemini-2.0-flash-exp", desc: "Gemini 2.0 Flash         Pollinations", provider: "pollinations", contextLength: 1000000, capabilities: { vision: true, tools: true, streaming: true } },
];
async function fetchAvailableModels(baseUrl, apiKey) {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            console.warn("Failed to fetch models from API, using defaults");
            return exports.DEFAULT_MODELS;
        }
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
            console.warn("Invalid API response, using defaults");
            return exports.DEFAULT_MODELS;
        }
        // Only use models that are actually available from the API
        const apiModels = data.data.map((m) => {
            const defaultModel = exports.DEFAULT_MODELS.find(dm => dm.id === m.id);
            return {
                id: m.id,
                desc: defaultModel?.desc || `${m.id.split('/')[1] || m.id}`,
                provider: m.owned_by || defaultModel?.provider || "unknown",
                contextLength: m.context_length || defaultModel?.contextLength,
                capabilities: {
                    vision: m.capabilities?.vision || defaultModel?.capabilities?.vision || false,
                    tools: defaultModel?.capabilities?.tools !== false,
                    streaming: defaultModel?.capabilities?.streaming !== false,
                },
            };
        });
        // If API returned models, use only those (don't add unavailable defaults)
        if (apiModels.length > 0) {
            return apiModels;
        }
        // Fallback to defaults only if API returned nothing
        return exports.DEFAULT_MODELS;
    }
    catch (error) {
        console.error("Failed to fetch models from API:", error);
        return exports.DEFAULT_MODELS;
    }
}
function formatModelForDisplay(model) {
    const capabilities = [];
    if (model.capabilities?.vision)
        capabilities.push("👁");
    if (model.capabilities?.tools)
        capabilities.push("🔧");
    const capStr = capabilities.length > 0 ? ` ${capabilities.join("")}` : "";
    return `${model.desc}${capStr}`;
}
