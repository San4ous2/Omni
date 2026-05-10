"use strict";
// Multi-Model Orchestration System
// Intelligently routes tasks to the best model based on complexity and requirements
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelOrchestrator = void 0;
class ModelOrchestrator {
    constructor(models) {
        this.models = models;
        this.modelCapabilities = new Map();
        this.initializeCapabilities();
    }
    initializeCapabilities() {
        // Define capabilities for known models
        const capabilities = {
            // Kiro (Claude) - Best overall, expensive
            "kr/claude-sonnet-4.5": { speed: 7, intelligence: 10, reasoning: 10, coding: 10, costPerToken: 3 },
            "kr/claude-haiku-4.5": { speed: 10, intelligence: 7, reasoning: 7, coding: 8, costPerToken: 1 },
            // Kimi - Good for thinking tasks
            "kmc/kimi-k2.5-thinking": { speed: 4, intelligence: 9, reasoning: 10, coding: 8, costPerToken: 2 },
            "kmc/kimi-k2.5": { speed: 6, intelligence: 8, reasoning: 7, coding: 8, costPerToken: 2 },
            // Qwen - Fast and good for code
            "qw/qwen3-coder-plus": { speed: 8, intelligence: 7, reasoning: 6, coding: 9, costPerToken: 1 },
            "qw/qwen3-coder-flash": { speed: 10, intelligence: 6, reasoning: 5, coding: 8, costPerToken: 0.5 },
            // Gemini - Fast and cheap
            "gc/gemini-2.5-flash": { speed: 10, intelligence: 7, reasoning: 6, coding: 7, costPerToken: 0.5 },
            "gc/gemini-2.5-pro": { speed: 6, intelligence: 9, reasoning: 8, coding: 8, costPerToken: 2 },
            // DeepSeek - Good for code, cheap
            "deepseek/deepseek-chat": { speed: 7, intelligence: 7, reasoning: 7, coding: 7, costPerToken: 0.5 },
            "deepseek/deepseek-coder": { speed: 8, intelligence: 7, reasoning: 6, coding: 9, costPerToken: 0.5 },
            // OpenAI
            "openai/gpt-4o": { speed: 7, intelligence: 9, reasoning: 9, coding: 9, costPerToken: 3 },
            "openai/gpt-4o-mini": { speed: 9, intelligence: 7, reasoning: 7, coding: 8, costPerToken: 1 },
            "openai/o1": { speed: 3, intelligence: 10, reasoning: 10, coding: 9, costPerToken: 5 },
            "openai/o1-mini": { speed: 5, intelligence: 8, reasoning: 9, coding: 8, costPerToken: 2 },
        };
        for (const [modelId, capability] of Object.entries(capabilities)) {
            this.modelCapabilities.set(modelId, capability);
        }
    }
    /**
     * Classify a task based on its content and context
     */
    classifyTask(input, context) {
        const lower = input.toLowerCase();
        const words = input.split(/\s+/).length;
        // Check for thinking/reasoning keywords
        const thinkingKeywords = ["why", "explain", "analyze", "compare", "evaluate", "reason", "understand", "how does", "what if"];
        const requiresThinking = thinkingKeywords.some(kw => lower.includes(kw));
        // Check for speed requirements
        const speedKeywords = ["quick", "fast", "simple", "just", "briefly"];
        const requiresSpeed = speedKeywords.some(kw => lower.includes(kw)) || words < 10;
        // Check for code-related tasks
        const codeKeywords = ["code", "function", "class", "implement", "refactor", "bug", "test", "debug"];
        const isCodeTask = codeKeywords.some(kw => lower.includes(kw));
        // Check for creative tasks
        const creativeKeywords = ["write", "create", "generate", "design", "draft"];
        const isCreative = creativeKeywords.some(kw => lower.includes(kw));
        // Estimate complexity
        let complexity = 5; // Default medium
        if (requiresSpeed)
            complexity = 2;
        if (requiresThinking)
            complexity = 8;
        if (words > 50)
            complexity += 2;
        if (context.length > 10)
            complexity += 1;
        complexity = Math.min(10, Math.max(1, complexity));
        // Determine type
        let type = "simple";
        if (isCodeTask)
            type = "code";
        else if (requiresThinking)
            type = "reasoning";
        else if (isCreative)
            type = "creative";
        else if (complexity > 6)
            type = "complex";
        // Estimate tokens
        const estimatedTokens = words * 1.3 + context.reduce((sum, msg) => {
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            return sum + content.split(/\s+/).length * 1.3;
        }, 0);
        return {
            type,
            complexity,
            requiresThinking,
            requiresSpeed,
            estimatedTokens,
        };
    }
    /**
     * Select the best model for a given task
     */
    selectModel(task, availableModels) {
        const candidates = availableModels || this.models.map(m => m.id);
        // Score each model
        const scores = candidates.map(modelId => {
            const capability = this.modelCapabilities.get(modelId);
            if (!capability)
                return { modelId, score: 0 };
            let score = 0;
            // Speed requirement
            if (task.requiresSpeed) {
                score += capability.speed * 3;
            }
            // Thinking requirement
            if (task.requiresThinking) {
                score += capability.reasoning * 4;
            }
            // Task type specific scoring
            switch (task.type) {
                case "code":
                    score += capability.coding * 3;
                    score += capability.intelligence * 2;
                    break;
                case "reasoning":
                    score += capability.reasoning * 4;
                    score += capability.intelligence * 3;
                    break;
                case "complex":
                    score += capability.intelligence * 3;
                    score += capability.reasoning * 2;
                    break;
                case "creative":
                    score += capability.intelligence * 2;
                    score += capability.speed * 1;
                    break;
                case "simple":
                    score += capability.speed * 3;
                    score += capability.intelligence * 1;
                    break;
            }
            // Complexity adjustment
            if (task.complexity > 7) {
                score += capability.intelligence * 2;
                score += capability.reasoning * 2;
            }
            else if (task.complexity < 4) {
                score += capability.speed * 2;
            }
            // Cost consideration (prefer cheaper for simple tasks)
            if (task.complexity < 5) {
                score -= capability.costPerToken * 2;
            }
            return { modelId, score, capability };
        });
        // Sort by score and return best
        scores.sort((a, b) => b.score - a.score);
        return scores[0]?.modelId || candidates[0] || "kr/claude-sonnet-4.5";
    }
    /**
     * Get a recommendation with explanation
     */
    recommend(input, context, availableModels) {
        const task = this.classifyTask(input, context);
        const model = this.selectModel(task, availableModels);
        const capability = this.modelCapabilities.get(model);
        let reason = `Selected ${model} for ${task.type} task (complexity: ${task.complexity}/10)`;
        if (task.requiresSpeed) {
            reason += " - prioritizing speed";
        }
        if (task.requiresThinking) {
            reason += " - requires deep reasoning";
        }
        if (capability) {
            reason += ` - speed:${capability.speed} intelligence:${capability.intelligence} reasoning:${capability.reasoning}`;
        }
        return { model, task, reason };
    }
    /**
     * Add or update model capability
     */
    setCapability(modelId, capability) {
        this.modelCapabilities.set(modelId, capability);
    }
    /**
     * Get capability for a model
     */
    getCapability(modelId) {
        return this.modelCapabilities.get(modelId);
    }
}
exports.ModelOrchestrator = ModelOrchestrator;
