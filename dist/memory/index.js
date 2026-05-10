"use strict";
// Memory system - persistent cross-session memory
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
exports.MemoryManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class MemoryManager {
    constructor(baseDir) {
        this.memoryDir = baseDir || path.join(os.homedir(), ".omni", "memory");
        this.indexFile = path.join(this.memoryDir, "MEMORY.md");
        this.ensureMemoryDir();
    }
    ensureMemoryDir() {
        fs.mkdirSync(this.memoryDir, { recursive: true });
        // Create index file if it doesn't exist
        if (!fs.existsSync(this.indexFile)) {
            fs.writeFileSync(this.indexFile, "# Memory Index\n\nThis file indexes all memories. Each memory is stored in a separate file.\n\n", "utf-8");
        }
    }
    // Save a memory to disk
    save(memory) {
        const now = new Date().toISOString();
        const fullMemory = {
            ...memory,
            createdAt: now,
            updatedAt: now,
        };
        // Save memory file
        const fileName = this.sanitizeFileName(memory.name) + ".md";
        const filePath = path.join(this.memoryDir, fileName);
        const content = [
            "---",
            `name: ${memory.name}`,
            `description: ${memory.description}`,
            `type: ${memory.type}`,
            "---",
            "",
            memory.content,
        ].join("\n");
        fs.writeFileSync(filePath, content, "utf-8");
        // Update index
        this.updateIndex(memory.name, fileName, memory.description);
    }
    // Load a memory by name
    load(name) {
        const fileName = this.sanitizeFileName(name) + ".md";
        const filePath = path.join(this.memoryDir, fileName);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = this.parseMemoryFile(content);
        if (!parsed)
            return null;
        const stats = fs.statSync(filePath);
        return {
            ...parsed,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
        };
    }
    // List all memories
    list(type) {
        const files = fs.readdirSync(this.memoryDir)
            .filter(f => f.endsWith(".md") && f !== "MEMORY.md");
        const memories = [];
        for (const file of files) {
            const filePath = path.join(this.memoryDir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const parsed = this.parseMemoryFile(content);
            if (parsed && (!type || parsed.type === type)) {
                const stats = fs.statSync(filePath);
                memories.push({
                    ...parsed,
                    createdAt: stats.birthtime.toISOString(),
                    updatedAt: stats.mtime.toISOString(),
                });
            }
        }
        return memories.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    // Update existing memory
    update(name, updates) {
        const existing = this.load(name);
        if (!existing)
            return false;
        const updated = {
            ...existing,
            ...updates,
            name: existing.name, // Name cannot be changed
            updatedAt: new Date().toISOString(),
        };
        const fileName = this.sanitizeFileName(name) + ".md";
        const filePath = path.join(this.memoryDir, fileName);
        const content = [
            "---",
            `name: ${updated.name}`,
            `description: ${updated.description}`,
            `type: ${updated.type}`,
            "---",
            "",
            updated.content,
        ].join("\n");
        fs.writeFileSync(filePath, content, "utf-8");
        return true;
    }
    // Delete a memory
    delete(name) {
        const fileName = this.sanitizeFileName(name) + ".md";
        const filePath = path.join(this.memoryDir, fileName);
        if (!fs.existsSync(filePath)) {
            return false;
        }
        fs.unlinkSync(filePath);
        this.removeFromIndex(name);
        return true;
    }
    // Search memories by content
    search(query, type) {
        const regex = new RegExp(query, "i");
        return this.list(type).filter(m => regex.test(m.name) ||
            regex.test(m.description) ||
            regex.test(m.content));
    }
    // Get relevant memories for a context
    getRelevant(context, limit = 5) {
        const allMemories = this.list();
        const keywords = context.toLowerCase().split(/\s+/);
        // Score memories by keyword matches
        const scored = allMemories.map(memory => {
            const text = `${memory.name} ${memory.description} ${memory.content}`.toLowerCase();
            const score = keywords.reduce((acc, keyword) => {
                return acc + (text.includes(keyword) ? 1 : 0);
            }, 0);
            return { memory, score };
        });
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.memory);
    }
    parseMemoryFile(content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch)
            return null;
        const [, frontmatter, body] = frontmatterMatch;
        const lines = frontmatter.split("\n");
        const metadata = {};
        for (const line of lines) {
            const [key, ...valueParts] = line.split(":");
            if (key && valueParts.length > 0) {
                metadata[key.trim()] = valueParts.join(":").trim();
            }
        }
        if (!metadata.name || !metadata.type)
            return null;
        return {
            name: metadata.name,
            description: metadata.description || "",
            type: metadata.type,
            content: body.trim(),
        };
    }
    updateIndex(name, fileName, description) {
        let index = fs.readFileSync(this.indexFile, "utf-8");
        // Remove existing entry if present
        const lines = index.split("\n");
        const filtered = lines.filter(line => !line.includes(`[${name}]`));
        // Add new entry
        filtered.push(`- [${name}](${fileName}) — ${description}`);
        fs.writeFileSync(this.indexFile, filtered.join("\n"), "utf-8");
    }
    removeFromIndex(name) {
        let index = fs.readFileSync(this.indexFile, "utf-8");
        const lines = index.split("\n");
        const filtered = lines.filter(line => !line.includes(`[${name}]`));
        fs.writeFileSync(this.indexFile, filtered.join("\n"), "utf-8");
    }
    sanitizeFileName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }
}
exports.MemoryManager = MemoryManager;
