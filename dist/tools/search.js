"use strict";
// Search operations tools
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
exports.SearchInFilesTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("./index");
class SearchInFilesTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "search_in_files";
        this.description = "Search text in files";
        this.parameters = {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Search pattern (regex)" },
                path: { type: "string", description: "Directory to search in" },
            },
            required: ["pattern"],
        };
    }
    async execute(args, context) {
        try {
            const results = [];
            const regex = new RegExp(args.pattern, "i");
            const searchPath = args.path
                ? path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path)
                : context.workDir;
            const search = (dir) => {
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            if (!["node_modules", ".git", ".omni", "dist"].includes(entry.name)) {
                                search(fullPath);
                            }
                        }
                        else if (entry.isFile()) {
                            try {
                                const content = fs.readFileSync(fullPath, "utf-8");
                                const lines = content.split("\n");
                                lines.forEach((line, idx) => {
                                    if (regex.test(line)) {
                                        const relPath = path.relative(context.workDir, fullPath);
                                        results.push(`${relPath}:${idx + 1}:${line.trim()}`);
                                    }
                                });
                            }
                            catch (e) {
                                // Skip binary files
                            }
                        }
                    }
                }
                catch (e) {
                    // Skip directories we can't read
                }
            };
            search(searchPath);
            return {
                success: true,
                output: results.length > 0 ? results.slice(0, 100).join("\n") : "No matches",
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
exports.SearchInFilesTool = SearchInFilesTool;
