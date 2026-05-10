"use strict";
// Slack & Discord Integration
// Send notifications and run commands from chat platforms
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
exports.ChatIntegrationManager = exports.DiscordIntegration = exports.SlackIntegration = void 0;
const https = __importStar(require("https"));
class SlackIntegration {
    constructor(config) {
        this.config = config;
    }
    /**
     * Send a message to Slack
     */
    async sendMessage(message) {
        const payload = {
            channel: this.config.channel,
            username: this.config.username || "Omni Agent",
            icon_emoji: this.config.iconEmoji || ":robot_face:",
            attachments: [
                {
                    color: message.color || "#36a64f",
                    title: message.title,
                    text: message.text,
                    fields: message.fields,
                    footer: message.footer || "Omni Agent",
                    ts: message.timestamp
                        ? Math.floor(new Date(message.timestamp).getTime() / 1000)
                        : Math.floor(Date.now() / 1000),
                },
            ],
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send a simple text message
     */
    async sendText(text) {
        const payload = {
            channel: this.config.channel,
            username: this.config.username || "Omni Agent",
            icon_emoji: this.config.iconEmoji || ":robot_face:",
            text,
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send code snippet
     */
    async sendCodeSnippet(code, language, title) {
        const payload = {
            channel: this.config.channel,
            username: this.config.username || "Omni Agent",
            icon_emoji: this.config.iconEmoji || ":robot_face:",
            attachments: [
                {
                    color: "#36a64f",
                    title: title || "Code Snippet",
                    text: `\`\`\`${language}\n${code}\n\`\`\``,
                    mrkdwn_in: ["text"],
                },
            ],
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send notification about commit
     */
    async notifyCommit(message, hash, branch, author) {
        await this.sendMessage({
            title: "📝 New Commit",
            text: message,
            color: "#36a64f",
            fields: [
                { name: "Hash", value: hash, inline: true },
                { name: "Branch", value: branch, inline: true },
                { name: "Author", value: author, inline: true },
            ],
        });
    }
    /**
     * Send notification about PR
     */
    async notifyPR(title, url, branch, author) {
        await this.sendMessage({
            title: "🔀 Pull Request Created",
            text: `<${url}|${title}>`,
            color: "#0366d6",
            fields: [
                { name: "Branch", value: branch, inline: true },
                { name: "Author", value: author, inline: true },
            ],
        });
    }
    /**
     * Send notification about code review
     */
    async notifyReview(prTitle, prUrl, summary) {
        const color = summary.critical > 0
            ? "#d73a49"
            : summary.high > 0
                ? "#fb8532"
                : "#28a745";
        await this.sendMessage({
            title: "🔍 Code Review Complete",
            text: `<${prUrl}|${prTitle}>`,
            color,
            fields: [
                { name: "Critical", value: summary.critical.toString(), inline: true },
                { name: "High", value: summary.high.toString(), inline: true },
                { name: "Medium", value: summary.medium.toString(), inline: true },
                { name: "Low", value: summary.low.toString(), inline: true },
            ],
        });
    }
    /**
     * Send error notification
     */
    async notifyError(error, context) {
        await this.sendMessage({
            title: "❌ Error",
            text: error,
            color: "#d73a49",
            fields: context ? [{ name: "Context", value: context }] : undefined,
        });
    }
    async postWebhook(url, payload) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": data.length,
                },
            };
            const req = https.request(options, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                }
                else {
                    reject(new Error(`Slack webhook failed: ${res.statusCode}`));
                }
            });
            req.on("error", reject);
            req.write(data);
            req.end();
        });
    }
}
exports.SlackIntegration = SlackIntegration;
class DiscordIntegration {
    constructor(config) {
        this.config = config;
    }
    /**
     * Send a message to Discord
     */
    async sendMessage(message) {
        const embed = {
            title: message.title,
            description: message.text,
            color: this.colorToInt(message.color || "#36a64f"),
            fields: message.fields,
            footer: message.footer
                ? { text: message.footer }
                : { text: "Omni Agent" },
            timestamp: message.timestamp || new Date().toISOString(),
        };
        const payload = {
            username: this.config.username || "Omni Agent",
            avatar_url: this.config.avatarUrl,
            embeds: [embed],
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send a simple text message
     */
    async sendText(text) {
        const payload = {
            username: this.config.username || "Omni Agent",
            avatar_url: this.config.avatarUrl,
            content: text,
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send code snippet
     */
    async sendCodeSnippet(code, language, title) {
        const embed = {
            title: title || "Code Snippet",
            description: `\`\`\`${language}\n${code}\n\`\`\``,
            color: this.colorToInt("#36a64f"),
        };
        const payload = {
            username: this.config.username || "Omni Agent",
            avatar_url: this.config.avatarUrl,
            embeds: [embed],
        };
        await this.postWebhook(this.config.webhookUrl, payload);
    }
    /**
     * Send notification about commit
     */
    async notifyCommit(message, hash, branch, author) {
        await this.sendMessage({
            title: "📝 New Commit",
            text: message,
            color: "#36a64f",
            fields: [
                { name: "Hash", value: hash, inline: true },
                { name: "Branch", value: branch, inline: true },
                { name: "Author", value: author, inline: true },
            ],
        });
    }
    /**
     * Send notification about PR
     */
    async notifyPR(title, url, branch, author) {
        await this.sendMessage({
            title: "🔀 Pull Request Created",
            text: `[${title}](${url})`,
            color: "#0366d6",
            fields: [
                { name: "Branch", value: branch, inline: true },
                { name: "Author", value: author, inline: true },
            ],
        });
    }
    /**
     * Send notification about code review
     */
    async notifyReview(prTitle, prUrl, summary) {
        const color = summary.critical > 0
            ? "#d73a49"
            : summary.high > 0
                ? "#fb8532"
                : "#28a745";
        await this.sendMessage({
            title: "🔍 Code Review Complete",
            text: `[${prTitle}](${prUrl})`,
            color,
            fields: [
                { name: "Critical", value: summary.critical.toString(), inline: true },
                { name: "High", value: summary.high.toString(), inline: true },
                { name: "Medium", value: summary.medium.toString(), inline: true },
                { name: "Low", value: summary.low.toString(), inline: true },
            ],
        });
    }
    /**
     * Send error notification
     */
    async notifyError(error, context) {
        await this.sendMessage({
            title: "❌ Error",
            text: error,
            color: "#d73a49",
            fields: context ? [{ name: "Context", value: context }] : undefined,
        });
    }
    colorToInt(hex) {
        return parseInt(hex.replace("#", ""), 16);
    }
    async postWebhook(url, payload) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": data.length,
                },
            };
            const req = https.request(options, (res) => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve();
                }
                else {
                    reject(new Error(`Discord webhook failed: ${res.statusCode}`));
                }
            });
            req.on("error", reject);
            req.write(data);
            req.end();
        });
    }
}
exports.DiscordIntegration = DiscordIntegration;
/**
 * Unified chat integration manager
 */
class ChatIntegrationManager {
    constructor(config) {
        if (config.slack) {
            this.slack = new SlackIntegration(config.slack);
        }
        if (config.discord) {
            this.discord = new DiscordIntegration(config.discord);
        }
    }
    /**
     * Send message to all configured platforms
     */
    async broadcast(message) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.sendMessage(message));
        }
        if (this.discord) {
            promises.push(this.discord.sendMessage(message));
        }
        await Promise.all(promises);
    }
    /**
     * Send text to all platforms
     */
    async broadcastText(text) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.sendText(text));
        }
        if (this.discord) {
            promises.push(this.discord.sendText(text));
        }
        await Promise.all(promises);
    }
    /**
     * Notify about commit
     */
    async notifyCommit(message, hash, branch, author) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.notifyCommit(message, hash, branch, author));
        }
        if (this.discord) {
            promises.push(this.discord.notifyCommit(message, hash, branch, author));
        }
        await Promise.all(promises);
    }
    /**
     * Notify about PR
     */
    async notifyPR(title, url, branch, author) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.notifyPR(title, url, branch, author));
        }
        if (this.discord) {
            promises.push(this.discord.notifyPR(title, url, branch, author));
        }
        await Promise.all(promises);
    }
    /**
     * Notify about code review
     */
    async notifyReview(prTitle, prUrl, summary) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.notifyReview(prTitle, prUrl, summary));
        }
        if (this.discord) {
            promises.push(this.discord.notifyReview(prTitle, prUrl, summary));
        }
        await Promise.all(promises);
    }
    /**
     * Notify about error
     */
    async notifyError(error, context) {
        const promises = [];
        if (this.slack) {
            promises.push(this.slack.notifyError(error, context));
        }
        if (this.discord) {
            promises.push(this.discord.notifyError(error, context));
        }
        await Promise.all(promises);
    }
}
exports.ChatIntegrationManager = ChatIntegrationManager;
