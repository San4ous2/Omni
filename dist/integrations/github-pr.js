"use strict";
// GitHub PR Comments Integration
// Enables inline code review comments and automated responses
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
exports.GitHubPRIntegration = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GitHubPRIntegration {
    constructor(workDir) {
        this.workDir = workDir;
    }
    /**
     * Check if gh CLI is available
     */
    checkGHCLI() {
        try {
            (0, child_process_1.execSync)("gh --version", { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get current PR number from branch
     */
    async getCurrentPR() {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            const output = (0, child_process_1.execSync)("gh pr view --json number", {
                cwd: this.workDir,
                encoding: "utf-8",
            });
            const data = JSON.parse(output);
            return data.number || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get PR information
     */
    async getPRInfo(prNumber) {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            const cmd = prNumber
                ? `gh pr view ${prNumber} --json number,title,state,author,url,headRefName,baseRefName`
                : `gh pr view --json number,title,state,author,url,headRefName,baseRefName`;
            const output = (0, child_process_1.execSync)(cmd, {
                cwd: this.workDir,
                encoding: "utf-8",
            });
            const data = JSON.parse(output);
            return {
                number: data.number,
                title: data.title,
                state: data.state,
                author: data.author.login,
                url: data.url,
                branch: data.headRefName,
                baseBranch: data.baseRefName,
            };
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Get all comments on a PR
     */
    async getPRComments(prNumber) {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            const cmd = prNumber
                ? `gh api repos/:owner/:repo/pulls/${prNumber}/comments`
                : `gh pr view --json comments --jq '.comments'`;
            const output = (0, child_process_1.execSync)(cmd, {
                cwd: this.workDir,
                encoding: "utf-8",
            });
            const data = JSON.parse(output);
            return data.map((comment) => ({
                id: comment.id,
                path: comment.path || "",
                line: comment.line || comment.original_line || 0,
                body: comment.body,
                user: comment.user?.login || "unknown",
                createdAt: comment.created_at,
                position: comment.position,
                diffHunk: comment.diff_hunk,
            }));
        }
        catch (e) {
            throw new Error(`Failed to get PR comments: ${e.message}`);
        }
    }
    /**
     * Post a review comment on a PR
     */
    async postReviewComment(prNumber, comment) {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            // Get the commit SHA for the file
            const commitSha = (0, child_process_1.execSync)("git rev-parse HEAD", {
                cwd: this.workDir,
                encoding: "utf-8",
            }).trim();
            // Create review comment using gh API
            const body = {
                body: comment.body,
                commit_id: commitSha,
                path: comment.path,
                line: comment.line,
                side: comment.side || "RIGHT",
            };
            (0, child_process_1.execSync)(`gh api repos/:owner/:repo/pulls/${prNumber}/comments -f body='${body.body}' -f commit_id='${body.commit_id}' -f path='${body.path}' -F line=${body.line} -f side='${body.side}'`, {
                cwd: this.workDir,
                stdio: "pipe",
            });
        }
        catch (e) {
            throw new Error(`Failed to post comment: ${e.message}`);
        }
    }
    /**
     * Post multiple review comments at once
     */
    async postReviewComments(prNumber, comments, reviewBody) {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            const commitSha = (0, child_process_1.execSync)("git rev-parse HEAD", {
                cwd: this.workDir,
                encoding: "utf-8",
            }).trim();
            // Create review with comments
            const review = {
                commit_id: commitSha,
                body: reviewBody || "Automated review from Omni Agent",
                event: "COMMENT",
                comments: comments.map((c) => ({
                    path: c.path,
                    line: c.line,
                    body: c.body,
                    side: c.side || "RIGHT",
                })),
            };
            const reviewJson = JSON.stringify(review).replace(/"/g, '\\"');
            (0, child_process_1.execSync)(`gh api repos/:owner/:repo/pulls/${prNumber}/reviews --input -`, {
                cwd: this.workDir,
                input: JSON.stringify(review),
                stdio: "pipe",
            });
        }
        catch (e) {
            throw new Error(`Failed to post review: ${e.message}`);
        }
    }
    /**
     * Reply to a specific comment
     */
    async replyToComment(prNumber, commentId, body) {
        if (!this.checkGHCLI()) {
            throw new Error("GitHub CLI (gh) not installed");
        }
        try {
            (0, child_process_1.execSync)(`gh api repos/:owner/:repo/pulls/comments/${commentId}/replies -f body='${body.replace(/'/g, "'\\''")}'`, {
                cwd: this.workDir,
                stdio: "pipe",
            });
        }
        catch (e) {
            throw new Error(`Failed to reply to comment: ${e.message}`);
        }
    }
    /**
     * Get unresolved review comments
     */
    async getUnresolvedComments(prNumber) {
        const allComments = await this.getPRComments(prNumber);
        // Filter for unresolved comments (no replies or not marked as resolved)
        // This is a simplified version - GitHub's API has more complex resolution tracking
        return allComments.filter((comment) => {
            // Comments asking questions or requesting changes
            const body = comment.body.toLowerCase();
            return (body.includes("?") ||
                body.includes("please") ||
                body.includes("should") ||
                body.includes("could") ||
                body.includes("fix") ||
                body.includes("change"));
        });
    }
    /**
     * Auto-respond to review comments with AI-generated responses
     */
    async autoRespondToComments(prNumber, aiProvider) {
        const unresolvedComments = await this.getUnresolvedComments(prNumber);
        let responded = 0;
        let skipped = 0;
        for (const comment of unresolvedComments) {
            try {
                // Read the file context
                const filePath = path.join(this.workDir, comment.path);
                if (!fs.existsSync(filePath)) {
                    skipped++;
                    continue;
                }
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const lines = fileContent.split("\n");
                // Get context around the commented line
                const startLine = Math.max(0, comment.line - 5);
                const endLine = Math.min(lines.length, comment.line + 5);
                const context = lines.slice(startLine, endLine).join("\n");
                // Generate response using AI (if provider available)
                let response;
                if (aiProvider) {
                    const prompt = `A code reviewer left this comment on line ${comment.line} of ${comment.path}:

"${comment.body}"

Here's the code context:
\`\`\`
${context}
\`\`\`

Generate a helpful, professional response addressing their concern. Be concise (2-3 sentences).`;
                    const aiResponse = await aiProvider.call([{ role: "user", content: prompt }], { max_tokens: 200 });
                    response = aiResponse.content || "Thank you for the feedback. I'll address this.";
                }
                else {
                    // Fallback response
                    response = `Thank you for the feedback on line ${comment.line}. I'll review this and make the necessary changes.`;
                }
                // Post reply
                await this.replyToComment(prNumber, comment.id, response);
                responded++;
            }
            catch (e) {
                skipped++;
            }
        }
        return { responded, skipped };
    }
    /**
     * Post automated code review on PR
     */
    async postAutomatedReview(prNumber, reviewResult) {
        if (!reviewResult.issues || reviewResult.issues.length === 0) {
            // No issues found - approve
            try {
                (0, child_process_1.execSync)(`gh pr review ${prNumber} --approve -b "✅ Automated review passed - no issues found"`, {
                    cwd: this.workDir,
                    stdio: "pipe",
                });
            }
            catch (e) {
                throw new Error(`Failed to approve PR: ${e.message}`);
            }
            return;
        }
        // Group issues by file
        const issuesByFile = new Map();
        for (const issue of reviewResult.issues) {
            if (!issuesByFile.has(issue.file)) {
                issuesByFile.set(issue.file, []);
            }
            issuesByFile.get(issue.file).push(issue);
        }
        // Create review comments
        const comments = [];
        for (const [file, issues] of issuesByFile) {
            for (const issue of issues) {
                if (issue.line) {
                    const emoji = issue.severity === "critical"
                        ? "🔴"
                        : issue.severity === "high"
                            ? "🟠"
                            : issue.severity === "medium"
                                ? "🟡"
                                : "🔵";
                    const body = `${emoji} **${issue.category}** (${issue.severity})

${issue.message}

${issue.suggestion ? `**Suggestion:**\n${issue.suggestion}` : ""}

${issue.cwe ? `CWE: ${issue.cwe}` : ""}
${issue.owasp ? `OWASP: ${issue.owasp}` : ""}`;
                    comments.push({
                        path: file,
                        line: issue.line,
                        body,
                    });
                }
            }
        }
        // Post review with comments
        const hasCritical = reviewResult.issues.some((i) => i.severity === "critical");
        const reviewBody = `## 🤖 Automated Code Review

**Summary:**
- Critical: ${reviewResult.summary.critical}
- High: ${reviewResult.summary.high}
- Medium: ${reviewResult.summary.medium}
- Low: ${reviewResult.summary.low}

**Score:** ${reviewResult.score}/100

${hasCritical ? "⚠️ **Critical issues found - please address before merging**" : ""}

Generated by Omni Agent`;
        await this.postReviewComments(prNumber, comments, reviewBody);
    }
}
exports.GitHubPRIntegration = GitHubPRIntegration;
