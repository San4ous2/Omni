"use strict";
// Enhanced Git skill - Claude Code level git operations
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
exports.enhancedGitSkill = void 0;
const path = __importStar(require("path"));
// Smart commit message generation
function generateSmartCommitMessage(diff, status) {
    const lines = status.split("\n").filter(l => l.trim());
    // Analyze changes
    const fileChanges = new Map();
    for (const line of lines) {
        if (!line.trim())
            continue;
        const statusCode = line.slice(0, 2);
        const file = line.slice(3);
        let changeType = "update";
        if (statusCode.includes("A") || statusCode === "??")
            changeType = "add";
        else if (statusCode.includes("D"))
            changeType = "delete";
        else if (statusCode.includes("M"))
            changeType = "update";
        else if (statusCode.includes("R"))
            changeType = "rename";
        fileChanges.set(file, { type: changeType, path: file });
    }
    // Group by directory/feature
    const byDir = new Map();
    for (const [file, change] of fileChanges) {
        const dir = path.dirname(file);
        if (!byDir.has(dir))
            byDir.set(dir, new Map());
        byDir.get(dir).set(file, change);
    }
    // Generate message based on patterns
    const changes = Array.from(fileChanges.values());
    const adds = changes.filter(c => c.type === "add").length;
    const updates = changes.filter(c => c.type === "update").length;
    const deletes = changes.filter(c => c.type === "delete").length;
    // Detect common patterns
    if (changes.length === 1) {
        const change = changes[0];
        const fileName = path.basename(change.path);
        return `${change.type} ${fileName}`;
    }
    // Multiple files in same directory
    if (byDir.size === 1) {
        const [dir, files] = Array.from(byDir.entries())[0];
        const dirName = dir === "." ? "root" : path.basename(dir);
        return `Update ${dirName} (${files.size} files)`;
    }
    // Mixed changes
    const parts = [];
    if (adds > 0)
        parts.push(`add ${adds} file${adds > 1 ? "s" : ""}`);
    if (updates > 0)
        parts.push(`update ${updates} file${updates > 1 ? "s" : ""}`);
    if (deletes > 0)
        parts.push(`delete ${deletes} file${deletes > 1 ? "s" : ""}`);
    return parts.join(", ") || "Update files";
}
// Create commit with best practices
async function smartCommit(tools, args, workDir) {
    try {
        // Check for changes
        const status = await tools.run("git status --porcelain");
        if (!status.trim()) {
            return { success: false, message: "No changes to commit" };
        }
        // Get current branch
        const branch = await tools.run("git branch --show-current");
        // Check if on main/master (warn user)
        if (["main", "master"].includes(branch.trim())) {
            return {
                success: false,
                message: "⚠️  You're on main/master branch. Create a feature branch first with /branch <name>",
            };
        }
        // Get diffs for analysis
        const diffStaged = await tools.run("git diff --cached");
        const diffUnstaged = await tools.run("git diff");
        // Stage all if nothing staged
        if (!diffStaged.trim() && diffUnstaged.trim()) {
            await tools.run("git add -A");
        }
        // Generate or use provided message
        let message = args.join(" ");
        if (!message) {
            const allDiff = diffStaged || diffUnstaged;
            message = generateSmartCommitMessage(allDiff, status);
        }
        // Add co-author attribution
        const fullMessage = `${message}\n\nCo-Authored-By: Omni Agent <noreply@omni.dev>`;
        // Create commit
        await tools.run(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`);
        // Get commit hash
        const hash = await tools.run("git rev-parse --short HEAD");
        return {
            success: true,
            message: `✓ Committed: ${message}`,
            data: { message, hash: hash.trim(), branch: branch.trim() },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Commit failed: ${error.message}`,
            error: error.message,
        };
    }
}
// Create pull request
async function createPR(tools, args, workDir) {
    try {
        // Check if gh CLI is available
        try {
            await tools.run("gh --version");
        }
        catch {
            return {
                success: false,
                message: "GitHub CLI (gh) not installed. Install from: https://cli.github.com/",
            };
        }
        // Get current branch
        const branch = await tools.run("git branch --show-current");
        const branchName = branch.trim();
        if (["main", "master"].includes(branchName)) {
            return {
                success: false,
                message: "Cannot create PR from main/master branch",
            };
        }
        // Check for unpushed commits
        try {
            await tools.run("git rev-parse @{u}");
        }
        catch {
            // No upstream, need to push
            await tools.run(`git push -u origin ${branchName}`);
        }
        // Get commits for PR description
        const log = await tools.run("git log origin/main..HEAD --oneline");
        const commits = log.trim().split("\n").filter((c) => Boolean(c));
        // Generate PR title and body
        const title = args.join(" ") || commits[0]?.slice(8) || "Update from omni-agent";
        const body = `## Summary\n${commits.map((c) => `- ${c.slice(8)}`).join("\n")}\n\n## Test plan\n- [ ] Manual testing completed\n- [ ] All tests passing\n\n🤖 Generated with Omni Agent`;
        // Create PR
        const prUrl = await tools.run(`gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}"`);
        return {
            success: true,
            message: `✓ Pull request created`,
            data: { url: prUrl.trim(), title, commits: commits.length },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `PR creation failed: ${error.message}`,
            error: error.message,
        };
    }
}
// Branch management
async function manageBranch(tools, args) {
    if (args.length === 0) {
        // List branches with status
        const branches = await tools.run("git branch -vv");
        const current = await tools.run("git branch --show-current");
        return {
            success: true,
            message: "Branches:",
            data: { branches, current: current.trim() },
        };
    }
    const branchName = args[0];
    const action = args[1] || "create";
    try {
        switch (action) {
            case "create":
            case "new":
                await tools.run(`git checkout -b ${branchName}`);
                return {
                    success: true,
                    message: `✓ Created and switched to branch: ${branchName}`,
                };
            case "switch":
            case "checkout":
                await tools.run(`git checkout ${branchName}`);
                return {
                    success: true,
                    message: `✓ Switched to branch: ${branchName}`,
                };
            case "delete":
            case "remove":
                const current = await tools.run("git branch --show-current");
                if (current.trim() === branchName) {
                    return {
                        success: false,
                        message: "Cannot delete current branch. Switch to another branch first.",
                    };
                }
                await tools.run(`git branch -d ${branchName}`);
                return {
                    success: true,
                    message: `✓ Deleted branch: ${branchName}`,
                };
            case "push":
                await tools.run(`git push -u origin ${branchName}`);
                return {
                    success: true,
                    message: `✓ Pushed branch: ${branchName}`,
                };
            default:
                return {
                    success: false,
                    message: `Unknown action: ${action}. Use: create, switch, delete, push`,
                };
        }
    }
    catch (error) {
        return {
            success: false,
            message: `Branch operation failed: ${error.message}`,
            error: error.message,
        };
    }
}
// Enhanced diff with stats
async function enhancedDiff(tools, args) {
    try {
        const staged = args.includes("--staged") || args.includes("--cached");
        const file = args.find(a => !a.startsWith("--"));
        let cmd = staged ? "git diff --cached" : "git diff";
        if (file)
            cmd += ` -- ${file}`;
        const diff = await tools.run(cmd);
        const stats = await tools.run(`${cmd} --stat`);
        return {
            success: true,
            message: "Git diff:",
            data: {
                diff,
                stats,
                staged,
                file,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Diff failed: ${error.message}`,
            error: error.message,
        };
    }
}
// Git status with helpful info
async function enhancedStatus(tools) {
    try {
        const status = await tools.run("git status");
        const branch = await tools.run("git branch --show-current");
        // Check if branch has upstream
        let upstream = "";
        try {
            upstream = await tools.run("git rev-parse --abbrev-ref @{u}");
        }
        catch {
            upstream = "No upstream configured";
        }
        // Count commits ahead/behind
        let aheadBehind = "";
        if (upstream && !upstream.includes("No upstream")) {
            try {
                const ahead = await tools.run("git rev-list --count @{u}..HEAD");
                const behind = await tools.run("git rev-list --count HEAD..@{u}");
                aheadBehind = `Ahead: ${ahead.trim()}, Behind: ${behind.trim()}`;
            }
            catch {
                aheadBehind = "Cannot determine ahead/behind";
            }
        }
        return {
            success: true,
            message: "Git status:",
            data: {
                status,
                branch: branch.trim(),
                upstream: upstream.trim(),
                aheadBehind,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Status failed: ${error.message}`,
            error: error.message,
        };
    }
}
exports.enhancedGitSkill = {
    name: "git",
    description: "Advanced git operations: smart commits, PRs, branch management",
    usage: "/commit [msg], /pr [title], /branch <name> [action], /diff [--staged] [file], /status",
    trigger: /^\/(commit|pr|pull-request|branch|diff|status|git)/,
    async execute(context) {
        const { input, args, tools, workDir } = context;
        try {
            if (input.startsWith("/commit")) {
                return await smartCommit(tools, args, workDir);
            }
            else if (input.startsWith("/pr") || input.startsWith("/pull-request")) {
                return await createPR(tools, args, workDir);
            }
            else if (input.startsWith("/branch")) {
                return await manageBranch(tools, args);
            }
            else if (input.startsWith("/diff")) {
                return await enhancedDiff(tools, args);
            }
            else if (input.startsWith("/status")) {
                return await enhancedStatus(tools);
            }
            return {
                success: false,
                message: "Unknown git command. Use: /commit, /pr, /branch, /diff, /status",
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Git operation failed: ${error instanceof Error ? error.message : String(error)}`,
                error: String(error),
            };
        }
    },
};
