"use strict";
// Multi-agent system - specialized agents for different tasks
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = exports.TestAgent = exports.CodeReviewAgent = exports.PlanAgent = exports.ExploreAgent = exports.Agent = void 0;
class Agent {
}
exports.Agent = Agent;
// ── Explore Agent ─────────────────────────────────────────────────────────────
class ExploreAgent extends Agent {
    constructor() {
        super(...arguments);
        this.name = "explore";
        this.description = "Fast agent for exploring codebases, finding files, searching code";
        this.systemPrompt = `You are a codebase exploration specialist. Your job is to:
- Find files using glob patterns
- Search code for keywords and patterns
- Understand project structure
- Identify relevant files for tasks
- Answer questions about the codebase

Be thorough but efficient. Use glob and grep tools extensively.`;
    }
    async execute(task, context) {
        const messages = [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: task },
        ];
        try {
            // Loop to handle tool calls
            let iterations = 0;
            const maxIterations = 10;
            while (iterations < maxIterations) {
                const response = await context.provider.call(messages, {
                    model: context.model,
                    tools: context.tools,
                    tool_choice: "auto",
                    max_tokens: 4096,
                });
                // Add assistant response to messages
                messages.push({
                    role: "assistant",
                    content: response.content,
                    tool_calls: response.tool_calls,
                });
                // If no tool calls, we're done
                if (!response.tool_calls || response.tool_calls.length === 0) {
                    return {
                        success: true,
                        output: response.content || "",
                        data: { iterations },
                    };
                }
                // Execute tool calls
                for (const toolCall of response.tool_calls) {
                    const toolResult = await this.executeTool(toolCall, context);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult),
                    });
                }
                iterations++;
            }
            return {
                success: true,
                output: messages[messages.length - 2]?.content || "Max iterations reached",
                data: { iterations },
            };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: e.message,
            };
        }
    }
    async executeTool(toolCall, context) {
        const { name, arguments: args } = toolCall.function;
        // Execute the tool based on name
        // This is a simplified version - you'd need to map tool names to actual implementations
        try {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            // Map tool names to implementations
            switch (name) {
                case 'read_file':
                    const fs = require('fs');
                    const path = require('path');
                    const filePath = path.join(context.workDir, parsedArgs.path);
                    return { content: fs.readFileSync(filePath, 'utf-8') };
                case 'list_files':
                    const fs2 = require('fs');
                    const path2 = require('path');
                    const dirPath = path2.join(context.workDir, parsedArgs.path || '.');
                    return { files: fs2.readdirSync(dirPath) };
                case 'search_files':
                    // Implement search
                    return { results: [] };
                default:
                    return { error: `Unknown tool: ${name}` };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
}
exports.ExploreAgent = ExploreAgent;
// ── Plan Agent ────────────────────────────────────────────────────────────────
class PlanAgent extends Agent {
    constructor() {
        super(...arguments);
        this.name = "plan";
        this.description = "Software architect agent for designing implementation plans";
        this.systemPrompt = `You are a software architect and planning specialist. Your job is to:
- Analyze task requirements and complexity
- Design step-by-step implementation plans
- Identify critical files and dependencies
- Consider architectural trade-offs
- Break down complex tasks into manageable steps

Create detailed, actionable plans with clear steps. Consider edge cases and potential issues.`;
    }
    async execute(task, context) {
        const messages = [
            { role: "system", content: this.systemPrompt },
            {
                role: "user",
                content: `Create a detailed implementation plan for: ${task}\n\nWorking directory: ${context.workDir}\n\nProvide a structured plan with steps, files to modify, and considerations.`
            },
        ];
        try {
            // Loop to handle tool calls
            let iterations = 0;
            const maxIterations = 10;
            while (iterations < maxIterations) {
                const response = await context.provider.call(messages, {
                    model: context.model,
                    tools: context.tools,
                    tool_choice: "auto",
                    max_tokens: 8192,
                });
                messages.push({
                    role: "assistant",
                    content: response.content,
                    tool_calls: response.tool_calls,
                });
                if (!response.tool_calls || response.tool_calls.length === 0) {
                    return {
                        success: true,
                        output: response.content || "",
                    };
                }
                // Execute tool calls
                for (const toolCall of response.tool_calls) {
                    const toolResult = await this.executeTool(toolCall, context);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult),
                    });
                }
                iterations++;
            }
            return {
                success: true,
                output: messages[messages.length - 2]?.content || "Max iterations reached",
            };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: e.message,
            };
        }
    }
    async executeTool(toolCall, context) {
        const { name, arguments: args } = toolCall.function;
        try {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            const fs = require('fs');
            const path = require('path');
            switch (name) {
                case 'read_file':
                    const filePath = path.join(context.workDir, parsedArgs.path);
                    return { content: fs.readFileSync(filePath, 'utf-8') };
                case 'list_files':
                    const dirPath = path.join(context.workDir, parsedArgs.path || '.');
                    return { files: fs.readdirSync(dirPath) };
                default:
                    return { error: `Unknown tool: ${name}` };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
}
exports.PlanAgent = PlanAgent;
// ── Code Review Agent ─────────────────────────────────────────────────────────
class CodeReviewAgent extends Agent {
    constructor() {
        super(...arguments);
        this.name = "review";
        this.description = "Code review specialist for quality, security, and best practices";
        this.systemPrompt = `You are a senior code reviewer. Your job is to:
- Review code for bugs, security issues, and anti-patterns
- Check for best practices and code quality
- Identify potential performance issues
- Suggest improvements and refactoring opportunities
- Verify error handling and edge cases

Be thorough but constructive. Focus on actionable feedback.`;
    }
    async execute(task, context) {
        const messages = [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: task },
        ];
        try {
            let iterations = 0;
            const maxIterations = 10;
            while (iterations < maxIterations) {
                const response = await context.provider.call(messages, {
                    model: context.model,
                    tools: context.tools,
                    tool_choice: "auto",
                    max_tokens: 8192,
                });
                messages.push({
                    role: "assistant",
                    content: response.content,
                    tool_calls: response.tool_calls,
                });
                if (!response.tool_calls || response.tool_calls.length === 0) {
                    return {
                        success: true,
                        output: response.content || "",
                    };
                }
                // Execute tool calls
                for (const toolCall of response.tool_calls) {
                    const toolResult = await this.executeTool(toolCall, context);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult),
                    });
                }
                iterations++;
            }
            return {
                success: true,
                output: messages[messages.length - 2]?.content || "Max iterations reached",
            };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: e.message,
            };
        }
    }
    async executeTool(toolCall, context) {
        const { name, arguments: args } = toolCall.function;
        try {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            const fs = require('fs');
            const path = require('path');
            switch (name) {
                case 'read_file':
                    const filePath = path.join(context.workDir, parsedArgs.path);
                    return { content: fs.readFileSync(filePath, 'utf-8') };
                case 'list_files':
                    const dirPath = path.join(context.workDir, parsedArgs.path || '.');
                    return { files: fs.readdirSync(dirPath) };
                default:
                    return { error: `Unknown tool: ${name}` };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
}
exports.CodeReviewAgent = CodeReviewAgent;
// ── Test Agent ────────────────────────────────────────────────────────────────
class TestAgent extends Agent {
    constructor() {
        super(...arguments);
        this.name = "test";
        this.description = "Testing specialist for writing and running tests";
        this.systemPrompt = `You are a testing specialist. Your job is to:
- Write comprehensive unit and integration tests
- Identify test cases and edge cases
- Run existing tests and analyze failures
- Suggest test improvements and coverage gaps
- Follow testing best practices (AAA pattern, mocking, etc.)

Write clear, maintainable tests with good coverage.`;
    }
    async execute(task, context) {
        const messages = [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: task },
        ];
        try {
            let iterations = 0;
            const maxIterations = 10;
            while (iterations < maxIterations) {
                const response = await context.provider.call(messages, {
                    model: context.model,
                    tools: context.tools,
                    tool_choice: "auto",
                    max_tokens: 8192,
                });
                messages.push({
                    role: "assistant",
                    content: response.content,
                    tool_calls: response.tool_calls,
                });
                if (!response.tool_calls || response.tool_calls.length === 0) {
                    return {
                        success: true,
                        output: response.content || "",
                    };
                }
                // Execute tool calls
                for (const toolCall of response.tool_calls) {
                    const toolResult = await this.executeTool(toolCall, context);
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult),
                    });
                }
                iterations++;
            }
            return {
                success: true,
                output: messages[messages.length - 2]?.content || "Max iterations reached",
            };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: e.message,
            };
        }
    }
    async executeTool(toolCall, context) {
        const { name, arguments: args } = toolCall.function;
        try {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            const fs = require('fs');
            const path = require('path');
            switch (name) {
                case 'read_file':
                    const filePath = path.join(context.workDir, parsedArgs.path);
                    return { content: fs.readFileSync(filePath, 'utf-8') };
                case 'list_files':
                    const dirPath = path.join(context.workDir, parsedArgs.path || '.');
                    return { files: fs.readdirSync(dirPath) };
                default:
                    return { error: `Unknown tool: ${name}` };
            }
        }
        catch (e) {
            return { error: e.message };
        }
    }
}
exports.TestAgent = TestAgent;
// ── Agent Manager ─────────────────────────────────────────────────────────────
class AgentManager {
    constructor() {
        this.agents = new Map();
        // Register built-in agents
        this.register(new ExploreAgent());
        this.register(new PlanAgent());
        this.register(new CodeReviewAgent());
        this.register(new TestAgent());
    }
    register(agent) {
        this.agents.set(agent.name, agent);
    }
    get(name) {
        return this.agents.get(name);
    }
    getAll() {
        return Array.from(this.agents.values());
    }
    async execute(agentName, task, context) {
        const agent = this.agents.get(agentName);
        if (!agent) {
            return {
                success: false,
                output: "",
                error: `Agent '${agentName}' not found`,
            };
        }
        return agent.execute(task, context);
    }
}
exports.AgentManager = AgentManager;
