"use strict";
// Test Generation System
// Automatically generates unit tests for code files
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
exports.TestGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TestGenerator {
    constructor(workDir, provider, model) {
        this.workDir = workDir;
        this.provider = provider;
        this.model = model;
    }
    /**
     * Generate tests for a specific file
     */
    async generateForFile(filePath, options = {}) {
        const fullPath = path.join(this.workDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const code = fs.readFileSync(fullPath, "utf-8");
        const ext = path.extname(filePath);
        const framework = options.framework || this.detectFramework(ext);
        const coverage = options.coverage || "comprehensive";
        // Analyze the code to understand what to test
        const analysis = this.analyzeCode(code, ext);
        // Generate test code using AI
        const testCode = await this.generateTestCode(code, filePath, framework, coverage, analysis, options);
        // Determine test file name
        const testFileName = this.getTestFileName(filePath, framework);
        // Analyze test quality
        const quality = await this.analyzeTestQuality(testCode, code, analysis, options);
        return {
            fileName: testFileName,
            content: testCode,
            framework,
            testCount: this.countTests(testCode),
            coverage: analysis.functions,
            quality,
        };
    }
    /**
     * Generate tests for multiple files
     */
    async generateForFiles(filePaths, options = {}) {
        const results = [];
        for (const filePath of filePaths) {
            try {
                const result = await this.generateForFile(filePath, options);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to generate tests for ${filePath}:`, error);
            }
        }
        return results;
    }
    /**
     * Analyze code to understand structure
     */
    analyzeCode(code, ext) {
        const analysis = {
            functions: [],
            classes: [],
            exports: [],
            imports: [],
        };
        if (ext === ".ts" || ext === ".js" || ext === ".tsx" || ext === ".jsx") {
            // Extract function names
            const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
            let match;
            while ((match = functionPattern.exec(code)) !== null) {
                analysis.functions.push(match[1]);
            }
            // Extract arrow functions
            const arrowPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
            while ((match = arrowPattern.exec(code)) !== null) {
                analysis.functions.push(match[1]);
            }
            // Extract class names
            const classPattern = /(?:export\s+)?class\s+(\w+)/g;
            while ((match = classPattern.exec(code)) !== null) {
                analysis.classes.push(match[1]);
            }
            // Extract exports
            const exportPattern = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
            while ((match = exportPattern.exec(code)) !== null) {
                analysis.exports.push(match[1]);
            }
        }
        else if (ext === ".py") {
            // Python function pattern
            const functionPattern = /def\s+(\w+)\s*\(/g;
            let match;
            while ((match = functionPattern.exec(code)) !== null) {
                analysis.functions.push(match[1]);
            }
            // Python class pattern
            const classPattern = /class\s+(\w+)/g;
            while ((match = classPattern.exec(code)) !== null) {
                analysis.classes.push(match[1]);
            }
        }
        else if (ext === ".go") {
            // Go function pattern
            const functionPattern = /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g;
            let match;
            while ((match = functionPattern.exec(code)) !== null) {
                analysis.functions.push(match[1]);
            }
        }
        return analysis;
    }
    /**
     * Generate test code using AI
     */
    async generateTestCode(code, filePath, framework, coverage, analysis, options) {
        const prompt = this.buildPrompt(code, filePath, framework, coverage, analysis, options);
        const messages = [
            {
                role: "system",
                content: "You are an expert test engineer. Generate comprehensive, well-structured unit tests.",
            },
            {
                role: "user",
                content: prompt,
            },
        ];
        const response = await this.provider.call(messages, {
            model: this.model,
            max_tokens: 4096,
        });
        // Extract code from markdown if present
        let testCode = response.content || "";
        const codeBlockMatch = testCode.match(/```(?:\w+)?\n([\s\S]+?)\n```/);
        if (codeBlockMatch) {
            testCode = codeBlockMatch[1];
        }
        return testCode.trim();
    }
    /**
     * Build prompt for test generation
     */
    buildPrompt(code, filePath, framework, coverage, analysis, options) {
        const lines = [];
        lines.push(`Generate ${coverage} unit tests for the following code using ${framework}.`);
        lines.push("");
        lines.push(`File: ${filePath}`);
        lines.push("");
        if (analysis.functions.length > 0) {
            lines.push(`Functions to test: ${analysis.functions.join(", ")}`);
        }
        if (analysis.classes.length > 0) {
            lines.push(`Classes to test: ${analysis.classes.join(", ")}`);
        }
        lines.push("");
        lines.push("Requirements:");
        lines.push(`- Use ${framework} testing framework`);
        lines.push(`- ${coverage} test coverage`);
        if (options.includeEdgeCases) {
            lines.push("- Include edge cases and boundary conditions");
            lines.push("- Test null/undefined, empty arrays/objects, extreme values");
            lines.push("- Test error conditions and exceptions");
        }
        if (options.includeMocks) {
            lines.push("- Use mocks for external dependencies");
            lines.push("- Mock API calls, database queries, file system operations");
            lines.push("- Use proper mock setup and teardown");
        }
        if (options.style === "bdd") {
            lines.push("- Use BDD style (describe/it)");
        }
        else if (options.style === "tdd") {
            lines.push("- Use TDD style (test/assert)");
        }
        if (options.includeIntegration) {
            lines.push("- Include integration tests for component interactions");
        }
        if (options.includePerformance) {
            lines.push("- Include performance tests for critical operations");
        }
        lines.push("- Include setup and teardown if needed");
        lines.push("- Test both success and failure cases");
        lines.push("- Use descriptive test names that explain what is being tested");
        lines.push("- Add comments explaining complex test logic");
        lines.push("- Use proper assertions (expect, assert, etc.)");
        lines.push("- Group related tests with describe blocks");
        lines.push("- Test async operations properly with async/await");
        lines.push("- Aim for high code coverage (>80%)");
        if (options.coverageThreshold) {
            lines.push(`- Target minimum ${options.coverageThreshold}% code coverage`);
        }
        lines.push("");
        lines.push("Code to test:");
        lines.push("```");
        lines.push(code);
        lines.push("```");
        lines.push("");
        lines.push("Generate ONLY the test code, no explanations. Use proper imports and setup.");
        lines.push("Make tests maintainable, readable, and comprehensive.");
        return lines.join("\n");
    }
    /**
     * Detect testing framework based on file extension
     */
    detectFramework(ext) {
        switch (ext) {
            case ".ts":
            case ".tsx":
                return "jest";
            case ".js":
            case ".jsx":
                return "jest";
            case ".py":
                return "pytest";
            case ".go":
                return "go-test";
            default:
                return "jest";
        }
    }
    /**
     * Get test file name based on framework conventions
     */
    getTestFileName(filePath, framework) {
        const dir = path.dirname(filePath);
        const base = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);
        switch (framework) {
            case "jest":
            case "vitest":
                return path.join(dir, `${base}.test${ext}`);
            case "mocha":
                return path.join(dir, `${base}.spec${ext}`);
            case "pytest":
                return path.join(dir, `test_${base}.py`);
            case "go-test":
                return path.join(dir, `${base}_test.go`);
            default:
                return path.join(dir, `${base}.test${ext}`);
        }
    }
    /**
     * Count number of tests in generated code
     */
    countTests(code) {
        const patterns = [
            /\bit\s*\(/g, // Jest/Mocha it()
            /\btest\s*\(/g, // Jest test()
            /\bdef\s+test_/g, // pytest
            /\bfunc\s+Test/g, // Go
        ];
        let count = 0;
        for (const pattern of patterns) {
            const matches = code.match(pattern);
            if (matches) {
                count += matches.length;
            }
        }
        return count;
    }
    /**
     * Write test file to disk
     */
    async writeTestFile(test) {
        const fullPath = path.join(this.workDir, test.fileName);
        const dir = path.dirname(fullPath);
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write test file
        fs.writeFileSync(fullPath, test.content, "utf-8");
        return fullPath;
    }
    /**
     * Generate tests for all files in a directory
     */
    async generateForDirectory(dirPath, options = {}) {
        const files = this.getCodeFiles(dirPath);
        return this.generateForFiles(files, options);
    }
    /**
     * Get all code files in a directory
     */
    getCodeFiles(dirPath) {
        const fullPath = path.join(this.workDir, dirPath);
        const files = [];
        const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullEntryPath = path.join(dir, entry.name);
                const relativePath = path.relative(this.workDir, fullEntryPath);
                if (entry.isDirectory()) {
                    // Skip node_modules, .git, etc.
                    if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                        walk(fullEntryPath);
                    }
                }
                else if (entry.isFile()) {
                    // Only include code files, skip test files
                    const ext = path.extname(entry.name);
                    const isCodeFile = [".ts", ".js", ".tsx", ".jsx", ".py", ".go"].includes(ext);
                    const isTestFile = entry.name.includes(".test.") ||
                        entry.name.includes(".spec.") ||
                        entry.name.startsWith("test_");
                    if (isCodeFile && !isTestFile) {
                        files.push(relativePath);
                    }
                }
            }
        };
        walk(fullPath);
        return files;
    }
    /**
     * Analyze test quality using AI and static analysis
     */
    async analyzeTestQuality(testCode, sourceCode, analysis, options) {
        const staticAnalysis = this.staticTestAnalysis(testCode, analysis);
        // Use AI for deeper quality analysis
        const messages = [
            {
                role: "system",
                content: `You are a test quality expert. Analyze test code and provide a quality score with detailed feedback.

Return JSON format:
{
  "score": 0-100,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`,
            },
            {
                role: "user",
                content: `Analyze this test code quality:

Test Code:
\`\`\`
${testCode}
\`\`\`

Source Code:
\`\`\`
${sourceCode}
\`\`\`

Functions to test: ${analysis.functions.join(", ")}

Evaluate:
1. Coverage completeness
2. Edge case handling
3. Mock usage quality
4. Test organization
5. Assertion quality
6. Maintainability`,
            },
        ];
        try {
            const response = await this.provider.call(messages, {
                model: this.model,
                max_tokens: 2048,
            });
            const content = response.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiAnalysis = JSON.parse(jsonMatch[0]);
                return {
                    score: aiAnalysis.score || staticAnalysis.score,
                    strengths: aiAnalysis.strengths || staticAnalysis.strengths,
                    weaknesses: aiAnalysis.weaknesses || staticAnalysis.weaknesses,
                    suggestions: aiAnalysis.suggestions || staticAnalysis.suggestions,
                    coverageEstimate: staticAnalysis.coverageEstimate,
                    edgeCasesCovered: staticAnalysis.edgeCasesCovered,
                    mockingQuality: staticAnalysis.mockingQuality,
                };
            }
        }
        catch (error) {
            // Fall back to static analysis if AI fails
        }
        return staticAnalysis;
    }
    /**
     * Static analysis of test quality
     */
    staticTestAnalysis(testCode, analysis) {
        const strengths = [];
        const weaknesses = [];
        const suggestions = [];
        let score = 50; // Base score
        // Check test count
        const testCount = this.countTests(testCode);
        const functionCount = analysis.functions.length;
        const testsPerFunction = functionCount > 0 ? testCount / functionCount : 0;
        if (testsPerFunction >= 3) {
            strengths.push("Good test coverage with multiple tests per function");
            score += 15;
        }
        else if (testsPerFunction >= 1) {
            strengths.push("Basic test coverage present");
            score += 5;
        }
        else {
            weaknesses.push("Insufficient test coverage");
            suggestions.push("Add more tests to cover all functions");
            score -= 10;
        }
        // Check for edge cases
        const edgeCasePatterns = [
            /null/gi,
            /undefined/gi,
            /empty/gi,
            /zero/gi,
            /negative/gi,
            /boundary/gi,
            /edge case/gi,
        ];
        let edgeCasesCovered = 0;
        for (const pattern of edgeCasePatterns) {
            if (pattern.test(testCode)) {
                edgeCasesCovered++;
            }
        }
        if (edgeCasesCovered >= 4) {
            strengths.push("Comprehensive edge case testing");
            score += 15;
        }
        else if (edgeCasesCovered >= 2) {
            strengths.push("Some edge cases covered");
            score += 5;
        }
        else {
            weaknesses.push("Missing edge case tests");
            suggestions.push("Add tests for null, undefined, empty values, and boundary conditions");
            score -= 5;
        }
        // Check for mocking
        const mockPatterns = [
            /jest\.mock/gi,
            /vi\.mock/gi,
            /sinon/gi,
            /mock/gi,
            /stub/gi,
            /spy/gi,
        ];
        let mockingQuality = "none";
        let mockCount = 0;
        for (const pattern of mockPatterns) {
            const matches = testCode.match(pattern);
            if (matches) {
                mockCount += matches.length;
            }
        }
        if (mockCount >= 5) {
            mockingQuality = "comprehensive";
            strengths.push("Comprehensive mocking of dependencies");
            score += 10;
        }
        else if (mockCount >= 2) {
            mockingQuality = "basic";
            strengths.push("Basic mocking present");
            score += 5;
        }
        else {
            weaknesses.push("No mocking detected");
            suggestions.push("Consider mocking external dependencies");
        }
        // Check for proper test structure
        if (/describe\s*\(/gi.test(testCode)) {
            strengths.push("Well-organized with describe blocks");
            score += 5;
        }
        else {
            suggestions.push("Use describe blocks to organize related tests");
        }
        // Check for async handling
        if (/async/gi.test(testCode) && /await/gi.test(testCode)) {
            strengths.push("Proper async/await handling");
            score += 5;
        }
        // Check for assertions
        const assertionPatterns = [
            /expect\s*\(/gi,
            /assert/gi,
            /should/gi,
            /toBe/gi,
            /toEqual/gi,
        ];
        let assertionCount = 0;
        for (const pattern of assertionPatterns) {
            const matches = testCode.match(pattern);
            if (matches) {
                assertionCount += matches.length;
            }
        }
        if (assertionCount >= testCount * 2) {
            strengths.push("Multiple assertions per test");
            score += 5;
        }
        else if (assertionCount < testCount) {
            weaknesses.push("Some tests may lack assertions");
            suggestions.push("Ensure each test has proper assertions");
            score -= 5;
        }
        // Check for setup/teardown
        if (/beforeEach|beforeAll|afterEach|afterAll|setUp|tearDown/gi.test(testCode)) {
            strengths.push("Proper setup and teardown");
            score += 5;
        }
        // Check for error testing
        if (/toThrow|throws|error|exception/gi.test(testCode)) {
            strengths.push("Error cases tested");
            score += 5;
        }
        else {
            suggestions.push("Add tests for error conditions");
        }
        // Estimate coverage
        const coverageEstimate = Math.min(95, Math.max(30, (testsPerFunction * 25) + (edgeCasesCovered * 5) + (mockCount * 2)));
        // Clamp score
        score = Math.max(0, Math.min(100, score));
        return {
            score,
            strengths,
            weaknesses,
            suggestions,
            coverageEstimate,
            edgeCasesCovered,
            mockingQuality,
        };
    }
    /**
     * Improve existing tests
     */
    async improveTests(testFilePath, sourceFilePath) {
        const testFullPath = path.join(this.workDir, testFilePath);
        const sourceFullPath = path.join(this.workDir, sourceFilePath);
        if (!fs.existsSync(testFullPath)) {
            throw new Error(`Test file not found: ${testFilePath}`);
        }
        if (!fs.existsSync(sourceFullPath)) {
            throw new Error(`Source file not found: ${sourceFilePath}`);
        }
        const testCode = fs.readFileSync(testFullPath, "utf-8");
        const sourceCode = fs.readFileSync(sourceFullPath, "utf-8");
        const ext = path.extname(sourceFilePath);
        const analysis = this.analyzeCode(sourceCode, ext);
        const quality = await this.analyzeTestQuality(testCode, sourceCode, analysis, {});
        // Generate improvement suggestions
        const messages = [
            {
                role: "system",
                content: "You are a test improvement expert. Enhance existing tests based on quality analysis.",
            },
            {
                role: "user",
                content: `Improve these tests based on the quality analysis:

Current Tests:
\`\`\`
${testCode}
\`\`\`

Source Code:
\`\`\`
${sourceCode}
\`\`\`

Quality Analysis:
- Score: ${quality.score}/100
- Weaknesses: ${quality.weaknesses.join(", ")}
- Suggestions: ${quality.suggestions.join(", ")}

Improve the tests by:
1. Addressing all weaknesses
2. Adding missing edge cases
3. Improving mocking if needed
4. Enhancing test organization
5. Adding missing assertions

Return ONLY the improved test code.`,
            },
        ];
        const response = await this.provider.call(messages, {
            model: this.model,
            max_tokens: 8192,
        });
        let improvedCode = response.content || "";
        const codeBlockMatch = improvedCode.match(/```(?:\w+)?\n([\s\S]+?)\n```/);
        if (codeBlockMatch) {
            improvedCode = codeBlockMatch[1];
        }
        const framework = this.detectFramework(ext);
        const newQuality = await this.analyzeTestQuality(improvedCode, sourceCode, analysis, {});
        return {
            fileName: testFilePath,
            content: improvedCode.trim(),
            framework,
            testCount: this.countTests(improvedCode),
            coverage: analysis.functions,
            quality: newQuality,
        };
    }
}
exports.TestGenerator = TestGenerator;
