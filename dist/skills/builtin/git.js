"use strict";
// Git skill - smart git operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitSkill = void 0;
async function handleCommit(tools, args) {
    // Get git status
    const status = await tools.run("git status --short");
    if (!status.trim()) {
        return { success: false, message: "No changes to commit" };
    }
    // Get diff for commit message generation
    const diff = await tools.run("git diff --cached");
    const diffUnstaged = await tools.run("git diff");
    const allDiff = diff || diffUnstaged;
    // Stage all changes if nothing is staged
    if (!diff.trim() && diffUnstaged.trim()) {
        await tools.run("git add -A");
    }
    // Generate commit message from diff (simple heuristic)
    let message = args.join(" ");
    if (!message) {
        message = generateCommitMessage(allDiff, status);
    }
    // Create commit
    await tools.run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    return {
        success: true,
        message: `Committed: ${message}`,
        data: { message, status },
    };
}
async function handleBranch(tools, args) {
    if (args.length === 0) {
        // List branches
        const branches = await tools.run("git branch -a");
        return {
            success: true,
            message: "Branches:",
            data: { branches },
        };
    }
    const branchName = args[0];
    const action = args[1] || "create";
    if (action === "create" || action === "checkout") {
        await tools.run(`git checkout -b ${branchName}`);
        return {
            success: true,
            message: `Created and switched to branch: ${branchName}`,
        };
    }
    else if (action === "switch") {
        await tools.run(`git checkout ${branchName}`);
        return {
            success: true,
            message: `Switched to branch: ${branchName}`,
        };
    }
    else if (action === "delete") {
        await tools.run(`git branch -d ${branchName}`);
        return {
            success: true,
            message: `Deleted branch: ${branchName}`,
        };
    }
    return { success: false, message: "Unknown branch action" };
}
async function handleDiff(tools) {
    const diff = await tools.run("git diff");
    const diffCached = await tools.run("git diff --cached");
    return {
        success: true,
        message: "Git diff:",
        data: {
            unstaged: diff,
            staged: diffCached,
        },
    };
}
async function handleStatus(tools) {
    const status = await tools.run("git status");
    return {
        success: true,
        message: "Git status:",
        data: { status },
    };
}
function generateCommitMessage(diff, status) {
    // Simple heuristic for commit message generation
    const lines = status.split("\n").filter(l => l.trim());
    if (lines.length === 0)
        return "Update files";
    const added = lines.filter(l => l.startsWith("A ") || l.startsWith("??")).length;
    const modified = lines.filter(l => l.startsWith("M ")).length;
    const deleted = lines.filter(l => l.startsWith("D ")).length;
    const parts = [];
    if (added > 0)
        parts.push(`Add ${added} file${added > 1 ? "s" : ""}`);
    if (modified > 0)
        parts.push(`Update ${modified} file${modified > 1 ? "s" : ""}`);
    if (deleted > 0)
        parts.push(`Delete ${deleted} file${deleted > 1 ? "s" : ""}`);
    return parts.join(", ") || "Update files";
}
exports.gitSkill = {
    name: "git",
    description: "Git operations: commit, branch, diff, status",
    usage: "/commit, /branch [name], /diff, /status",
    trigger: /^\/(commit|branch|diff|status|git)/,
    async execute(context) {
        const { input, args, tools } = context;
        try {
            if (input.startsWith("/commit")) {
                return await handleCommit(tools, args);
            }
            else if (input.startsWith("/branch")) {
                return await handleBranch(tools, args);
            }
            else if (input.startsWith("/diff")) {
                return await handleDiff(tools);
            }
            else if (input.startsWith("/status")) {
                return await handleStatus(tools);
            }
            return {
                success: false,
                message: "Unknown git command. Use: /commit, /branch, /diff, /status",
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
