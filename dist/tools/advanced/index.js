"use strict";
// Advanced tool system - Claude Code level capabilities
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
exports.advancedTools = exports.GitLogTool = exports.GitCommitTool = exports.GitDiffTool = exports.GitStatusTool = exports.GrepTool = exports.GlobTool = exports.EditTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const index_1 = require("../index");
// ── Edit Tool (smart diff-based editing) ──────────────────────────────────────
class EditTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "edit_file";
        this.description = "Edit file using exact string replacement (preserves formatting)";
        this.parameters = {
            type: "object",
            properties: {
                path: { type: "string", description: "File path" },
                old_string: { type: "string", description: "Exact text to replace" },
                new_string: { type: "string", description: "New text" },
                replace_all: { type: "boolean", description: "Replace all occurrences (default: false)" },
            },
            required: ["path", "old_string", "new_string"],
        };
    }
    async execute(args, context) {
        const filePath = path.isAbsolute(args.path) ? args.path : path.join(context.workDir, args.path);
        // Better error messages
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                output: "",
                error: `File not found: ${args.path}\nCheck the path and try again.`
            };
        }
        let content;
        try {
            content = fs.readFileSync(filePath, "utf-8");
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: `Cannot read file: ${e.message}\nFile may be binary or locked.`
            };
        }
        const { old_string, new_string, replace_all } = args;
        // Validate inputs
        if (!old_string || old_string.length === 0) {
            return {
                success: false,
                output: "",
                error: "old_string cannot be empty"
            };
        }
        // Count occurrences
        const occurrences = (content.match(new RegExp(escapeRegex(old_string), "g")) || []).length;
        if (occurrences === 0) {
            // Provide helpful context
            const lines = content.split("\n");
            const preview = lines.slice(0, 5).join("\n");
            return {
                success: false,
                output: "",
                error: `old_string not found in file.\n\nSearching for: "${old_string.slice(0, 50)}${old_string.length > 50 ? "..." : ""}"\n\nFile preview (first 5 lines):\n${preview}\n\nTip: Check for exact whitespace/indentation match.`
            };
        }
        if (occurrences > 1 && !replace_all) {
            return {
                success: false,
                output: "",
                error: `Found ${occurrences} occurrences of the string.\n\nOptions:\n1. Set replace_all: true to replace all occurrences\n2. Provide more context in old_string to make it unique`
            };
        }
        const newContent = replace_all
            ? content.split(old_string).join(new_string)
            : content.replace(old_string, new_string);
        try {
            fs.writeFileSync(filePath, newContent, "utf-8");
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: `Failed to write file: ${e.message}\nFile may be read-only or locked.`
            };
        }
        const relativePath = path.relative(context.workDir, filePath);
        return {
            success: true,
            output: `✓ Edited ${relativePath}\n  ${replace_all ? occurrences : 1} replacement${occurrences > 1 ? 's' : ''} made\n  ${content.split("\n").length} lines total`,
        };
    }
}
exports.EditTool = EditTool;
// ── Glob Tool (pattern-based file search) ────────────────────────────────────
class GlobTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "glob";
        this.description = "Find files matching glob pattern (e.g., **/*.ts, src/**/*.js)";
        this.parameters = {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Glob pattern" },
                path: { type: "string", description: "Base directory (default: current)" },
                limit: { type: "number", description: "Max results (default: 100)" },
            },
            required: ["pattern"],
        };
    }
    async execute(args, context) {
        const basePath = args.path ? path.join(context.workDir, args.path) : context.workDir;
        const limit = args.limit || 100;
        const results = [];
        // Validate base path
        if (!fs.existsSync(basePath)) {
            return {
                success: false,
                output: "",
                error: `Directory not found: ${args.path || "."}\nCheck the path and try again.`
            };
        }
        const stats = fs.statSync(basePath);
        if (!stats.isDirectory()) {
            return {
                success: false,
                output: "",
                error: `Not a directory: ${args.path}\nGlob requires a directory path.`
            };
        }
        const matchPattern = (filePath, pattern) => {
            const regex = pattern
                .replace(/\*\*/g, "§§") // Placeholder for **
                .replace(/\*/g, "[^/\\\\]*") // * matches anything except path separator
                .replace(/§§/g, ".*") // ** matches anything including path separator
                .replace(/\?/g, "[^/\\\\]"); // ? matches single char except path separator
            return new RegExp(`^${regex}$`).test(filePath);
        };
        const search = (dir, depth = 0) => {
            if (results.length >= limit || depth > 10)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (results.length >= limit)
                        break;
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");
                    // Skip common ignore patterns
                    if (["node_modules", ".git", "dist", ".omni"].includes(entry.name))
                        continue;
                    if (entry.isDirectory()) {
                        search(fullPath, depth + 1);
                    }
                    else if (matchPattern(relativePath, args.pattern)) {
                        results.push(relativePath);
                    }
                }
            }
            catch (e) {
                // Skip directories we can't read
            }
        };
        const startTime = Date.now();
        search(basePath);
        const duration = Date.now() - startTime;
        if (results.length === 0) {
            return {
                success: true,
                output: `No files match pattern: ${args.pattern}\n\nSearched in: ${path.relative(context.workDir, basePath) || "."}\nDuration: ${duration}ms\n\nTip: Try a broader pattern like **/*.${args.pattern.split(".").pop()}`,
            };
        }
        const truncated = results.length >= limit;
        const output = results.join("\n") +
            (truncated ? `\n\n... (showing first ${limit} of ${limit}+ matches)` : `\n\n✓ Found ${results.length} file${results.length > 1 ? "s" : ""} in ${duration}ms`);
        return {
            success: true,
            output,
        };
    }
}
exports.GlobTool = GlobTool;
// ── Grep Tool (advanced content search) ──────────────────────────────────────
class GrepTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "grep";
        this.description = "Search file contents with regex (supports context lines, case-insensitive)";
        this.parameters = {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Search pattern (regex)" },
                path: { type: "string", description: "File or directory to search" },
                case_insensitive: { type: "boolean", description: "Case insensitive search" },
                context: { type: "number", description: "Lines of context around matches" },
                glob: { type: "string", description: "File pattern filter (e.g., *.ts)" },
                limit: { type: "number", description: "Max results (default: 100)" },
            },
            required: ["pattern"],
        };
    }
    async execute(args, context) {
        const searchPath = args.path ? path.join(context.workDir, args.path) : context.workDir;
        const limit = args.limit || 100;
        const contextLines = args.context || 0;
        const flags = args.case_insensitive ? "gi" : "g";
        let regex;
        try {
            regex = new RegExp(args.pattern, flags);
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: `Invalid regex pattern: ${args.pattern}\n${e.message}\n\nTip: Escape special characters like . * + ? [ ] ( ) { } | \\`
            };
        }
        const results = [];
        let filesSearched = 0;
        let matchCount = 0;
        const searchFile = (filePath) => {
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                const lines = content.split("\n");
                const relativePath = path.relative(context.workDir, filePath);
                lines.forEach((line, idx) => {
                    if (results.length >= limit)
                        return;
                    if (regex.test(line)) {
                        matchCount++;
                        const lineNum = idx + 1;
                        if (contextLines > 0) {
                            // Add context lines
                            const start = Math.max(0, idx - contextLines);
                            const end = Math.min(lines.length - 1, idx + contextLines);
                            for (let i = start; i <= end; i++) {
                                const prefix = i === idx ? ">" : " ";
                                results.push(`${relativePath}:${i + 1}:${prefix} ${lines[i]}`);
                            }
                            results.push("---");
                        }
                        else {
                            results.push(`${relativePath}:${lineNum}: ${line.trim()}`);
                        }
                    }
                });
                filesSearched++;
            }
            catch (e) {
                // Skip binary files or files we can't read
            }
        };
        const search = (dir, depth = 0) => {
            if (results.length >= limit || depth > 10)
                return;
            try {
                const stat = fs.statSync(dir);
                if (stat.isFile()) {
                    searchFile(dir);
                    return;
                }
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (results.length >= limit)
                        break;
                    const fullPath = path.join(dir, entry.name);
                    if (["node_modules", ".git", "dist", ".omni"].includes(entry.name))
                        continue;
                    if (entry.isDirectory()) {
                        search(fullPath, depth + 1);
                    }
                    else if (entry.isFile()) {
                        // Apply glob filter if specified
                        if (args.glob) {
                            const pattern = args.glob.replace(/\*/g, ".*").replace(/\?/g, ".");
                            if (!new RegExp(pattern).test(entry.name))
                                continue;
                        }
                        searchFile(fullPath);
                    }
                }
            }
            catch (e) {
                // Skip paths we can't access
            }
        };
        const startTime = Date.now();
        search(searchPath);
        const duration = Date.now() - startTime;
        if (results.length === 0) {
            return {
                success: true,
                output: `No matches found for: ${args.pattern}\n\nSearched ${filesSearched} file${filesSearched !== 1 ? "s" : ""} in ${duration}ms\n${args.glob ? `Filter: ${args.glob}\n` : ""}${args.case_insensitive ? "Case-insensitive search\n" : ""}\nTip: Try a broader pattern or check your regex syntax`,
            };
        }
        const truncated = results.length >= limit;
        const summary = `\n✓ Found ${matchCount} match${matchCount !== 1 ? "es" : ""} in ${filesSearched} file${filesSearched !== 1 ? "s" : ""} (${duration}ms)${truncated ? `\n  Showing first ${limit} results` : ""}`;
        return {
            success: true,
            output: results.slice(0, limit).join("\n") + summary,
        };
    }
}
exports.GrepTool = GrepTool;
// ── Git Tools ─────────────────────────────────────────────────────────────────
class GitStatusTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "git_status";
        this.description = "Get detailed git status with staged/unstaged changes";
        this.parameters = { type: "object", properties: {} };
    }
    async execute(args, context) {
        try {
            // Check if in git repo
            try {
                (0, child_process_1.execSync)("git rev-parse --git-dir", { cwd: context.workDir, stdio: "ignore" });
            }
            catch {
                return {
                    success: false,
                    output: "",
                    error: "Not a git repository\n\nTip: Initialize with 'git init' or navigate to a git repository"
                };
            }
            const status = (0, child_process_1.execSync)("git status --porcelain", {
                cwd: context.workDir,
                encoding: "utf-8"
            });
            const branch = (0, child_process_1.execSync)("git branch --show-current", {
                cwd: context.workDir,
                encoding: "utf-8"
            }).trim();
            const staged = [];
            const unstaged = [];
            const untracked = [];
            status.split("\n").forEach(line => {
                if (!line.trim())
                    return;
                const statusCode = line.slice(0, 2);
                const file = line.slice(3);
                if (statusCode[0] !== " " && statusCode[0] !== "?")
                    staged.push(file);
                if (statusCode[1] !== " ")
                    unstaged.push(file);
                if (statusCode === "??")
                    untracked.push(file);
            });
            const totalChanges = staged.length + unstaged.length + untracked.length;
            const output = [
                `Branch: ${branch}`,
                totalChanges === 0 ? "\n✓ Working tree clean" : "",
                staged.length > 0 ? `\nStaged (${staged.length}):\n  ${staged.join("\n  ")}` : "",
                unstaged.length > 0 ? `\nUnstaged (${unstaged.length}):\n  ${unstaged.join("\n  ")}` : "",
                untracked.length > 0 ? `\nUntracked (${untracked.length}):\n  ${untracked.join("\n  ")}` : "",
            ].filter(Boolean).join("\n");
            return { success: true, output: output || "Working tree clean" };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: `Git status failed: ${e.message}\n\nCheck if git is installed and repository is valid`
            };
        }
    }
}
exports.GitStatusTool = GitStatusTool;
class GitDiffTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "git_diff";
        this.description = "Get git diff (staged or unstaged changes)";
        this.parameters = {
            type: "object",
            properties: {
                staged: { type: "boolean", description: "Show staged changes (default: false)" },
                file: { type: "string", description: "Specific file to diff" },
            },
        };
    }
    async execute(args, context) {
        try {
            const cmd = args.staged ? "git diff --cached" : "git diff";
            const fullCmd = args.file ? `${cmd} -- ${args.file}` : cmd;
            const diff = (0, child_process_1.execSync)(fullCmd, {
                cwd: context.workDir,
                encoding: "utf-8",
                maxBuffer: 10 * 1024 * 1024, // 10MB
            });
            return {
                success: true,
                output: diff || "No changes"
            };
        }
        catch (e) {
            return { success: false, output: "", error: e.message };
        }
    }
}
exports.GitDiffTool = GitDiffTool;
class GitCommitTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "git_commit";
        this.description = "Create a git commit with message";
        this.parameters = {
            type: "object",
            properties: {
                message: { type: "string", description: "Commit message" },
                add_all: { type: "boolean", description: "Stage all changes first (default: false)" },
            },
            required: ["message"],
        };
    }
    async execute(args, context) {
        try {
            // Check if in git repo
            try {
                (0, child_process_1.execSync)("git rev-parse --git-dir", { cwd: context.workDir, stdio: "ignore" });
            }
            catch {
                return {
                    success: false,
                    output: "",
                    error: "Not a git repository"
                };
            }
            // Check for changes
            const status = (0, child_process_1.execSync)("git status --porcelain", {
                cwd: context.workDir,
                encoding: "utf-8"
            });
            if (!status.trim() && !args.add_all) {
                return {
                    success: false,
                    output: "",
                    error: "No changes to commit\n\nTip: Use add_all: true to stage all changes first"
                };
            }
            if (args.add_all) {
                (0, child_process_1.execSync)("git add -A", { cwd: context.workDir });
            }
            // Validate commit message
            if (!args.message || args.message.trim().length === 0) {
                return {
                    success: false,
                    output: "",
                    error: "Commit message cannot be empty"
                };
            }
            (0, child_process_1.execSync)(`git commit -m "${args.message.replace(/"/g, '\\"')}"`, {
                cwd: context.workDir,
                encoding: "utf-8",
            });
            // Get commit hash
            const hash = (0, child_process_1.execSync)("git rev-parse --short HEAD", {
                cwd: context.workDir,
                encoding: "utf-8"
            }).trim();
            return {
                success: true,
                output: `✓ Committed: ${args.message}\n  Hash: ${hash}`
            };
        }
        catch (e) {
            return {
                success: false,
                output: "",
                error: `Commit failed: ${e.message}\n\nCommon issues:\n- No changes staged (use add_all: true)\n- Pre-commit hooks failed\n- Invalid commit message format`
            };
        }
    }
}
exports.GitCommitTool = GitCommitTool;
class GitLogTool extends index_1.Tool {
    constructor() {
        super(...arguments);
        this.name = "git_log";
        this.description = "Get recent git commit history";
        this.parameters = {
            type: "object",
            properties: {
                limit: { type: "number", description: "Number of commits (default: 10)" },
                oneline: { type: "boolean", description: "One line per commit (default: true)" },
            },
        };
    }
    async execute(args, context) {
        try {
            const limit = args.limit || 10;
            const format = args.oneline !== false ? "--oneline" : "--pretty=medium";
            const log = (0, child_process_1.execSync)(`git log ${format} -n ${limit}`, {
                cwd: context.workDir,
                encoding: "utf-8"
            });
            return { success: true, output: log };
        }
        catch (e) {
            return { success: false, output: "", error: e.message };
        }
    }
}
exports.GitLogTool = GitLogTool;
// ── Utility functions ─────────────────────────────────────────────────────────
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Export all advanced tools
exports.advancedTools = [
    new EditTool(),
    new GlobTool(),
    new GrepTool(),
    new GitStatusTool(),
    new GitDiffTool(),
    new GitCommitTool(),
    new GitLogTool(),
];
