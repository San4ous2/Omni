"use strict";
// Tool system - modular tool architecture
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolManager = exports.Tool = void 0;
class Tool {
    toDefinition() {
        return {
            name: this.name,
            description: this.description,
            parameters: this.parameters,
        };
    }
}
exports.Tool = Tool;
class ToolManager {
    constructor() {
        this.tools = new Map();
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    unregister(name) {
        this.tools.delete(name);
    }
    get(name) {
        return this.tools.get(name);
    }
    getAll() {
        return Array.from(this.tools.values());
    }
    getDefinitions() {
        return this.getAll().map(t => t.toDefinition());
    }
    async execute(name, args, context) {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                success: false,
                output: "",
                error: `Tool '${name}' not found`,
            };
        }
        try {
            return await tool.execute(args, context);
        }
        catch (error) {
            return {
                success: false,
                output: "",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
exports.ToolManager = ToolManager;
