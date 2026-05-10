"use strict";
// Administrator Elevation Helper for Windows
// Automatically requests admin privileges if needed
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
exports.isAdmin = isAdmin;
exports.requestAdmin = requestAdmin;
exports.ensureAdmin = ensureAdmin;
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
function isAdmin() {
    if (os.platform() !== "win32") {
        // On Unix, check if running as root
        return process.getuid?.() === 0;
    }
    try {
        // On Windows, try to access a protected registry key
        (0, child_process_1.execSync)("net session", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function requestAdmin() {
    if (os.platform() !== "win32") {
        console.log("⚠️  This command requires sudo privileges.");
        console.log("Run: sudo " + process.argv.join(" "));
        process.exit(1);
    }
    console.log("⚠️  This command requires administrator privileges.");
    console.log("Requesting elevation...");
    try {
        // Use PowerShell to elevate
        const script = process.argv.slice(1).join(" ");
        const command = `Start-Process -FilePath "node" -ArgumentList "${script}" -Verb RunAs`;
        (0, child_process_1.execSync)(`powershell -Command "${command}"`, { stdio: "inherit" });
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Failed to elevate privileges");
        console.error("Please run as administrator manually");
        process.exit(1);
    }
}
function ensureAdmin(message) {
    if (!isAdmin()) {
        if (message) {
            console.log(`⚠️  ${message}`);
        }
        requestAdmin();
    }
}
