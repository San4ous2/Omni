"use strict";
// Test Generation System
// Auto-generate tests for code files
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
exports.generateTestsForFile = generateTestsForFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TestGenerator {
    constructor(workDir, options = {}) {
        this.workDir = workDir;
        this.options = options;
        this.defaultOptions = {
            framework: "auto",
            coverage: true,
            mocks: true,
            typescript: true,
        };
        this.options = { ...this.defaultOptions, ...options };
    }
    /**
     * Generate tests for a file
     */
    async generateTests(filePath) {
        const fullPath = path.join(this.workDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(fullPath, "utf-8");
        const ext = path.extname(filePath);
        const isTypeScript = ext === ".ts" || ext === ".tsx";
        // Detect framework
        const framework = this.detectFramework();
        // Extract functions and classes
        const functions = this.extractFunctions(content);
        const classes = this.extractClasses(content);
        // Generate tests
        const tests = [];
        for (const func of functions) {
            tests.push(...this.generateFunctionTests(func, framework));
        }
        for (const cls of classes) {
            tests.push(...this.generateClassTests(cls, framework));
        }
        // Generate imports
        const imports = this.generateImports(filePath, framework, isTypeScript);
        // Generate setup
        const setup = this.generateSetup(framework);
        // Determine test file path
        const testFile = this.getTestFilePath(filePath, framework);
        return {
            file: filePath,
            testFile,
            framework,
            tests,
            imports,
            setup,
        };
    }
    /**
     * Extract functions from code
     */
    extractFunctions(content) {
        const functions = [];
        // Regular functions
        const funcPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
        let match;
        while ((match = funcPattern.exec(content)) !== null) {
            functions.push({
                name: match[1],
                params: match[2],
                async: content.substring(Math.max(0, match.index - 10), match.index).includes("async"),
            });
        }
        // Arrow functions
        const arrowPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
        while ((match = arrowPattern.exec(content)) !== null) {
            functions.push({
                name: match[1],
                params: match[2],
                async: content.substring(match.index, match.index + 50).includes("async"),
            });
        }
        return functions;
    }
    /**
     * Extract classes from code
     */
    extractClasses(content) {
        const classes = [];
        const classPattern = /(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            const className = match[1];
            const methods = this.extractClassMethods(content, match.index);
            classes.push({ name: className, methods });
        }
        return classes;
    }
    /**
     * Extract methods from a class
     */
    extractClassMethods(content, classStart) {
        const methods = [];
        const classContent = this.extractClassBody(content, classStart);
        const methodPattern = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
        let match;
        while ((match = methodPattern.exec(classContent)) !== null) {
            const methodName = match[1];
            if (methodName !== "constructor") {
                methods.push(methodName);
            }
        }
        return methods;
    }
    /**
     * Extract class body
     */
    extractClassBody(content, start) {
        let braceCount = 0;
        let started = false;
        let end = start;
        for (let i = start; i < content.length; i++) {
            if (content[i] === "{") {
                braceCount++;
                started = true;
            }
            else if (content[i] === "}") {
                braceCount--;
                if (started && braceCount === 0) {
                    end = i;
                    break;
                }
            }
        }
        return content.substring(start, end);
    }
    /**
     * Generate tests for a function
     */
    generateFunctionTests(func, framework) {
        const tests = [];
        const awaitPrefix = func.async ? "await " : "";
        // Happy path test
        tests.push({
            name: `${func.name} - should work with valid input`,
            type: "unit",
            description: `Test ${func.name} with valid parameters`,
            code: `test("${func.name} should work with valid input", ${func.async ? "async " : ""}() => {
  const result = ${awaitPrefix}${func.name}(/* TODO: add valid params */);
  expect(result).toBeDefined();
  // TODO: Add more assertions
});`,
        });
        // Edge case test
        tests.push({
            name: `${func.name} - should handle edge cases`,
            type: "edge-case",
            description: `Test ${func.name} with edge case inputs`,
            code: `test("${func.name} should handle edge cases", ${func.async ? "async " : ""}() => {
  // TODO: Test with null, undefined, empty values, etc.
  expect(() => ${func.name}(null)).not.toThrow();
});`,
        });
        return tests;
    }
    /**
     * Generate tests for a class
     */
    generateClassTests(cls, framework) {
        const tests = [];
        // Constructor test
        tests.push({
            name: `${cls.name} - should instantiate`,
            type: "unit",
            description: `Test ${cls.name} constructor`,
            code: `test("${cls.name} should instantiate", () => {
  const instance = new ${cls.name}(/* TODO: add constructor params */);
  expect(instance).toBeInstanceOf(${cls.name});
});`,
        });
        // Method tests
        for (const method of cls.methods) {
            tests.push({
                name: `${cls.name}.${method} - should work`,
                type: "unit",
                description: `Test ${cls.name}.${method} method`,
                code: `test("${cls.name}.${method} should work", () => {
  const instance = new ${cls.name}(/* TODO: add constructor params */);
  const result = instance.${method}(/* TODO: add method params */);
  expect(result).toBeDefined();
  // TODO: Add more assertions
});`,
            });
        }
        return tests;
    }
    /**
     * Generate imports
     */
    generateImports(filePath, framework, isTypeScript) {
        const imports = [];
        // Framework imports
        if (framework === "jest" || framework === "vitest") {
            imports.push(`import { describe, test, expect, beforeEach, afterEach } from "${framework}";`);
        }
        else if (framework === "mocha") {
            imports.push(`import { describe, it, beforeEach, afterEach } from "mocha";`);
            imports.push(`import { expect } from "chai";`);
        }
        // Source file import
        const relativePath = this.getRelativeImportPath(filePath);
        imports.push(`import * as Module from "${relativePath}";`);
        return imports;
    }
    /**
     * Generate setup code
     */
    generateSetup(framework) {
        return [
            `describe("${path.basename(this.workDir)}", () => {`,
            `  beforeEach(() => {`,
            `    // TODO: Setup test environment`,
            `  });`,
            ``,
            `  afterEach(() => {`,
            `    // TODO: Cleanup`,
            `  });`,
            ``,
        ];
    }
    /**
     * Detect test framework
     */
    detectFramework() {
        if (this.options.framework !== "auto") {
            return this.options.framework;
        }
        const packageJsonPath = path.join(this.workDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps.vitest)
                return "vitest";
            if (deps.jest)
                return "jest";
            if (deps.mocha)
                return "mocha";
        }
        return "vitest"; // Default
    }
    /**
     * Get test file path
     */
    getTestFilePath(filePath, framework) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        const ext = this.options.typescript ? ".ts" : ".js";
        // Check for __tests__ directory
        const testsDir = path.join(dir, "__tests__");
        if (fs.existsSync(path.join(this.workDir, testsDir))) {
            return path.join(testsDir, `${name}.test${ext}`);
        }
        // Place next to source file
        return path.join(dir, `${name}.test${ext}`);
    }
    /**
     * Get relative import path
     */
    getRelativeImportPath(filePath) {
        const name = path.basename(filePath, path.extname(filePath));
        return `./${name}`;
    }
    /**
     * Format test suite as code
     */
    formatTestSuite(suite) {
        const lines = [];
        // Imports
        lines.push(...suite.imports);
        lines.push("");
        // Setup
        lines.push(...suite.setup);
        // Tests
        for (const test of suite.tests) {
            lines.push(`  ${test.code}`);
            lines.push("");
        }
        // Close describe block
        lines.push("});");
        return lines.join("\n");
    }
    /**
     * Write test file
     */
    async writeTestFile(suite) {
        const testPath = path.join(this.workDir, suite.testFile);
        const testDir = path.dirname(testPath);
        // Create directory if needed
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        // Write test file
        const content = this.formatTestSuite(suite);
        fs.writeFileSync(testPath, content, "utf-8");
        return testPath;
    }
}
exports.TestGenerator = TestGenerator;
/**
 * Quick test generation helper
 */
async function generateTestsForFile(workDir, filePath, options) {
    const generator = new TestGenerator(workDir, options);
    const suite = await generator.generateTests(filePath);
    return generator.writeTestFile(suite);
}
