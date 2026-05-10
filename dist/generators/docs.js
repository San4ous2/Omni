"use strict";
// Documentation Generation System
// Auto-generate JSDoc/TSDoc for code files
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
exports.DocumentationGenerator = void 0;
exports.generateDocsForFile = generateDocsForFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DocumentationGenerator {
    constructor(workDir, options = {}) {
        this.workDir = workDir;
        this.options = options;
        this.defaultOptions = {
            style: "auto",
            includeExamples: true,
            includeTypes: true,
            overwrite: false,
        };
        this.options = { ...this.defaultOptions, ...options };
    }
    /**
     * Generate documentation for a file
     */
    async generateDocs(filePath) {
        const fullPath = path.join(this.workDir, filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const ext = path.extname(filePath);
        // Detect style
        const style = this.options.style === "auto" ? this.detectStyle(ext) : this.options.style;
        const items = [];
        let added = 0;
        let updated = 0;
        let skipped = 0;
        // Find functions
        const functions = this.findFunctions(content, lines);
        for (const func of functions) {
            const existing = this.findExistingDoc(lines, func.line);
            if (existing && !this.options.overwrite) {
                skipped++;
                continue;
            }
            const doc = this.generateFunctionDoc(func, style);
            items.push({
                type: "function",
                name: func.name,
                line: func.line,
                doc,
                existing,
            });
            if (existing)
                updated++;
            else
                added++;
        }
        // Find classes
        const classes = this.findClasses(content, lines);
        for (const cls of classes) {
            const existing = this.findExistingDoc(lines, cls.line);
            if (existing && !this.options.overwrite) {
                skipped++;
                continue;
            }
            const doc = this.generateClassDoc(cls, style);
            items.push({
                type: "class",
                name: cls.name,
                line: cls.line,
                doc,
                existing,
            });
            if (existing)
                updated++;
            else
                added++;
            // Document methods
            for (const method of cls.methods) {
                const methodExisting = this.findExistingDoc(lines, method.line);
                if (methodExisting && !this.options.overwrite) {
                    skipped++;
                    continue;
                }
                const methodDoc = this.generateMethodDoc(method, style);
                items.push({
                    type: "method",
                    name: `${cls.name}.${method.name}`,
                    line: method.line,
                    doc: methodDoc,
                    existing: methodExisting,
                });
                if (methodExisting)
                    updated++;
                else
                    added++;
            }
        }
        // Find interfaces (TypeScript)
        if (ext === ".ts" || ext === ".tsx") {
            const interfaces = this.findInterfaces(content, lines);
            for (const iface of interfaces) {
                const existing = this.findExistingDoc(lines, iface.line);
                if (existing && !this.options.overwrite) {
                    skipped++;
                    continue;
                }
                const doc = this.generateInterfaceDoc(iface, style);
                items.push({
                    type: "interface",
                    name: iface.name,
                    line: iface.line,
                    doc,
                    existing,
                });
                if (existing)
                    updated++;
                else
                    added++;
            }
        }
        return {
            file: filePath,
            items,
            added,
            updated,
            skipped,
        };
    }
    /**
     * Apply documentation to file
     */
    async applyDocs(result) {
        const fullPath = path.join(this.workDir, result.file);
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        // Sort items by line number (descending) to avoid line number shifts
        const sorted = [...result.items].sort((a, b) => b.line - a.line);
        for (const item of sorted) {
            // Remove existing doc if present
            if (item.existing) {
                const docStart = this.findDocStart(lines, item.line);
                if (docStart !== -1) {
                    lines.splice(docStart, item.line - docStart);
                }
            }
            // Insert new doc
            const indent = this.getIndentation(lines[item.line - 1] || "");
            const docLines = item.doc.split("\n").map(l => indent + l);
            lines.splice(item.line - 1, 0, ...docLines);
        }
        // Write back
        fs.writeFileSync(fullPath, lines.join("\n"), "utf-8");
    }
    /**
     * Find functions in code
     */
    findFunctions(content, lines) {
        const functions = [];
        // Regular functions
        const funcPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
        let match;
        while ((match = funcPattern.exec(content)) !== null) {
            const line = this.getLineNumber(content, match.index);
            functions.push({
                name: match[1],
                params: this.parseParams(match[2]),
                returnType: match[3]?.trim(),
                async: content.substring(Math.max(0, match.index - 10), match.index).includes("async"),
                line,
            });
        }
        // Arrow functions
        const arrowPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;
        while ((match = arrowPattern.exec(content)) !== null) {
            const line = this.getLineNumber(content, match.index);
            functions.push({
                name: match[1],
                params: this.parseParams(match[2]),
                returnType: match[3]?.trim(),
                async: content.substring(match.index, match.index + 50).includes("async"),
                line,
            });
        }
        return functions;
    }
    /**
     * Find classes in code
     */
    findClasses(content, lines) {
        const classes = [];
        const classPattern = /(?:export\s+)?class\s+(\w+)/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            const line = this.getLineNumber(content, match.index);
            const methods = this.findClassMethods(content, match.index);
            classes.push({
                name: match[1],
                line,
                methods,
            });
        }
        return classes;
    }
    /**
     * Find methods in a class
     */
    findClassMethods(content, classStart) {
        const methods = [];
        const classBody = this.extractClassBody(content, classStart);
        const classBodyStart = content.indexOf("{", classStart);
        const methodPattern = /(?:async\s+)?(\w+)\s*\(([^)]*)\)/g;
        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            const methodName = match[1];
            if (methodName !== "constructor") {
                const line = this.getLineNumber(content, classBodyStart + match.index);
                methods.push({
                    name: methodName,
                    line,
                    params: this.parseParams(match[2]),
                });
            }
        }
        return methods;
    }
    /**
     * Find interfaces in TypeScript
     */
    findInterfaces(content, lines) {
        const interfaces = [];
        const interfacePattern = /(?:export\s+)?interface\s+(\w+)/g;
        let match;
        while ((match = interfacePattern.exec(content)) !== null) {
            const line = this.getLineNumber(content, match.index);
            const properties = this.extractInterfaceProperties(content, match.index);
            interfaces.push({
                name: match[1],
                line,
                properties,
            });
        }
        return interfaces;
    }
    /**
     * Extract interface properties
     */
    extractInterfaceProperties(content, start) {
        const body = this.extractClassBody(content, start);
        const lines = body.split("\n");
        const properties = [];
        for (const line of lines) {
            const match = line.match(/^\s*(\w+)[?:]?\s*:/);
            if (match) {
                properties.push(match[1]);
            }
        }
        return properties;
    }
    /**
     * Generate function documentation
     */
    generateFunctionDoc(func, style) {
        const lines = [];
        lines.push("/**");
        lines.push(` * ${this.generateDescription(func.name)}`);
        if (func.params.length > 0) {
            lines.push(" *");
            for (const param of func.params) {
                const [name, type] = param.split(":").map(s => s.trim());
                lines.push(` * @param ${name} ${type ? `{${type}} ` : ""}TODO: Describe ${name}`);
            }
        }
        if (func.returnType || func.async) {
            lines.push(" *");
            const returnType = func.returnType || (func.async ? "Promise<void>" : "void");
            lines.push(` * @returns {${returnType}} TODO: Describe return value`);
        }
        if (this.options.includeExamples) {
            lines.push(" *");
            lines.push(" * @example");
            lines.push(` * ${func.name}(${func.params.map(p => p.split(":")[0]).join(", ")})`);
        }
        lines.push(" */");
        return lines.join("\n");
    }
    /**
     * Generate class documentation
     */
    generateClassDoc(cls, style) {
        const lines = [];
        lines.push("/**");
        lines.push(` * ${this.generateDescription(cls.name)}`);
        lines.push(" *");
        lines.push(` * @class ${cls.name}`);
        if (this.options.includeExamples) {
            lines.push(" *");
            lines.push(" * @example");
            lines.push(` * const instance = new ${cls.name}();`);
        }
        lines.push(" */");
        return lines.join("\n");
    }
    /**
     * Generate method documentation
     */
    generateMethodDoc(method, style) {
        const lines = [];
        lines.push("  /**");
        lines.push(`   * ${this.generateDescription(method.name)}`);
        if (method.params.length > 0) {
            lines.push("   *");
            for (const param of method.params) {
                const [name, type] = param.split(":").map(s => s.trim());
                lines.push(`   * @param ${name} ${type ? `{${type}} ` : ""}TODO: Describe ${name}`);
            }
        }
        lines.push("   */");
        return lines.join("\n");
    }
    /**
     * Generate interface documentation
     */
    generateInterfaceDoc(iface, style) {
        const lines = [];
        lines.push("/**");
        lines.push(` * ${this.generateDescription(iface.name)}`);
        lines.push(" *");
        lines.push(` * @interface ${iface.name}`);
        if (iface.properties.length > 0 && this.options.includeTypes) {
            lines.push(" *");
            for (const prop of iface.properties) {
                lines.push(` * @property {any} ${prop} TODO: Describe ${prop}`);
            }
        }
        lines.push(" */");
        return lines.join("\n");
    }
    /**
     * Generate description from name
     */
    generateDescription(name) {
        // Convert camelCase/PascalCase to words
        const words = name.replace(/([A-Z])/g, " $1").trim().toLowerCase();
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
    /**
     * Parse parameters
     */
    parseParams(paramsStr) {
        if (!paramsStr.trim())
            return [];
        return paramsStr.split(",").map(p => p.trim()).filter(Boolean);
    }
    /**
     * Detect documentation style
     */
    detectStyle(ext) {
        return ext === ".ts" || ext === ".tsx" ? "tsdoc" : "jsdoc";
    }
    /**
     * Find existing documentation
     */
    findExistingDoc(lines, line) {
        const docStart = this.findDocStart(lines, line);
        if (docStart === -1)
            return undefined;
        const docLines = [];
        for (let i = docStart; i < line - 1; i++) {
            docLines.push(lines[i]);
        }
        return docLines.join("\n");
    }
    /**
     * Find start of documentation block
     */
    findDocStart(lines, line) {
        for (let i = line - 2; i >= 0; i--) {
            const trimmed = lines[i].trim();
            if (trimmed === "/**") {
                return i;
            }
            if (trimmed && !trimmed.startsWith("*") && !trimmed.startsWith("//")) {
                break;
            }
        }
        return -1;
    }
    /**
     * Get indentation of a line
     */
    getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : "";
    }
    /**
     * Get line number from string index
     */
    getLineNumber(content, index) {
        return content.substring(0, index).split("\n").length;
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
}
exports.DocumentationGenerator = DocumentationGenerator;
/**
 * Quick documentation generation helper
 */
async function generateDocsForFile(workDir, filePath, options) {
    const generator = new DocumentationGenerator(workDir, options);
    const result = await generator.generateDocs(filePath);
    await generator.applyDocs(result);
    return result;
}
