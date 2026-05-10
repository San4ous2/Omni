"use strict";
// File operations tools
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteFileTool = exports.ListFilesTool = exports.WriteFileTool = exports.ReadFileTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("./index");
class ReadFileTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "read_file";
        this.description = "Read a file";
        this.parameters = {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
            },
            required: ["path"],
        };
    }
    async execute(args, context) {
        try {
            const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path);
            const stat = fs.statSync(fullPath);
            if (stat.size > 1000000) {
                const content = fs.readFileSync(fullPath, "utf-8");
                return {
                    success: true,
                    output: content.slice(0, 120000) + `\n[truncated - file is ${(stat.size / 1024 / 1024).toFixed(1)}MB]`,
                };
            }
            const content = fs.readFileSync(fullPath, "utf-8");
            return {
                success: true,
                output: content.length > 120000 ? content.slice(0, 120000) + "\n[truncated]" : content,
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
exports.ReadFileTool = ReadFileTool;
class WriteFileTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "write_file";
        this.description = "Write content to a file";
        this.parameters = {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
                content: { type: "string", description: "Content to write" },
            },
            required: ["path", "content"],
        };
    }
    async execute(args, context) {
        try {
            const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, args.content, "utf-8");
            return {
                success: true,
                output: `✓ Written ${args.path}`,
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
exports.WriteFileTool = WriteFileTool;
class ListFilesTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "list_files";
        this.description = "List directory contents";
        this.parameters = {
            type: "object",
            properties: {
                path: { type: "string", description: "Directory path" },
            },
        };
    }
    async execute(args, context) {
        try {
            const fullPath = args.path
                ? path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path)
                : context.workDir;
            const entries = fs.readdirSync(fullPath, { withFileTypes: true });
            const output = entries
                .map(e => e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`)
                .join("\n") || "(empty)";
            return { success: true, output };
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
exports.ListFilesTool = ListFilesTool;
class DeleteFileTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "delete_file";
        this.description = "Delete a file";
        this.parameters = {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file" },
            },
            required: ["path"],
        };
    }
    async execute(args, context) {
        try {
            const fullPath = path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path);
            fs.unlinkSync(fullPath);
            return {
                success: true,
                output: `✓ Deleted ${args.path}`,
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
exports.DeleteFileTool = DeleteFileTool;
