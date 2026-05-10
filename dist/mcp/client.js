"use strict";
// MCP client - handles stdio communication with MCP servers
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const child_process_1 = require("child_process");
class MCPClient {
    constructor(command, args, env) {
        this.command = command;
        this.args = args;
        this.env = env;
        this.process = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.buffer = "";
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.process = (0, child_process_1.spawn)(this.command, this.args, {
                    env: { ...process.env, ...this.env },
                    stdio: ["pipe", "pipe", "pipe"],
                });
                this.process.stdout?.on("data", (data) => {
                    this.handleOutput(data.toString());
                });
                this.process.stderr?.on("data", (data) => {
                    console.error(`MCP stderr: ${data}`);
                });
                this.process.on("error", (error) => {
                    reject(error);
                });
                this.process.on("exit", (code) => {
                    if (code !== 0) {
                        console.error(`MCP process exited with code ${code}`);
                    }
                });
                // Initialize connection
                this.sendRequest("initialize", {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                        tools: {},
                    },
                    clientInfo: {
                        name: "omni-agent",
                        version: "2.1.0",
                    },
                })
                    .then(() => resolve())
                    .catch(reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
    async listTools() {
        const response = await this.sendRequest("tools/list", {});
        return response.tools || [];
    }
    async callTool(name, args) {
        const response = await this.sendRequest("tools/call", {
            name,
            arguments: args,
        });
        return response;
    }
    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdin) {
                reject(new Error("MCP process not running"));
                return;
            }
            const id = ++this.requestId;
            const request = {
                jsonrpc: "2.0",
                id,
                method,
                params,
            };
            this.pendingRequests.set(id, { resolve, reject });
            try {
                this.process.stdin.write(JSON.stringify(request) + "\n");
            }
            catch (error) {
                this.pendingRequests.delete(id);
                reject(error);
            }
        });
    }
    handleOutput(data) {
        this.buffer += data;
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                const message = JSON.parse(line);
                if ("id" in message) {
                    // Response
                    const response = message;
                    const pending = this.pendingRequests.get(response.id);
                    if (pending) {
                        this.pendingRequests.delete(response.id);
                        if (response.error) {
                            pending.reject(new Error(response.error.message));
                        }
                        else {
                            pending.resolve(response.result);
                        }
                    }
                }
                else {
                    // Notification
                    const notification = message;
                    this.handleNotification(notification);
                }
            }
            catch (error) {
                console.error("Failed to parse MCP message:", line, error);
            }
        }
    }
    handleNotification(notification) {
        // Handle notifications if needed
        console.log("MCP notification:", notification.method);
    }
}
exports.MCPClient = MCPClient;
