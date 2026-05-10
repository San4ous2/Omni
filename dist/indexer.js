"use strict";
// Codebase Indexing System
// Semantic search for code using vector embeddings
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
exports.CodebaseIndexer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class CodebaseIndexer {
    constructor(workDir) {
        this.workDir = workDir;
        this.chunks = new Map();
        this.vocabulary = new Map();
        this.idf = new Map();
        this.indexPath = path.join(workDir, ".omni", "index.json");
    }
    /**
     * Index the entire codebase
     */
    async indexCodebase(dirPath = ".") {
        const startTime = Date.now();
        const files = this.getCodeFiles(dirPath);
        console.log(`Indexing ${files.length} files...`);
        for (const file of files) {
            await this.indexFile(file);
        }
        // Calculate IDF scores
        this.calculateIDF();
        // Vectorize all chunks
        for (const chunk of this.chunks.values()) {
            chunk.vector = this.vectorize(chunk.code);
        }
        // Save index
        await this.saveIndex();
        const stats = {
            totalFiles: files.length,
            totalChunks: this.chunks.size,
            lastIndexed: new Date().toISOString(),
            indexSize: this.getIndexSize(),
        };
        console.log(`Indexed ${stats.totalChunks} chunks in ${Date.now() - startTime}ms`);
        return stats;
    }
    /**
     * Index a single file
     */
    async indexFile(filePath) {
        const fullPath = path.join(this.workDir, filePath);
        if (!fs.existsSync(fullPath)) {
            return;
        }
        const content = fs.readFileSync(fullPath, "utf-8");
        const ext = path.extname(filePath);
        // Extract code chunks based on file type
        const chunks = this.extractChunks(content, filePath, ext);
        // Add chunks to index
        for (const chunk of chunks) {
            this.chunks.set(chunk.id, chunk);
            this.updateVocabulary(chunk.code);
        }
    }
    /**
     * Extract code chunks from file content
     */
    extractChunks(content, filePath, ext) {
        const chunks = [];
        const lines = content.split("\n");
        if (ext === ".ts" || ext === ".js" || ext === ".tsx" || ext === ".jsx") {
            // Extract functions
            const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/g;
            let match;
            while ((match = functionPattern.exec(content)) !== null) {
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findClosingBrace(lines, startLine);
                const code = lines.slice(startLine - 1, endLine).join("\n");
                chunks.push({
                    id: this.generateId(filePath, match[1]),
                    file: filePath,
                    type: "function",
                    name: match[1],
                    code,
                    startLine,
                    endLine,
                    hash: this.hashCode(code),
                });
            }
            // Extract arrow functions
            const arrowPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
            while ((match = arrowPattern.exec(content)) !== null) {
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findEndOfStatement(lines, startLine);
                const code = lines.slice(startLine - 1, endLine).join("\n");
                chunks.push({
                    id: this.generateId(filePath, match[1]),
                    file: filePath,
                    type: "function",
                    name: match[1],
                    code,
                    startLine,
                    endLine,
                    hash: this.hashCode(code),
                });
            }
            // Extract classes
            const classPattern = /(?:export\s+)?class\s+(\w+)/g;
            while ((match = classPattern.exec(content)) !== null) {
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findClosingBrace(lines, startLine);
                const code = lines.slice(startLine - 1, endLine).join("\n");
                chunks.push({
                    id: this.generateId(filePath, match[1]),
                    file: filePath,
                    type: "class",
                    name: match[1],
                    code,
                    startLine,
                    endLine,
                    hash: this.hashCode(code),
                });
            }
            // Extract interfaces
            const interfacePattern = /(?:export\s+)?interface\s+(\w+)/g;
            while ((match = interfacePattern.exec(content)) !== null) {
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findClosingBrace(lines, startLine);
                const code = lines.slice(startLine - 1, endLine).join("\n");
                chunks.push({
                    id: this.generateId(filePath, match[1]),
                    file: filePath,
                    type: "interface",
                    name: match[1],
                    code,
                    startLine,
                    endLine,
                    hash: this.hashCode(code),
                });
            }
        }
        // If no chunks found, index entire file
        if (chunks.length === 0) {
            chunks.push({
                id: this.generateId(filePath, "file"),
                file: filePath,
                type: "file",
                name: path.basename(filePath),
                code: content,
                startLine: 1,
                endLine: lines.length,
                hash: this.hashCode(content),
            });
        }
        return chunks;
    }
    /**
     * Search for code semantically
     */
    search(query, limit = 10) {
        const queryVector = this.vectorize(query);
        const results = [];
        for (const chunk of this.chunks.values()) {
            if (!chunk.vector)
                continue;
            const score = this.cosineSimilarity(queryVector, chunk.vector);
            if (score > 0.1) {
                // Threshold
                results.push({
                    chunk,
                    score,
                    context: this.getContext(chunk),
                });
            }
        }
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }
    /**
     * Find similar code chunks
     */
    findSimilar(chunkId, limit = 5) {
        const chunk = this.chunks.get(chunkId);
        if (!chunk || !chunk.vector)
            return [];
        return this.search(chunk.code, limit + 1).filter((r) => r.chunk.id !== chunkId);
    }
    /**
     * Get context around a code chunk
     */
    getContext(chunk) {
        const fullPath = path.join(this.workDir, chunk.file);
        if (!fs.existsSync(fullPath))
            return "";
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const contextStart = Math.max(0, chunk.startLine - 3);
        const contextEnd = Math.min(lines.length, chunk.endLine + 3);
        return lines.slice(contextStart, contextEnd).join("\n");
    }
    /**
     * Vectorize text using TF-IDF
     */
    vectorize(text) {
        const tokens = this.tokenize(text);
        const tf = this.calculateTF(tokens);
        const vector = [];
        // Create vector based on vocabulary
        for (const [term, index] of this.vocabulary.entries()) {
            const tfScore = tf.get(term) || 0;
            const idfScore = this.idf.get(term) || 0;
            vector[index] = tfScore * idfScore;
        }
        // Normalize vector
        return this.normalize(vector);
    }
    /**
     * Calculate TF (Term Frequency)
     */
    calculateTF(tokens) {
        const tf = new Map();
        const total = tokens.length;
        for (const token of tokens) {
            tf.set(token, (tf.get(token) || 0) + 1);
        }
        // Normalize by total tokens
        for (const [term, count] of tf.entries()) {
            tf.set(term, count / total);
        }
        return tf;
    }
    /**
     * Calculate IDF (Inverse Document Frequency)
     */
    calculateIDF() {
        const docCount = this.chunks.size;
        for (const [term] of this.vocabulary.entries()) {
            let docsWithTerm = 0;
            for (const chunk of this.chunks.values()) {
                if (chunk.code.toLowerCase().includes(term)) {
                    docsWithTerm++;
                }
            }
            const idfScore = Math.log(docCount / (1 + docsWithTerm));
            this.idf.set(term, idfScore);
        }
    }
    /**
     * Tokenize text
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((t) => t.length > 2);
    }
    /**
     * Update vocabulary with new tokens
     */
    updateVocabulary(text) {
        const tokens = this.tokenize(text);
        for (const token of tokens) {
            if (!this.vocabulary.has(token)) {
                this.vocabulary.set(token, this.vocabulary.size);
            }
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        const maxLen = Math.max(a.length, b.length);
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < maxLen; i++) {
            const valA = a[i] || 0;
            const valB = b[i] || 0;
            dotProduct += valA * valB;
            normA += valA * valA;
            normB += valB * valB;
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Normalize vector
     */
    normalize(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return norm === 0 ? vector : vector.map((val) => val / norm);
    }
    /**
     * Get code files in directory
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
                    if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
                        walk(fullEntryPath);
                    }
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if ([".ts", ".js", ".tsx", ".jsx", ".py", ".go"].includes(ext)) {
                        files.push(relativePath);
                    }
                }
            }
        };
        walk(fullPath);
        return files;
    }
    /**
     * Helper methods
     */
    generateId(file, name) {
        return `${file}:${name}`;
    }
    hashCode(code) {
        return crypto.createHash("md5").update(code).digest("hex");
    }
    getLineNumber(content, index) {
        return content.substring(0, index).split("\n").length;
    }
    findClosingBrace(lines, startLine) {
        let braceCount = 0;
        let started = false;
        for (let i = startLine - 1; i < lines.length; i++) {
            for (const char of lines[i]) {
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
    findEndOfStatement(lines, startLine) {
        for (let i = startLine - 1; i < lines.length; i++) {
            if (lines[i].includes(";")) {
                return i + 1;
            }
        }
        return startLine;
    }
    getIndexSize() {
        try {
            const stats = fs.statSync(this.indexPath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    /**
     * Save index to disk
     */
    async saveIndex() {
        const dir = path.dirname(this.indexPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const data = {
            chunks: Array.from(this.chunks.entries()),
            vocabulary: Array.from(this.vocabulary.entries()),
            idf: Array.from(this.idf.entries()),
        };
        fs.writeFileSync(this.indexPath, JSON.stringify(data), "utf-8");
    }
    /**
     * Load index from disk
     */
    async loadIndex() {
        try {
            if (!fs.existsSync(this.indexPath)) {
                return false;
            }
            const data = JSON.parse(fs.readFileSync(this.indexPath, "utf-8"));
            this.chunks = new Map(data.chunks);
            this.vocabulary = new Map(data.vocabulary);
            this.idf = new Map(data.idf);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get index statistics
     */
    getStats() {
        return {
            totalFiles: new Set(Array.from(this.chunks.values()).map((c) => c.file)).size,
            totalChunks: this.chunks.size,
            lastIndexed: new Date().toISOString(),
            indexSize: this.getIndexSize(),
        };
    }
}
exports.CodebaseIndexer = CodebaseIndexer;
