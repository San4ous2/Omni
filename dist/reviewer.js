"use strict";
// Code Review Automation System
// Automatically reviews code for bugs, security issues, and quality
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
exports.CodeReviewer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class CodeReviewer {
    constructor(workDir, provider, model) {
        this.workDir = workDir;
        this.provider = provider;
        this.model = model;
    }
    /**
     * Review staged files in git
     */
    async reviewStaged() {
        const stagedFiles = this.getStagedFiles();
        return this.reviewFiles(stagedFiles);
    }
    /**
     * Review specific files
     */
    async reviewFiles(files) {
        const issues = [];
        let totalLines = 0;
        for (const file of files) {
            // Use absolute path if provided, otherwise join with workDir
            const filePath = path.isAbsolute(file) ? file : path.join(this.workDir, file);
            if (!fs.existsSync(filePath))
                continue;
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n");
            totalLines += lines.length;
            // Run various checks
            issues.push(...this.checkSecurity(file, content, lines));
            issues.push(...this.checkBugs(file, content, lines));
            issues.push(...this.checkPerformance(file, content, lines));
            issues.push(...this.checkStyle(file, content, lines));
            issues.push(...this.checkAccessibility(file, content, lines));
            issues.push(...this.checkMaintainability(file, content, lines));
            // AI-powered review if provider available
            if (this.provider && this.model) {
                const aiIssues = await this.aiReview(file, content);
                issues.push(...aiIssues);
            }
        }
        const summary = this.summarizeIssues(issues);
        const score = this.calculateScore(issues, totalLines);
        const aiInsights = this.provider && this.model ? await this.getAIInsights(issues, files) : undefined;
        return {
            issues,
            summary,
            filesReviewed: files.length,
            linesReviewed: totalLines,
            score,
            aiInsights,
        };
    }
    /**
     * Security checks
     */
    checkSecurity(file, content, lines) {
        const issues = [];
        // Check for hardcoded secrets
        const secretPatterns = [
            { pattern: /password\s*=\s*["'][^"']+["']/gi, msg: "Hardcoded password detected", cwe: "CWE-798", owasp: "A07:2021" },
            { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi, msg: "Hardcoded API key detected", cwe: "CWE-798", owasp: "A07:2021" },
            { pattern: /secret\s*=\s*["'][^"']+["']/gi, msg: "Hardcoded secret detected", cwe: "CWE-798", owasp: "A07:2021" },
            { pattern: /token\s*=\s*["'][^"']+["']/gi, msg: "Hardcoded token detected", cwe: "CWE-798", owasp: "A07:2021" },
            { pattern: /private[_-]?key\s*=\s*["'][^"']+["']/gi, msg: "Hardcoded private key detected", cwe: "CWE-798", owasp: "A07:2021" },
        ];
        for (const { pattern, msg, cwe, owasp } of secretPatterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                const line = this.getLineNumber(content, match.index);
                issues.push({
                    file,
                    line,
                    severity: "critical",
                    category: "security",
                    message: msg,
                    suggestion: "Use environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault)",
                    code: lines[line - 1]?.trim(),
                    cwe,
                    owasp,
                });
            }
        }
        // Check for SQL injection vulnerabilities
        if (/\$\{.*\}|`\$\{.*\}`/.test(content) && /SELECT|INSERT|UPDATE|DELETE/i.test(content)) {
            const sqlLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /SELECT|INSERT|UPDATE|DELETE/i.test(line) && /\$\{/.test(line));
            for (const { line, num } of sqlLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "critical",
                    category: "security",
                    message: "Potential SQL injection vulnerability",
                    suggestion: "Use parameterized queries or an ORM (e.g., Prisma, TypeORM)",
                    code: line.trim(),
                    cwe: "CWE-89",
                    owasp: "A03:2021",
                });
            }
        }
        // Check for eval() usage
        if (/\beval\s*\(/.test(content)) {
            const evalLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /\beval\s*\(/.test(line));
            for (const { line, num } of evalLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "high",
                    category: "security",
                    message: "Use of eval() is dangerous and can lead to code injection",
                    suggestion: "Avoid eval() or use safer alternatives like JSON.parse() or Function constructor with validation",
                    code: line.trim(),
                    cwe: "CWE-95",
                    owasp: "A03:2021",
                });
            }
        }
        // Check for XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
        if (/innerHTML|dangerouslySetInnerHTML/.test(content)) {
            const xssLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /innerHTML|dangerouslySetInnerHTML/.test(line));
            for (const { line, num } of xssLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "high",
                    category: "security",
                    message: "Potential XSS vulnerability",
                    suggestion: "Sanitize user input with DOMPurify or use safe DOM methods like textContent",
                    code: line.trim(),
                    cwe: "CWE-79",
                    owasp: "A03:2021",
                });
            }
        }
        // Check for insecure random number generation
        if (/Math\.random\(\)/.test(content) && /password|token|key|secret|session/i.test(content)) {
            const randomLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /Math\.random\(\)/.test(line));
            for (const { line, num } of randomLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "high",
                    category: "security",
                    message: "Math.random() is not cryptographically secure",
                    suggestion: "Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive operations",
                    code: line.trim(),
                    cwe: "CWE-338",
                    owasp: "A02:2021",
                });
            }
        }
        // Check for weak crypto algorithms
        const weakCrypto = ["MD5", "SHA1", "DES", "RC4"];
        for (const algo of weakCrypto) {
            if (new RegExp(algo, "i").test(content)) {
                const algoLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                    .filter(({ line }) => new RegExp(algo, "i").test(line));
                for (const { line, num } of algoLines) {
                    issues.push({
                        file,
                        line: num,
                        severity: "high",
                        category: "security",
                        message: `Weak cryptographic algorithm ${algo} detected`,
                        suggestion: "Use strong algorithms like SHA-256, SHA-3, or AES-256",
                        code: line.trim(),
                        cwe: "CWE-327",
                        owasp: "A02:2021",
                    });
                }
            }
        }
        // Check for path traversal vulnerabilities
        if (/\.\.[\/\\]/.test(content) || /path\.join.*\.\./i.test(content)) {
            const pathLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /\.\.[\/\\]/.test(line) || /path\.join.*\.\./i.test(line));
            for (const { line, num } of pathLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "high",
                    category: "security",
                    message: "Potential path traversal vulnerability",
                    suggestion: "Validate and sanitize file paths, use path.resolve() and check if result is within allowed directory",
                    code: line.trim(),
                    cwe: "CWE-22",
                    owasp: "A01:2021",
                });
            }
        }
        // Check for command injection
        if (/exec\(|spawn\(|system\(/i.test(content) && /\$\{|\+/.test(content)) {
            const cmdLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /exec\(|spawn\(|system\(/i.test(line) && /\$\{|\+/.test(line));
            for (const { line, num } of cmdLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "critical",
                    category: "security",
                    message: "Potential command injection vulnerability",
                    suggestion: "Use parameterized commands or validate/sanitize all user input",
                    code: line.trim(),
                    cwe: "CWE-78",
                    owasp: "A03:2021",
                });
            }
        }
        return issues;
    }
    /**
     * Bug detection checks
     */
    checkBugs(file, content, lines) {
        const issues = [];
        // Check for == instead of ===
        const looseEqualityLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
            .filter(({ line }) => /[^=!<>]==[^=]/.test(line) && !/===/.test(line));
        for (const { line, num } of looseEqualityLines) {
            issues.push({
                file,
                line: num,
                severity: "medium",
                category: "bug",
                message: "Use === instead of == for comparison",
                suggestion: "Replace == with ===",
                code: line.trim(),
            });
        }
        // Check for missing await
        const asyncLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
            .filter(({ line }) => /\.(then|catch)\(/.test(line) && !/await/.test(line) && !/return/.test(line));
        for (const { line, num } of asyncLines) {
            issues.push({
                file,
                line: num,
                severity: "medium",
                category: "bug",
                message: "Promise not awaited or returned",
                suggestion: "Add await or return the promise",
                code: line.trim(),
            });
        }
        // Check for console.log in production code
        if (!file.includes("test") && !file.includes("spec")) {
            const consoleLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /console\.(log|debug|info)/.test(line) && !/\/\//.test(line));
            for (const { line, num } of consoleLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "low",
                    category: "best-practice",
                    message: "console.log found in production code",
                    suggestion: "Remove or replace with proper logging",
                    code: line.trim(),
                });
            }
        }
        return issues;
    }
    /**
     * Performance checks
     */
    checkPerformance(file, content, lines) {
        const issues = [];
        // Check for nested loops
        const nestedLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*for\s*\(/gs;
        if (nestedLoopPattern.test(content)) {
            issues.push({
                file,
                severity: "medium",
                category: "performance",
                message: "Nested loops detected - potential O(n²) complexity",
                suggestion: "Consider using a more efficient algorithm or data structure",
            });
        }
        // Check for synchronous file operations
        const syncOps = ["readFileSync", "writeFileSync", "existsSync"];
        for (const op of syncOps) {
            if (content.includes(op)) {
                const opLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                    .filter(({ line }) => line.includes(op));
                for (const { line, num } of opLines) {
                    issues.push({
                        file,
                        line: num,
                        severity: "low",
                        category: "performance",
                        message: `Synchronous operation ${op} blocks event loop`,
                        suggestion: `Use async version: ${op.replace("Sync", "")}`,
                        code: line.trim(),
                    });
                }
            }
        }
        return issues;
    }
    /**
     * Style and best practice checks
     */
    checkStyle(file, content, lines) {
        const issues = [];
        // Check for var usage
        const varLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
            .filter(({ line }) => /\bvar\s+/.test(line));
        for (const { line, num } of varLines) {
            issues.push({
                file,
                line: num,
                severity: "low",
                category: "style",
                message: "Use const or let instead of var",
                suggestion: "Replace var with const or let",
                code: line.trim(),
            });
        }
        // Check for long functions (>50 lines)
        const functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
            const startLine = this.getLineNumber(content, match.index);
            const endLine = this.findClosingBrace(lines, startLine);
            const length = endLine - startLine;
            if (length > 50) {
                issues.push({
                    file,
                    line: startLine,
                    severity: "info",
                    category: "best-practice",
                    message: `Function is ${length} lines long`,
                    suggestion: "Consider breaking into smaller functions",
                });
            }
        }
        return issues;
    }
    /**
     * Get staged files from git
     */
    getStagedFiles() {
        try {
            const output = (0, child_process_1.execSync)("git diff --cached --name-only", {
                cwd: this.workDir,
                encoding: "utf-8",
            });
            return output.trim().split("\n").filter(f => f && this.isCodeFile(f));
        }
        catch {
            return [];
        }
    }
    /**
     * Check if file is a code file
     */
    isCodeFile(file) {
        const codeExtensions = [".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp"];
        return codeExtensions.some(ext => file.endsWith(ext));
    }
    /**
     * Get line number from string index
     */
    getLineNumber(content, index) {
        return content.substring(0, index).split("\n").length;
    }
    /**
     * Find closing brace for a function
     */
    findClosingBrace(lines, startLine) {
        let braceCount = 0;
        let started = false;
        for (let i = startLine - 1; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === "{") {
                    braceCount++;
                    started = true;
                }
                else if (char === "}") {
                    braceCount--;
                    if (started && braceCount === 0) {
                        return i + 1;
                    }
                }
            }
        }
        return startLine;
    }
    /**
     * Summarize issues by severity
     */
    summarizeIssues(issues) {
        return {
            critical: issues.filter(i => i.severity === "critical").length,
            high: issues.filter(i => i.severity === "high").length,
            medium: issues.filter(i => i.severity === "medium").length,
            low: issues.filter(i => i.severity === "low").length,
            info: issues.filter(i => i.severity === "info").length,
        };
    }
    /**
     * Format review result as markdown
     */
    formatResult(result) {
        const lines = [];
        lines.push("# Code Review Report\n");
        lines.push(`**Files Reviewed:** ${result.filesReviewed}`);
        lines.push(`**Lines Reviewed:** ${result.linesReviewed}`);
        lines.push(`**Total Issues:** ${result.issues.length}\n`);
        lines.push("## Summary");
        lines.push(`- 🔴 Critical: ${result.summary.critical}`);
        lines.push(`- 🟠 High: ${result.summary.high}`);
        lines.push(`- 🟡 Medium: ${result.summary.medium}`);
        lines.push(`- 🟢 Low: ${result.summary.low}`);
        lines.push(`- ℹ️  Info: ${result.summary.info}\n`);
        if (result.issues.length === 0) {
            lines.push("✅ No issues found!");
            return lines.join("\n");
        }
        // Group by severity
        const bySeverity = {
            critical: result.issues.filter(i => i.severity === "critical"),
            high: result.issues.filter(i => i.severity === "high"),
            medium: result.issues.filter(i => i.severity === "medium"),
            low: result.issues.filter(i => i.severity === "low"),
            info: result.issues.filter(i => i.severity === "info"),
        };
        for (const [severity, issues] of Object.entries(bySeverity)) {
            if (issues.length === 0)
                continue;
            const icon = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "ℹ️" }[severity];
            lines.push(`\n## ${icon} ${severity.toUpperCase()} (${issues.length})\n`);
            for (const issue of issues) {
                lines.push(`### ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
                lines.push(`**Category:** ${issue.category}`);
                lines.push(`**Message:** ${issue.message}`);
                if (issue.suggestion) {
                    lines.push(`**Suggestion:** ${issue.suggestion}`);
                }
                if (issue.code) {
                    lines.push(`\`\`\`\n${issue.code}\n\`\`\``);
                }
                lines.push("");
            }
        }
        return lines.join("\n");
    }
    /**
     * Accessibility checks
     */
    checkAccessibility(file, content, lines) {
        const issues = [];
        // Only check frontend files
        if (!file.match(/\.(jsx|tsx|html)$/))
            return issues;
        // Check for missing alt text on images
        const imgWithoutAlt = /<img(?![^>]*alt=)/gi;
        if (imgWithoutAlt.test(content)) {
            const imgLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /<img/.test(line) && !/alt=/.test(line));
            for (const { line, num } of imgLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "medium",
                    category: "accessibility",
                    message: "Image missing alt attribute",
                    suggestion: "Add descriptive alt text for screen readers",
                    code: line.trim(),
                    cwe: "CWE-1173",
                });
            }
        }
        // Check for missing labels on form inputs
        if (/<input/.test(content)) {
            const inputLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /<input/.test(line) && !/aria-label|id=/.test(line));
            for (const { line, num } of inputLines) {
                issues.push({
                    file,
                    line: num,
                    severity: "medium",
                    category: "accessibility",
                    message: "Form input missing label or aria-label",
                    suggestion: "Add a label element or aria-label attribute",
                    code: line.trim(),
                });
            }
        }
        // Check for missing button text
        if (/<button[^>]*>[\s]*<\/button>/gi.test(content)) {
            const emptyButtons = lines.map((l, i) => ({ line: l, num: i + 1 }))
                .filter(({ line }) => /<button[^>]*>[\s]*<\/button>/gi.test(line));
            for (const { line, num } of emptyButtons) {
                issues.push({
                    file,
                    line: num,
                    severity: "high",
                    category: "accessibility",
                    message: "Button has no accessible text",
                    suggestion: "Add text content or aria-label to button",
                    code: line.trim(),
                });
            }
        }
        return issues;
    }
    /**
     * Maintainability checks
     */
    checkMaintainability(file, content, lines) {
        const issues = [];
        // Check for TODO/FIXME comments
        const todoLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
            .filter(({ line }) => /\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line));
        for (const { line, num } of todoLines) {
            issues.push({
                file,
                line: num,
                severity: "info",
                category: "maintainability",
                message: "TODO/FIXME comment found",
                suggestion: "Create a ticket to track this work",
                code: line.trim(),
            });
        }
        // Check for commented-out code
        const commentedCodeLines = lines.map((l, i) => ({ line: l, num: i + 1 }))
            .filter(({ line }) => {
            const trimmed = line.trim();
            return trimmed.startsWith("//") &&
                trimmed.length > 20 &&
                /[{};()=]/.test(trimmed);
        });
        if (commentedCodeLines.length > 3) {
            issues.push({
                file,
                severity: "low",
                category: "maintainability",
                message: `${commentedCodeLines.length} lines of commented-out code found`,
                suggestion: "Remove commented code or use version control",
            });
        }
        // Check for duplicate code blocks
        const codeBlocks = new Map();
        for (let i = 0; i < lines.length - 5; i++) {
            const block = lines.slice(i, i + 5).join("\n").trim();
            if (block.length > 50 && !/^\s*\/\//.test(block)) {
                if (!codeBlocks.has(block)) {
                    codeBlocks.set(block, []);
                }
                codeBlocks.get(block).push(i + 1);
            }
        }
        for (const [block, lineNumbers] of codeBlocks) {
            if (lineNumbers.length > 1) {
                issues.push({
                    file,
                    line: lineNumbers[0],
                    severity: "medium",
                    category: "maintainability",
                    message: `Duplicate code block found at lines ${lineNumbers.join(", ")}`,
                    suggestion: "Extract duplicate code into a reusable function",
                });
            }
        }
        return issues;
    }
    /**
     * AI-powered code review
     */
    async aiReview(file, content) {
        if (!this.provider || !this.model)
            return [];
        const messages = [
            {
                role: "system",
                content: `You are an expert code reviewer. Analyze code for subtle issues that static analysis might miss.

Focus on:
1. Logic errors and edge cases
2. Race conditions and concurrency issues
3. Memory leaks
4. Incorrect error handling
5. Business logic flaws
6. Design pattern violations

Return JSON array:
[{"line": 10, "severity": "high", "category": "bug", "message": "...", "suggestion": "..."}]`,
            },
            {
                role: "user",
                content: `Review this code for subtle issues:

File: ${file}

\`\`\`
${content}
\`\`\``,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 2048,
            });
            const responseContent = response.content || "";
            const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
            if (!jsonMatch)
                return [];
            const aiIssues = JSON.parse(jsonMatch[0]);
            return aiIssues.map((issue) => ({
                file,
                line: issue.line,
                severity: issue.severity || "medium",
                category: issue.category || "bug",
                message: issue.message,
                suggestion: issue.suggestion,
            }));
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get AI insights about the overall code quality
     */
    async getAIInsights(issues, files) {
        if (!this.provider || !this.model)
            return [];
        const summary = this.summarizeIssues(issues);
        const messages = [
            {
                role: "system",
                content: "You are a senior code reviewer. Provide high-level insights about code quality.",
            },
            {
                role: "user",
                content: `Provide 3-5 key insights about this code review:

Files reviewed: ${files.join(", ")}
Total issues: ${issues.length}
Critical: ${summary.critical}
High: ${summary.high}
Medium: ${summary.medium}
Low: ${summary.low}

Top issues:
${issues.slice(0, 5).map(i => `- ${i.category}: ${i.message}`).join("\n")}

Return insights as a JSON array of strings.`,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 1024,
            });
            const content = response.content || "";
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch (error) {
            // Fall back to basic insights
        }
        return this.generateBasicInsights(issues, summary);
    }
    /**
     * Generate basic insights without AI
     */
    generateBasicInsights(issues, summary) {
        const insights = [];
        if (summary.critical > 0) {
            insights.push(`🔴 ${summary.critical} critical security issues require immediate attention`);
        }
        const securityIssues = issues.filter(i => i.category === "security").length;
        if (securityIssues > issues.length * 0.3) {
            insights.push("⚠️ High concentration of security issues - consider a security audit");
        }
        const performanceIssues = issues.filter(i => i.category === "performance").length;
        if (performanceIssues > 5) {
            insights.push("🐌 Multiple performance issues detected - consider optimization");
        }
        const maintainabilityIssues = issues.filter(i => i.category === "maintainability").length;
        if (maintainabilityIssues > 10) {
            insights.push("🔧 Code maintainability could be improved - consider refactoring");
        }
        if (issues.length === 0) {
            insights.push("✅ No issues found - code quality looks good!");
        }
        return insights;
    }
    /**
     * Calculate overall code quality score
     */
    calculateScore(issues, totalLines) {
        let score = 100;
        // Deduct points based on severity
        const summary = this.summarizeIssues(issues);
        score -= summary.critical * 10;
        score -= summary.high * 5;
        score -= summary.medium * 2;
        score -= summary.low * 1;
        score -= summary.info * 0.5;
        // Bonus for low issue density
        const issuesPerLine = totalLines > 0 ? issues.length / totalLines : 0;
        if (issuesPerLine < 0.01) {
            score += 5;
        }
        // Clamp score between 0 and 100
        return Math.max(0, Math.min(100, Math.round(score)));
    }
}
exports.CodeReviewer = CodeReviewer;
