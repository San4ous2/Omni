"use strict";
// MCP manager - manages MCP servers and exposes their tools
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
exports.MCPManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const client_1 = require("./client");
class MCPManager {
    constructor(configPath) {
        this.servers = new Map();
        this.configPath = configPath || path.join(os.homedir(), ".omni", "mcp.json");
    }
    async loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                // Create default config
                const defaultConfig = {
                    servers: {},
                };
                fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
                fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
                return;
            }
            const configData = fs.readFileSync(this.configPath, "utf-8");
            const config = JSON.parse(configData);
            for (const [name, serverConfig] of Object.entries(config.servers)) {
                this.servers.set(name, {
                    name,
                    config: serverConfig,
                    tools: [],
                    status: "stopped",
                });
            }
        }
        catch (error) {
            console.error("Failed to load MCP config:", error);
        }
    }
    async startServer(name) {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`MCP server '${name}' not found`);
        }
        if (server.status === "running") {
            return;
        }
        try {
            server.status = "starting";
            // Resolve environment variables
            const env = {};
            if (server.config.env) {
                for (const [key, value] of Object.entries(server.config.env)) {
                    env[key] = value.replace(/\$\{(\w+)\}/g, (_, varName) => process.env[varName] || "");
                }
            }
            const client = new client_1.MCPClient(server.config.command, server.config.args, env);
            await client.start();
            const tools = await client.listTools();
            server.tools = tools;
            server.process = client;
            server.status = "running";
        }
        catch (error) {
            server.status = "error";
            throw error;
        }
    }
    async stopServer(name) {
        const server = this.servers.get(name);
        if (!server || !server.process) {
            return;
        }
        await server.process.stop();
        server.process = undefined;
        server.status = "stopped";
    }
    async startAll() {
        const promises = Array.from(this.servers.keys()).map((name) => this.startServer(name).catch((error) => {
            console.error(`Failed to start MCP server '${name}':`, error.message);
        }));
        await Promise.all(promises);
    }
    async stopAll() {
        const promises = Array.from(this.servers.keys()).map((name) => this.stopServer(name));
        await Promise.all(promises);
    }
    getAllTools() {
        const tools = [];
        for (const [name, server] of this.servers) {
            if (server.status === "running") {
                for (const tool of server.tools) {
                    tools.push({ server: name, tool });
                }
            }
        }
        return tools;
    }
    async callTool(serverName, toolName, args) {
        const server = this.servers.get(serverName);
        if (!server || !server.process) {
            throw new Error(`MCP server '${serverName}' not running`);
        }
        const client = server.process;
        return await client.callTool(toolName, args);
    }
    getServerStatus() {
        return Array.from(this.servers.values()).map((server) => ({
            name: server.name,
            status: server.status,
            toolCount: server.tools.length,
        }));
    }
    addServer(name, config) {
        this.servers.set(name, {
            name,
            config,
            tools: [],
            status: "stopped",
        });
        // Save to config
        this.saveConfig();
    }
    removeServer(name) {
        const server = this.servers.get(name);
        if (server && server.status === "running") {
            this.stopServer(name);
        }
        this.servers.delete(name);
        // Save to config
        this.saveConfig();
    }
    saveConfig() {
        try {
            const config = {
                servers: {},
            };
            for (const [name, server] of this.servers) {
                config.servers[name] = server.config;
            }
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        }
        catch (error) {
            console.error("Failed to save MCP config:", error);
        }
    }
}
exports.MCPManager = MCPManager;
