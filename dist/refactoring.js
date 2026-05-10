"use strict";
// Refactoring Assistant System
// AI-powered code refactoring with safety checks and previews
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
exports.RefactoringAssistant = void 0;
exports.getRefactoringSuggestions = getRefactoringSuggestions;
exports.detectCodeSmells = detectCodeSmells;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RefactoringAssistant {
    constructor(workDir, provider, model) {
        this.workDir = workDir;
        this.provider = provider;
        this.model = model;
    }
    /**
     * Detect code smells in a file
     */
    async detectCodeSmells(filePath) {
        const fullPath = path.join(this.workDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const code = fs.readFileSync(fullPath, "utf-8");
        const lines = code.split("\n");
        const smells = [];
        // Static analysis for common code smells
        smells.push(...this.detectLongMethods(code, filePath));
        smells.push(...this.detectLargeClasses(code, filePath));
        smells.push(...this.detectComplexConditionals(code, filePath));
        smells.push(...this.detectMagicNumbers(code, filePath));
        smells.push(...this.detectDeadCode(code, filePath));
        // AI-powered analysis for subtle issues
        const aiSmells = await this.aiDetectCodeSmells(code, filePath);
        smells.push(...aiSmells);
        return smells.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }
    /**
     * Suggest refactorings for a file
     */
    async suggestRefactorings(filePath) {
        const smells = await this.detectCodeSmells(filePath);
        const suggestions = [];
        for (const smell of smells) {
            const suggestion = this.smellToSuggestion(smell);
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }
        return suggestions;
    }
    /**
     * Extract a function from selected code
     */
    async extractFunction(filePath, startLine, endLine, functionName, preview = true) {
        const fullPath = path.join(this.workDir, filePath);
        const code = fs.readFileSync(fullPath, "utf-8");
        const lines = code.split("\n");
        // Validate selection
        if (startLine < 1 || endLine > lines.length || startLine > endLine) {
            return {
                success: false,
                type: "extract-function",
                changes: [],
                error: "Invalid line range",
            };
        }
        // Extract the selected code
        const selectedCode = lines.slice(startLine - 1, endLine).join("\n");
        // Use AI to generate the refactored code
        const messages = [
            {
                role: "system",
                content: `You are an expert code refactoring assistant. Extract the selected code into a well-designed function.

Rules:
1. Analyze variable dependencies (parameters and return values)
2. Choose appropriate parameter names
3. Add proper type annotations
4. Include JSDoc/TSDoc comments
5. Preserve original behavior exactly
6. Return valid, runnable code`,
            },
            {
                role: "user",
                content: `Extract this code into a function named "${functionName}":

\`\`\`
${selectedCode}
\`\`\`

Full file context:
\`\`\`
${code}
\`\`\`

Provide:
1. The extracted function with proper signature
2. The replacement call at the original location
3. List of parameters and return type`,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 4096,
            });
            const result = this.parseExtractionResponse(response.content || "");
            if (!result) {
                return {
                    success: false,
                    type: "extract-function",
                    changes: [],
                    error: "Failed to parse AI response",
                };
            }
            // Build the refactored code
            const newLines = [...lines];
            // Replace selected lines with function call
            newLines.splice(startLine - 1, endLine - startLine + 1, result.call);
            // Insert function definition (before the usage or at appropriate location)
            const insertLine = this.findInsertionPoint(newLines, startLine - 1);
            newLines.splice(insertLine, 0, "", result.function, "");
            const newContent = newLines.join("\n");
            const change = {
                file: filePath,
                oldContent: code,
                newContent,
                diff: this.generateDiff(code, newContent),
            };
            if (preview) {
                return {
                    success: true,
                    type: "extract-function",
                    changes: [change],
                    preview: change.diff,
                    warnings: result.warnings,
                };
            }
            // Apply the changes
            fs.writeFileSync(fullPath, newContent, "utf-8");
            return {
                success: true,
                type: "extract-function",
                changes: [change],
                warnings: result.warnings,
            };
        }
        catch (error) {
            return {
                success: false,
                type: "extract-function",
                changes: [],
                error: error.message,
            };
        }
    }
    /**
     * Rename a symbol across the codebase
     */
    async renameSymbol(symbol, newName, scope = "file", filePath) {
        const changes = [];
        const files = scope === "file" && filePath
            ? [filePath]
            : this.findFilesWithSymbol(symbol);
        for (const file of files) {
            const fullPath = path.join(this.workDir, file);
            const code = fs.readFileSync(fullPath, "utf-8");
            // Use AI to perform intelligent renaming (respects scope, shadowing, etc.)
            const newContent = await this.aiRenameSymbol(code, symbol, newName, file);
            if (newContent !== code) {
                changes.push({
                    file,
                    oldContent: code,
                    newContent,
                    diff: this.generateDiff(code, newContent),
                });
            }
        }
        if (changes.length === 0) {
            return {
                success: false,
                type: "rename",
                changes: [],
                error: `Symbol "${symbol}" not found`,
            };
        }
        // Apply changes
        for (const change of changes) {
            const fullPath = path.join(this.workDir, change.file);
            fs.writeFileSync(fullPath, change.newContent, "utf-8");
        }
        return {
            success: true,
            type: "rename",
            changes,
        };
    }
    /**
     * Simplify complex code
     */
    async simplifyCode(filePath, target) {
        const fullPath = path.join(this.workDir, filePath);
        const code = fs.readFileSync(fullPath, "utf-8");
        const messages = [
            {
                role: "system",
                content: `You are an expert code refactoring assistant. Simplify complex code while preserving behavior.

Focus on:
1. Reducing cyclomatic complexity
2. Eliminating nested conditionals
3. Extracting complex expressions
4. Using early returns
5. Applying design patterns where appropriate
6. Improving readability

CRITICAL: Preserve exact behavior. Only simplify structure.`,
            },
            {
                role: "user",
                content: target
                    ? `Simplify this specific code:\n\n\`\`\`\n${this.extractTarget(code, target)}\n\`\`\`\n\nFull context:\n\`\`\`\n${code}\n\`\`\``
                    : `Simplify this code:\n\n\`\`\`\n${code}\n\`\`\``,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 8192,
            });
            const newContent = this.extractCode(response.content || "");
            if (!newContent || newContent === code) {
                return {
                    success: false,
                    type: "simplify",
                    changes: [],
                    error: "No simplifications found",
                };
            }
            const change = {
                file: filePath,
                oldContent: code,
                newContent,
                diff: this.generateDiff(code, newContent),
            };
            fs.writeFileSync(fullPath, newContent, "utf-8");
            return {
                success: true,
                type: "simplify",
                changes: [change],
            };
        }
        catch (error) {
            return {
                success: false,
                type: "simplify",
                changes: [],
                error: error.message,
            };
        }
    }
    /**
     * Optimize code for performance
     */
    async optimizeCode(filePath) {
        const fullPath = path.join(this.workDir, filePath);
        const code = fs.readFileSync(fullPath, "utf-8");
        const messages = [
            {
                role: "system",
                content: `You are an expert performance optimization specialist. Optimize code for better performance.

Focus on:
1. Algorithm efficiency (O(n) improvements)
2. Unnecessary loops or iterations
3. Redundant calculations
4. Memory allocations
5. Caching opportunities
6. Lazy evaluation

CRITICAL: Preserve exact behavior. Only optimize performance.`,
            },
            {
                role: "user",
                content: `Optimize this code for performance:\n\n\`\`\`\n${code}\n\`\`\`\n\nExplain each optimization.`,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 8192,
            });
            const result = this.parseOptimizationResponse(response.content || "");
            if (!result || result.code === code) {
                return {
                    success: false,
                    type: "optimize",
                    changes: [],
                    error: "No optimizations found",
                };
            }
            const change = {
                file: filePath,
                oldContent: code,
                newContent: result.code,
                diff: this.generateDiff(code, result.code),
            };
            fs.writeFileSync(fullPath, result.code, "utf-8");
            return {
                success: true,
                type: "optimize",
                changes: [change],
                warnings: result.explanations,
            };
        }
        catch (error) {
            return {
                success: false,
                type: "optimize",
                changes: [],
                error: error.message,
            };
        }
    }
    // ── Private Helper Methods ──────────────────────────────────────────────────
    detectLongMethods(code, file) {
        const smells = [];
        const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[=\(]/g;
        const lines = code.split("\n");
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            const functionName = match[1];
            const startLine = code.substring(0, match.index).split("\n").length;
            // Find function end (simplified - counts braces)
            let braceCount = 0;
            let endLine = startLine;
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
                            endLine = i + 1;
                            break;
                        }
                    }
                }
                if (started && braceCount === 0)
                    break;
            }
            const length = endLine - startLine;
            if (length > 50) {
                smells.push({
                    file,
                    line: startLine,
                    type: "long-method",
                    severity: length > 100 ? "high" : "medium",
                    description: `Function "${functionName}" is ${length} lines long`,
                    suggestion: "Consider breaking this function into smaller, focused functions",
                });
            }
        }
        return smells;
    }
    detectLargeClasses(code, file) {
        const smells = [];
        const classRegex = /class\s+(\w+)/g;
        let match;
        while ((match = classRegex.exec(code)) !== null) {
            const className = match[1];
            const startLine = code.substring(0, match.index).split("\n").length;
            // Count methods in class
            const classCode = this.extractClassCode(code, match.index);
            const methodCount = (classCode.match(/(?:public|private|protected)?\s*\w+\s*\(/g) || []).length;
            const lineCount = classCode.split("\n").length;
            if (methodCount > 20 || lineCount > 300) {
                smells.push({
                    file,
                    line: startLine,
                    type: "large-class",
                    severity: methodCount > 30 ? "high" : "medium",
                    description: `Class "${className}" has ${methodCount} methods and ${lineCount} lines`,
                    suggestion: "Consider splitting this class using Single Responsibility Principle",
                });
            }
        }
        return smells;
    }
    detectComplexConditionals(code, file) {
        const smells = [];
        const lines = code.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const andCount = (line.match(/&&/g) || []).length;
            const orCount = (line.match(/\|\|/g) || []).length;
            const complexity = andCount + orCount;
            if (complexity >= 3) {
                smells.push({
                    file,
                    line: i + 1,
                    type: "complex-conditional",
                    severity: complexity >= 5 ? "high" : "medium",
                    description: `Complex conditional with ${complexity} logical operators`,
                    suggestion: "Extract condition into a well-named boolean variable or function",
                });
            }
        }
        return smells;
    }
    detectMagicNumbers(code, file) {
        const smells = [];
        const lines = code.split("\n");
        const magicNumberRegex = /\b(\d{2,})\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip if line is a comment or contains common non-magic numbers
            if (line.trim().startsWith("//") || line.trim().startsWith("*"))
                continue;
            let match;
            while ((match = magicNumberRegex.exec(line)) !== null) {
                const number = match[1];
                // Skip common non-magic numbers
                if (["100", "1000", "10000"].includes(number))
                    continue;
                smells.push({
                    file,
                    line: i + 1,
                    type: "magic-number",
                    severity: "low",
                    description: `Magic number ${number} found`,
                    suggestion: `Replace with a named constant: const MEANINGFUL_NAME = ${number}`,
                });
            }
        }
        return smells;
    }
    detectDeadCode(code, file) {
        const smells = [];
        const lines = code.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Detect unreachable code after return
            if (i > 0 && lines[i - 1].trim().match(/^return\b/) && line && !line.startsWith("}")) {
                smells.push({
                    file,
                    line: i + 1,
                    type: "dead-code",
                    severity: "medium",
                    description: "Unreachable code after return statement",
                    suggestion: "Remove this unreachable code",
                });
            }
            // Detect commented-out code
            if (line.startsWith("//") && line.length > 20 && line.match(/[{};()]/)) {
                smells.push({
                    file,
                    line: i + 1,
                    type: "dead-code",
                    severity: "low",
                    description: "Commented-out code found",
                    suggestion: "Remove commented code or use version control",
                });
            }
        }
        return smells;
    }
    async aiDetectCodeSmells(code, file) {
        const messages = [
            {
                role: "system",
                content: `You are a code quality expert. Detect subtle code smells that static analysis might miss.

Focus on:
1. Poor naming conventions
2. Tight coupling
3. Feature envy
4. Data clumps
5. Primitive obsession
6. Inappropriate intimacy

Return JSON array of issues:
[{"line": 10, "type": "...", "severity": "...", "description": "...", "suggestion": "..."}]`,
            },
            {
                role: "user",
                content: `Analyze this code for subtle code smells:\n\n\`\`\`\n${code}\n\`\`\``,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 2048,
            });
            const content = response.content || "";
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch)
                return [];
            const issues = JSON.parse(jsonMatch[0]);
            return issues.map((issue) => ({
                file,
                line: issue.line,
                type: issue.type,
                severity: issue.severity,
                description: issue.description,
                suggestion: issue.suggestion,
            }));
        }
        catch (error) {
            return [];
        }
    }
    smellToSuggestion(smell) {
        const typeMap = {
            "long-method": "extract-function",
            "large-class": "extract-class",
            "complex-conditional": "simplify",
            "magic-number": "extract-constant",
            "dead-code": "remove",
        };
        const type = typeMap[smell.type];
        if (!type)
            return null;
        return {
            type,
            target: `${smell.file}:${smell.line}`,
            reason: smell.description,
            benefit: smell.suggestion,
            effort: smell.severity === "high" ? "high" : smell.severity === "medium" ? "medium" : "low",
            safety: smell.type === "dead-code" ? "safe" : "risky",
        };
    }
    async aiRenameSymbol(code, oldName, newName, file) {
        const messages = [
            {
                role: "system",
                content: `You are a refactoring expert. Rename a symbol intelligently, respecting:
1. Scope and shadowing
2. String literals (don't rename)
3. Comments (update references)
4. Import/export statements

Return ONLY the refactored code, no explanations.`,
            },
            {
                role: "user",
                content: `Rename "${oldName}" to "${newName}" in this code:\n\n\`\`\`\n${code}\n\`\`\``,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 8192,
            });
            return this.extractCode(response.content || "") || code;
        }
        catch (error) {
            return code;
        }
    }
    parseExtractionResponse(content) {
        const functionMatch = content.match(/```[\w]*\n([\s\S]*?function[\s\S]*?)\n```/);
        const callMatch = content.match(/(?:call|replacement|usage)[\s\S]*?```[\w]*\n([\s\S]*?)\n```/i);
        if (!functionMatch)
            return null;
        return {
            function: functionMatch[1].trim(),
            call: callMatch ? callMatch[1].trim() : `${content.match(/function\s+(\w+)/)?.[1] || "extracted"}()`,
            warnings: content.includes("warning") ? [content] : undefined,
        };
    }
    parseOptimizationResponse(content) {
        const code = this.extractCode(content);
        if (!code)
            return null;
        const explanations = [];
        const lines = content.split("\n");
        for (const line of lines) {
            if (line.match(/^\d+\.|^-|^•/)) {
                explanations.push(line.trim());
            }
        }
        return { code, explanations };
    }
    extractCode(content) {
        const match = content.match(/```[\w]*\n([\s\S]*?)\n```/);
        return match ? match[1].trim() : null;
    }
    extractTarget(code, target) {
        // Extract specific function/class by name
        const regex = new RegExp(`(?:function|class|const|let)\\s+${target}[\\s\\S]*?(?=\\n(?:function|class|const|let|export|$))`, "m");
        const match = code.match(regex);
        return match ? match[0] : code;
    }
    extractClassCode(code, startIndex) {
        let braceCount = 0;
        let started = false;
        let result = "";
        for (let i = startIndex; i < code.length; i++) {
            const char = code[i];
            result += char;
            if (char === "{") {
                braceCount++;
                started = true;
            }
            else if (char === "}") {
                braceCount--;
                if (started && braceCount === 0)
                    break;
            }
        }
        return result;
    }
    findInsertionPoint(lines, currentLine) {
        // Find the nearest function/class boundary above current line
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.match(/^(?:function|class|const|let|var)\s/) || line === "") {
                return i + 1;
            }
        }
        return 0;
    }
    findFilesWithSymbol(symbol) {
        const files = [];
        const searchDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                        searchDir(fullPath);
                    }
                }
                else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    if (content.includes(symbol)) {
                        files.push(path.relative(this.workDir, fullPath));
                    }
                }
            }
        };
        searchDir(this.workDir);
        return files;
    }
    generateDiff(oldContent, newContent) {
        const oldLines = oldContent.split("\n");
        const newLines = newContent.split("\n");
        const diff = [];
        // Simple line-by-line diff
        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            if (oldLine !== newLine) {
                if (oldLine !== undefined) {
                    diff.push(`- ${oldLine}`);
                }
                if (newLine !== undefined) {
                    diff.push(`+ ${newLine}`);
                }
            }
            else if (oldLine !== undefined) {
                diff.push(`  ${oldLine}`);
            }
        }
        return diff.join("\n");
    }
}
exports.RefactoringAssistant = RefactoringAssistant;
// ── Standalone Functions ────────────────────────────────────────────────────
/**
 * Quick refactoring suggestions for a file
 */
async function getRefactoringSuggestions(workDir, filePath, provider, model) {
    const assistant = new RefactoringAssistant(workDir, provider, model);
    return assistant.suggestRefactorings(filePath);
}
/**
 * Detect code smells in a file
 */
async function detectCodeSmells(workDir, filePath, provider, model) {
    const assistant = new RefactoringAssistant(workDir, provider, model);
    return assistant.detectCodeSmells(filePath);
}
