"use strict";
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
exports.CommandHistory = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const HISTORY_PATH = path.join(os.homedir(), ".omni", "history.json");
const MAX_HISTORY = 100;
class CommandHistory {
    constructor() {
        this.history = [];
        this.index = -1;
        this.tempInput = "";
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(HISTORY_PATH)) {
                const data = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
                this.history = Array.isArray(data) ? data : [];
            }
        }
        catch (e) {
            this.history = [];
        }
    }
    save() {
        try {
            const dir = path.dirname(HISTORY_PATH);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history, null, 2), "utf-8");
        }
        catch (e) {
            console.error("Failed to save history:", e);
        }
    }
    add(command) {
        if (!command.trim() || command.startsWith("/"))
            return;
        // Remove duplicate if exists
        const idx = this.history.indexOf(command);
        if (idx !== -1)
            this.history.splice(idx, 1);
        this.history.push(command);
        // Keep only last MAX_HISTORY items
        if (this.history.length > MAX_HISTORY) {
            this.history = this.history.slice(-MAX_HISTORY);
        }
        this.save();
        this.reset();
    }
    reset() {
        this.index = this.history.length;
        this.tempInput = "";
    }
    previous(currentInput) {
        if (this.history.length === 0)
            return null;
        if (this.index === this.history.length) {
            this.tempInput = currentInput;
        }
        if (this.index > 0) {
            this.index--;
            return this.history[this.index];
        }
        return null;
    }
    next(currentInput) {
        if (this.history.length === 0)
            return null;
        if (this.index < this.history.length - 1) {
            this.index++;
            return this.history[this.index];
        }
        else if (this.index === this.history.length - 1) {
            this.index = this.history.length;
            return this.tempInput;
        }
        return null;
    }
    getAll() {
        return [...this.history];
    }
    search(query) {
        return this.history.filter(cmd => cmd.includes(query));
    }
}
exports.CommandHistory = CommandHistory;
