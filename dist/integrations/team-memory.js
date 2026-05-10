"use strict";
// Team Memory Sync
// Enable multi-user memory sharing across team members
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
exports.TeamMemorySync = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const memory_1 = require("../memory");
class TeamMemorySync {
    constructor(config, memoryDir) {
        this.config = config;
        this.lastSyncTime = null;
        this.memoryManager = new memory_1.MemoryManager(memoryDir);
        this.syncDir = path.join(memoryDir || path.join(os.homedir(), ".omni", "memory"), ".sync");
        this.ensureSyncDir();
    }
    ensureSyncDir() {
        fs.mkdirSync(this.syncDir, { recursive: true });
    }
    /**
     * Initialize team memory sync
     */
    async initialize() {
        switch (this.config.syncMethod) {
            case "git":
                await this.initializeGitSync();
                break;
            case "cloud":
                await this.initializeCloudSync();
                break;
            case "local":
                // Local sync doesn't need initialization
                break;
        }
        // Load last sync time
        const syncFile = path.join(this.syncDir, "last-sync.json");
        if (fs.existsSync(syncFile)) {
            const data = JSON.parse(fs.readFileSync(syncFile, "utf-8"));
            this.lastSyncTime = new Date(data.lastSync);
        }
    }
    /**
     * Initialize Git-based sync
     */
    async initializeGitSync() {
        if (!this.config.gitRepo) {
            throw new Error("Git repo URL required for git sync");
        }
        const repoDir = path.join(this.syncDir, "repo");
        // Clone or pull repo
        if (!fs.existsSync(repoDir)) {
            try {
                (0, child_process_1.execSync)(`git clone ${this.config.gitRepo} "${repoDir}"`, {
                    stdio: "pipe",
                });
            }
            catch (e) {
                throw new Error(`Failed to clone team memory repo: ${e.message}`);
            }
        }
        else {
            try {
                (0, child_process_1.execSync)("git pull", { cwd: repoDir, stdio: "pipe" });
            }
            catch (e) {
                // Pull might fail if there are conflicts - handle later
            }
        }
    }
    /**
     * Initialize cloud-based sync
     */
    async initializeCloudSync() {
        if (!this.config.cloudEndpoint || !this.config.cloudToken) {
            throw new Error("Cloud endpoint and token required for cloud sync");
        }
        // Verify connection
        try {
            const response = await fetch(`${this.config.cloudEndpoint}/ping`, {
                headers: {
                    Authorization: `Bearer ${this.config.cloudToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Cloud sync unavailable: ${response.status}`);
            }
        }
        catch (e) {
            throw new Error(`Failed to connect to cloud sync: ${e.message}`);
        }
    }
    /**
     * Sync memories with team
     */
    async sync() {
        const status = {
            lastSync: new Date().toISOString(),
            conflicts: 0,
            synced: 0,
            failed: 0,
        };
        try {
            switch (this.config.syncMethod) {
                case "git":
                    return await this.syncViaGit(status);
                case "cloud":
                    return await this.syncViaCloud(status);
                case "local":
                    return await this.syncViaLocal(status);
                default:
                    throw new Error(`Unknown sync method: ${this.config.syncMethod}`);
            }
        }
        finally {
            // Save sync status
            this.lastSyncTime = new Date();
            const syncFile = path.join(this.syncDir, "last-sync.json");
            fs.writeFileSync(syncFile, JSON.stringify({ lastSync: this.lastSyncTime.toISOString() }), "utf-8");
        }
    }
    /**
     * Sync via Git repository
     */
    async syncViaGit(status) {
        const repoDir = path.join(this.syncDir, "repo");
        // Pull latest changes
        try {
            (0, child_process_1.execSync)("git pull", { cwd: repoDir, stdio: "pipe" });
        }
        catch (e) {
            // Handle conflicts
            const conflicts = await this.detectGitConflicts(repoDir);
            status.conflicts = conflicts.length;
            if (conflicts.length > 0) {
                await this.resolveConflicts(conflicts);
            }
        }
        // Copy remote memories to local
        const remoteMemories = this.loadRemoteMemories(repoDir);
        for (const memory of remoteMemories) {
            try {
                const local = this.memoryManager.load(memory.name);
                if (!local) {
                    // New memory from team
                    this.memoryManager.save(memory);
                    status.synced++;
                }
                else if (new Date(memory.updatedAt) > new Date(local.updatedAt)) {
                    // Remote is newer
                    this.memoryManager.update(memory.name, {
                        content: memory.content,
                        description: memory.description,
                        type: memory.type,
                    });
                    status.synced++;
                }
            }
            catch (e) {
                status.failed++;
            }
        }
        // Copy local memories to remote
        const localMemories = this.memoryManager.list();
        for (const memory of localMemories) {
            try {
                const memoryFile = path.join(repoDir, "memories", `${this.sanitizeFileName(memory.name)}.md`);
                const content = [
                    "---",
                    `name: ${memory.name}`,
                    `description: ${memory.description}`,
                    `type: ${memory.type}`,
                    `user: ${this.config.userId}`,
                    `updatedAt: ${memory.updatedAt}`,
                    "---",
                    "",
                    memory.content,
                ].join("\n");
                fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
                fs.writeFileSync(memoryFile, content, "utf-8");
            }
            catch (e) {
                status.failed++;
            }
        }
        // Commit and push changes
        try {
            (0, child_process_1.execSync)("git add .", { cwd: repoDir, stdio: "pipe" });
            const hasChanges = (0, child_process_1.execSync)("git status --porcelain", {
                cwd: repoDir,
                encoding: "utf-8",
            }).trim();
            if (hasChanges) {
                (0, child_process_1.execSync)(`git commit -m "Sync memories from ${this.config.userId}"`, { cwd: repoDir, stdio: "pipe" });
                (0, child_process_1.execSync)("git push", { cwd: repoDir, stdio: "pipe" });
            }
        }
        catch (e) {
            // Push might fail - handle conflicts
            status.failed++;
        }
        return status;
    }
    /**
     * Sync via cloud API
     */
    async syncViaCloud(status) {
        if (!this.config.cloudEndpoint || !this.config.cloudToken) {
            throw new Error("Cloud endpoint and token required");
        }
        const headers = {
            Authorization: `Bearer ${this.config.cloudToken}`,
            "Content-Type": "application/json",
        };
        // Fetch remote memories
        try {
            const response = await fetch(`${this.config.cloudEndpoint}/teams/${this.config.teamId}/memories`, { headers });
            if (!response.ok) {
                throw new Error(`Failed to fetch memories: ${response.status}`);
            }
            const remoteMemories = (await response.json());
            // Sync remote to local
            for (const memory of remoteMemories) {
                try {
                    const local = this.memoryManager.load(memory.name);
                    if (!local) {
                        this.memoryManager.save(memory);
                        status.synced++;
                    }
                    else if (new Date(memory.updatedAt) > new Date(local.updatedAt)) {
                        this.memoryManager.update(memory.name, {
                            content: memory.content,
                            description: memory.description,
                            type: memory.type,
                        });
                        status.synced++;
                    }
                }
                catch (e) {
                    status.failed++;
                }
            }
            // Push local memories to cloud
            const localMemories = this.memoryManager.list();
            for (const memory of localMemories) {
                try {
                    const response = await fetch(`${this.config.cloudEndpoint}/teams/${this.config.teamId}/memories`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            ...memory,
                            userId: this.config.userId,
                        }),
                    });
                    if (response.ok) {
                        status.synced++;
                    }
                    else {
                        status.failed++;
                    }
                }
                catch (e) {
                    status.failed++;
                }
            }
        }
        catch (e) {
            throw new Error(`Cloud sync failed: ${e.message}`);
        }
        return status;
    }
    /**
     * Sync via local network (shared folder)
     */
    async syncViaLocal(status) {
        // Simple file-based sync for local networks
        const sharedDir = path.join(this.syncDir, "shared");
        fs.mkdirSync(sharedDir, { recursive: true });
        // Copy local memories to shared
        const localMemories = this.memoryManager.list();
        for (const memory of localMemories) {
            try {
                const memoryFile = path.join(sharedDir, `${this.sanitizeFileName(memory.name)}.json`);
                fs.writeFileSync(memoryFile, JSON.stringify({ ...memory, userId: this.config.userId }), "utf-8");
                status.synced++;
            }
            catch (e) {
                status.failed++;
            }
        }
        // Load memories from shared folder
        const files = fs.readdirSync(sharedDir).filter((f) => f.endsWith(".json"));
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(sharedDir, file), "utf-8");
                const memory = JSON.parse(content);
                // Skip own memories
                if (memory.userId === this.config.userId) {
                    continue;
                }
                const local = this.memoryManager.load(memory.name);
                if (!local) {
                    this.memoryManager.save(memory);
                    status.synced++;
                }
                else if (new Date(memory.updatedAt) > new Date(local.updatedAt)) {
                    this.memoryManager.update(memory.name, {
                        content: memory.content,
                        description: memory.description,
                        type: memory.type,
                    });
                    status.synced++;
                }
            }
            catch (e) {
                status.failed++;
            }
        }
        return status;
    }
    /**
     * Detect Git conflicts
     */
    async detectGitConflicts(repoDir) {
        const conflicts = [];
        try {
            const conflictFiles = (0, child_process_1.execSync)("git diff --name-only --diff-filter=U", {
                cwd: repoDir,
                encoding: "utf-8",
            })
                .trim()
                .split("\n")
                .filter((f) => f);
            for (const file of conflictFiles) {
                // Parse conflict markers
                const content = fs.readFileSync(path.join(repoDir, file), "utf-8");
                // Simplified conflict detection
                if (content.includes("<<<<<<<")) {
                    const name = path.basename(file, ".md");
                    const local = this.memoryManager.load(name);
                    if (local) {
                        conflicts.push({
                            name,
                            local,
                            remote: local, // Placeholder - would need to parse conflict
                        });
                    }
                }
            }
        }
        catch (e) {
            // No conflicts
        }
        return conflicts;
    }
    /**
     * Resolve conflicts (prefer remote by default)
     */
    async resolveConflicts(conflicts) {
        for (const conflict of conflicts) {
            // Default: prefer remote (team) changes
            conflict.resolution = "remote";
            if (conflict.resolution === "remote") {
                this.memoryManager.update(conflict.name, {
                    content: conflict.remote.content,
                    description: conflict.remote.description,
                    type: conflict.remote.type,
                });
            }
        }
    }
    /**
     * Load remote memories from Git repo
     */
    loadRemoteMemories(repoDir) {
        const memories = [];
        const memoriesDir = path.join(repoDir, "memories");
        if (!fs.existsSync(memoriesDir)) {
            return memories;
        }
        const files = fs.readdirSync(memoriesDir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(memoriesDir, file), "utf-8");
                const parsed = this.parseMemoryFile(content);
                if (parsed) {
                    memories.push(parsed);
                }
            }
            catch (e) {
                // Skip invalid files
            }
        }
        return memories;
    }
    /**
     * Parse memory file with frontmatter
     */
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
            createdAt: metadata.createdAt || new Date().toISOString(),
            updatedAt: metadata.updatedAt || new Date().toISOString(),
        };
    }
    /**
     * Get sync status
     */
    getStatus() {
        return {
            lastSync: this.lastSyncTime,
            method: this.config.syncMethod,
        };
    }
    /**
     * Enable auto-sync
     */
    enableAutoSync(intervalMinutes = 5) {
        setInterval(() => {
            this.sync().catch((e) => {
                console.error("Auto-sync failed:", e.message);
            });
        }, intervalMinutes * 60 * 1000);
    }
    sanitizeFileName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }
}
exports.TeamMemorySync = TeamMemorySync;
