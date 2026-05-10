"use strict";
// IDE-like autocomplete system for commands, models, and text
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutocompleteEngine = void 0;
class AutocompleteEngine {
    constructor() {
        this.commands = [];
        this.models = [];
        this.providers = [];
        this.skills = [];
    }
    setCommands(commands) {
        this.commands = commands;
    }
    setModels(models) {
        this.models = models;
    }
    setProviders(providers) {
        this.providers = providers;
    }
    setSkills(skills) {
        this.skills = skills;
    }
    getSuggestions(input, maxResults = 8) {
        if (!input)
            return [];
        const suggestions = [];
        const lowerInput = input.toLowerCase();
        // Command suggestions (starts with /)
        if (input.startsWith("/")) {
            const cmdPart = input.slice(1).toLowerCase();
            // Match commands
            for (const cmd of this.commands) {
                const cmdName = cmd.cmd.slice(1); // Remove leading /
                if (cmdName.toLowerCase().startsWith(cmdPart)) {
                    suggestions.push({
                        text: cmd.cmd,
                        display: cmd.cmd,
                        description: cmd.desc,
                        type: "command",
                        score: this.calculateScore(cmdName, cmdPart, true),
                    });
                }
            }
            // Match /model <model-name>
            if (input.startsWith("/model ")) {
                const modelPart = input.slice(7).toLowerCase();
                for (const model of this.models) {
                    if (model.id.toLowerCase().includes(modelPart)) {
                        const caps = [];
                        if (model.capabilities?.vision)
                            caps.push("👁");
                        if (model.capabilities?.tools)
                            caps.push("🔧");
                        suggestions.push({
                            text: `/model ${model.id}`,
                            display: model.id,
                            description: `${model.desc} ${caps.join(" ")}`,
                            type: "model",
                            score: this.calculateScore(model.id, modelPart, false),
                        });
                    }
                }
            }
            // Match /provider <provider-name>
            if (input.startsWith("/provider ")) {
                const providerPart = input.slice(10).toLowerCase();
                for (const provider of this.providers) {
                    if (provider.toLowerCase().includes(providerPart)) {
                        suggestions.push({
                            text: `/provider ${provider}`,
                            display: provider,
                            description: `Switch to ${provider}`,
                            type: "provider",
                            score: this.calculateScore(provider, providerPart, false),
                        });
                    }
                }
            }
        }
        else {
            // Smart text suggestions (common coding phrases)
            const textSuggestions = this.getTextSuggestions(input);
            suggestions.push(...textSuggestions);
        }
        // Sort by score (higher is better) and limit results
        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }
    calculateScore(target, input, exactPrefix) {
        const targetLower = target.toLowerCase();
        const inputLower = input.toLowerCase();
        // Exact match
        if (targetLower === inputLower)
            return 1000;
        // Starts with (prefix match)
        if (targetLower.startsWith(inputLower)) {
            return 900 - (target.length - input.length);
        }
        // Contains match
        if (targetLower.includes(inputLower)) {
            const index = targetLower.indexOf(inputLower);
            return 500 - index * 10;
        }
        // Fuzzy match (characters in order)
        let score = 0;
        let lastIndex = -1;
        for (const char of inputLower) {
            const index = targetLower.indexOf(char, lastIndex + 1);
            if (index === -1)
                return 0;
            score += 100 - (index - lastIndex) * 2;
            lastIndex = index;
        }
        return Math.max(0, score);
    }
    getTextSuggestions(input) {
        const suggestions = [];
        const lowerInput = input.toLowerCase();
        // Common coding phrases
        const phrases = [
            { trigger: "writ", text: "write a function to", desc: "Create a new function" },
            { trigger: "crea", text: "create a", desc: "Create something new" },
            { trigger: "fix", text: "fix the bug in", desc: "Fix a bug" },
            { trigger: "refac", text: "refactor", desc: "Refactor code" },
            { trigger: "expl", text: "explain", desc: "Explain code or concept" },
            { trigger: "optim", text: "optimize", desc: "Optimize performance" },
            { trigger: "add", text: "add", desc: "Add new feature" },
            { trigger: "upda", text: "update", desc: "Update existing code" },
            { trigger: "remo", text: "remove", desc: "Remove code" },
            { trigger: "test", text: "write tests for", desc: "Write unit tests" },
            { trigger: "debu", text: "debug", desc: "Debug an issue" },
            { trigger: "impl", text: "implement", desc: "Implement feature" },
            { trigger: "revi", text: "review", desc: "Review code" },
            { trigger: "doc", text: "document", desc: "Add documentation" },
            { trigger: "conv", text: "convert", desc: "Convert format" },
            { trigger: "migr", text: "migrate", desc: "Migrate code" },
            { trigger: "how", text: "how do I", desc: "Ask how to do something" },
            { trigger: "what", text: "what is", desc: "Ask what something is" },
            { trigger: "why", text: "why does", desc: "Ask why something happens" },
            { trigger: "show", text: "show me", desc: "Show examples" },
        ];
        for (const phrase of phrases) {
            if (lowerInput.length >= 2 && phrase.trigger.startsWith(lowerInput)) {
                suggestions.push({
                    text: phrase.text,
                    display: phrase.text,
                    description: phrase.desc,
                    type: "command",
                    score: this.calculateScore(phrase.trigger, lowerInput, true),
                });
            }
        }
        return suggestions;
    }
    // Get inline completion (ghost text)
    getInlineCompletion(input) {
        if (!input || input.length < 2)
            return null;
        const suggestions = this.getSuggestions(input, 1);
        if (suggestions.length === 0)
            return null;
        const best = suggestions[0];
        if (best.score < 800)
            return null; // Only show for high-confidence matches
        // Return the completion part (what comes after the input)
        if (best.text.toLowerCase().startsWith(input.toLowerCase())) {
            return best.text.slice(input.length);
        }
        return null;
    }
}
exports.AutocompleteEngine = AutocompleteEngine;
