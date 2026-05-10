"use strict";
// Shell operations tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommandTool = void 0;
const child_process_1 = require("child_process");
const index_1 = require("./index");
class RunCommandTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "run_command";
        this.description = "Run shell command";
        this.parameters = {
            type: "object",
            properties: {
                command: { type: "string", description: "Command to execute" },
            },
            required: ["command"],
        };
    }
    async execute(args, context) {
        try {
            const output = (0, child_process_1.execSync)(args.command, {
                cwd: context.workDir,
                timeout: 30000,
                encoding: "utf-8",
            });
            return {
                success: true,
                output: output || "(no output)",
            };
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
exports.RunCommandTool = RunCommandTool;
