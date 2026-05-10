"use strict";
// Worktree manager - isolated git worktrees for safe experimentation
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
exports.WorktreeManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class WorktreeManager {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.activeWorktree = null;
        this.worktreesDir = path.join(repoPath, ".omni", "worktrees");
    }
    // Check if we're in a git repository
    isGitRepo() {
        try {
            (0, child_process_1.execSync)("git rev-parse --git-dir", {
                cwd: this.repoPath,
                stdio: "ignore",
            });
            return true;
        }
        catch {
            return false;
        }
    }
    // Create a new worktree
    create(name) {
        if (!this.isGitRepo()) {
            throw new Error("Not a git repository");
        }
        // Generate name if not provided
        const worktreeName = name || `worktree-${Date.now()}`;
        const branchName = `omni/${worktreeName}`;
        const worktreePath = path.join(this.worktreesDir, worktreeName);
        // Ensure worktrees directory exists
        fs.mkdirSync(this.worktreesDir, { recursive: true });
        // Create worktree
        try {
            (0, child_process_1.execSync)(`git worktree add -b ${branchName} "${worktreePath}"`, {
                cwd: this.repoPath,
                stdio: "pipe",
            });
        }
        catch (e) {
            throw new Error(`Failed to create worktree: ${e.message}`);
        }
        const info = {
            name: worktreeName,
            path: worktreePath,
            branch: branchName,
            createdAt: new Date().toISOString(),
        };
        this.activeWorktree = info;
        return info;
    }
    // Remove a worktree
    remove(name, force = false) {
        const worktreePath = path.join(this.worktreesDir, name);
        if (!fs.existsSync(worktreePath)) {
            throw new Error(`Worktree not found: ${name}`);
        }
        // Check for uncommitted changes
        if (!force) {
            try {
                const status = (0, child_process_1.execSync)("git status --porcelain", {
                    cwd: worktreePath,
                    encoding: "utf-8",
                });
                if (status.trim()) {
                    throw new Error(`Worktree has uncommitted changes. Use force=true to discard them.\n${status}`);
                }
            }
            catch (e) {
                if (!e.message.includes("uncommitted changes")) {
                    // Ignore errors from git status (worktree might be corrupted)
                }
            }
        }
        // Remove worktree
        try {
            (0, child_process_1.execSync)(`git worktree remove ${force ? "--force" : ""} "${worktreePath}"`, {
                cwd: this.repoPath,
                stdio: "pipe",
            });
        }
        catch (e) {
            throw new Error(`Failed to remove worktree: ${e.message}`);
        }
        if (this.activeWorktree?.name === name) {
            this.activeWorktree = null;
        }
    }
    // List all worktrees
    list() {
        if (!this.isGitRepo()) {
            return [];
        }
        try {
            const output = (0, child_process_1.execSync)("git worktree list --porcelain", {
                cwd: this.repoPath,
                encoding: "utf-8",
            });
            const worktrees = [];
            const entries = output.split("\n\n");
            for (const entry of entries) {
                const lines = entry.split("\n");
                const worktreeLine = lines.find(l => l.startsWith("worktree "));
                const branchLine = lines.find(l => l.startsWith("branch "));
                if (worktreeLine) {
                    const worktreePath = worktreeLine.slice(9);
                    const branch = branchLine ? branchLine.slice(7) : "unknown";
                    const name = path.basename(worktreePath);
                    // Only include our managed worktrees
                    if (worktreePath.includes(".omni/worktrees")) {
                        worktrees.push({
                            name,
                            path: worktreePath,
                            branch,
                            createdAt: "unknown",
                        });
                    }
                }
            }
            return worktrees;
        }
        catch (e) {
            return [];
        }
    }
    // Get active worktree
    getActive() {
        return this.activeWorktree;
    }
    // Set active worktree
    setActive(name) {
        const worktreePath = path.join(this.worktreesDir, name);
        if (!fs.existsSync(worktreePath)) {
            throw new Error(`Worktree not found: ${name}`);
        }
        // Get branch name
        try {
            const branch = (0, child_process_1.execSync)("git branch --show-current", {
                cwd: worktreePath,
                encoding: "utf-8",
            }).trim();
            this.activeWorktree = {
                name,
                path: worktreePath,
                branch,
                createdAt: "unknown",
            };
        }
        catch (e) {
            throw new Error(`Failed to get worktree info: ${e.message}`);
        }
    }
    // Clear active worktree
    clearActive() {
        this.activeWorktree = null;
    }
}
exports.WorktreeManager = WorktreeManager;
