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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const config_1 = require("./config");
const history_1 = require("./history");
const diff_1 = require("./diff");
const tokens_1 = require("./tokens");
const syntax_1 = require("./syntax");
const omniroute_1 = require("./providers/omniroute");
const ollama_1 = require("./providers/ollama");
const planner_1 = require("./planner");
const skills_1 = require("./skills");
const web_1 = require("./skills/builtin/web");
const mcp_1 = require("./mcp");
const animations_1 = require("./animations");
const models_1 = require("./models");
const autocomplete_1 = require("./autocomplete");
const input_simple_1 = require("./input-simple");
// ── NEW: Advanced features ───────────────────────────────────────────────────
const advanced_1 = require("./tools/advanced");
const tools_1 = require("./tools");
const agents_1 = require("./agents");
const memory_1 = require("./memory");
const tasks_1 = require("./tasks");
const worktree_1 = require("./worktree");
const git_enhanced_1 = require("./skills/builtin/git-enhanced");
const orchestrator_1 = require("./orchestrator");
const reviewer_1 = require("./reviewer");
const test_generator_1 = require("./test-generator");
const indexer_1 = require("./indexer");
const refactoring_1 = require("./refactoring");
// ── NEW: Phase 3 Integrations ────────────────────────────────────────────────
const github_pr_1 = require("./integrations/github-pr");
const chat_1 = require("./integrations/chat");
const team_memory_1 = require("./integrations/team-memory");
// ── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.OMNI_URL || "http://localhost:20128/v1").replace(/\/$/, "");
const API_KEY = process.env.OMNI_KEY || "any";
let CONFIG = (0, config_1.loadConfig)();
const DEF_MODEL = process.env.OMNI_MODEL || CONFIG.defaultModel;
let WORK_DIR = process.env.AGENT_DIR || process.cwd();
const SESSIONS_DIR = path.join(os.homedir(), ".omni", "sessions");
const cmdHistory = new history_1.CommandHistory();
// ── Models ───────────────────────────────────────────────────────────────────
let MODELS = [];
// ── Providers ────────────────────────────────────────────────────────────────
const providers = new Map();
// Provider will be initialized after models are loaded
let currentProvider;
// ── Planner ──────────────────────────────────────────────────────────────────
const planner = new planner_1.Planner();
// ── Skills ───────────────────────────────────────────────────────────────────
const skillManager = new skills_1.SkillManager(path.join(os.homedir(), ".omni", "skills"));
skillManager.register(git_enhanced_1.enhancedGitSkill); // Use enhanced git skill
skillManager.register(web_1.webSkill);
// ── MCP ──────────────────────────────────────────────────────────────────────
const mcpManager = new mcp_1.MCPManager();
// ── Autocomplete ─────────────────────────────────────────────────────────────
const autocomplete = new autocomplete_1.AutocompleteEngine();
// ── NEW: Advanced Managers ───────────────────────────────────────────────────
const toolManager = new tools_1.ToolManager();
const agentManager = new agents_1.AgentManager();
const memoryManager = new memory_1.MemoryManager();
const taskManager = new tasks_1.TaskManager();
const worktreeManager = new worktree_1.WorktreeManager(WORK_DIR);
let modelOrchestrator;
let codeReviewer;
let testGenerator;
let codebaseIndexer;
let refactoringAssistant;
// ── NEW: Phase 3 Integration Managers ────────────────────────────────────────
let githubPR;
let chatIntegration = null;
let teamMemorySync = null;
// Register advanced tools
for (const tool of advanced_1.advancedTools) {
    toolManager.register(tool);
}
// ── ANSI ────────────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const IT = "\x1b[3m";
const UL = "\x1b[4m";
const fg = {
    red: "\x1b[91m", green: "\x1b[92m", yellow: "\x1b[93m",
    blue: "\x1b[94m", cyan: "\x1b[96m", white: "\x1b[97m",
    gray: "\x1b[90m",
    orange: "\x1b[38;5;214m",
    teal: "\x1b[38;5;43m",
    sky: "\x1b[38;5;117m",
    purple: "\x1b[38;5;141m",
    pink: "\x1b[38;5;205m",
    lime: "\x1b[38;5;154m",
};
const c = (col, s) => `${col}${s}${R}`;
const cols = () => Math.min(process.stdout.columns || 80, 120);
const clrLine = () => process.stdout.write("\r\x1b[2K");
const clrScreen = () => process.stdout.write("\x1b[2J\x1b[H");
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const padTo = (s, w) => s + " ".repeat(Math.max(0, w - stripAnsi(s).length));
const CMDS = [
    { cmd: "/model", desc: "Switch AI model" },
    { cmd: "/models", desc: "List all available models" },
    { cmd: "/provider", desc: "Switch provider" },
    { cmd: "/providers", desc: "List providers" },
    { cmd: "/skills", desc: "List available skills" },
    { cmd: "/tools", desc: "List AI tools" },
    { cmd: "/plan", desc: "Manual planning mode" },
    { cmd: "/mcp", desc: "Manage MCP servers" },
    { cmd: "/image", desc: "Attach image  /image <path>" },
    { cmd: "/sessions", desc: "Browse & load saved sessions" },
    { cmd: "/history", desc: "Browse command history" },
    { cmd: "/export", desc: "Export chat  /export <file>" },
    { cmd: "/stats", desc: "Show session statistics" },
    { cmd: "/config", desc: "Edit configuration" },
    { cmd: "/stream", desc: "Toggle streaming responses" },
    { cmd: "/auto", desc: "Toggle auto model selection" },
    { cmd: "/clear", desc: "Clear conversation" },
    { cmd: "/dir", desc: "Change working directory" },
    { cmd: "/help", desc: "Show all commands" },
    { cmd: "/exit", desc: "Quit" },
    // NEW: Advanced commands
    { cmd: "/agent", desc: "Run specialized agent  /agent <type> <task>" },
    { cmd: "/memory", desc: "Manage persistent memory" },
    { cmd: "/tasks", desc: "View and manage tasks" },
    { cmd: "/worktree", desc: "Create isolated git worktree" },
    { cmd: "/commit", desc: "Smart commit  /commit [message]" },
    { cmd: "/pr", desc: "Create pull request  /pr [title]" },
    { cmd: "/branch", desc: "Branch management  /branch [name] [action]" },
    { cmd: "/review", desc: "Review code for issues  /review [files]" },
    { cmd: "/test", desc: "Generate tests  /test <file>" },
    { cmd: "/index", desc: "Index codebase  /index [rebuild]" },
    { cmd: "/search", desc: "Search code  /search <query>" },
    { cmd: "/refactor", desc: "Refactor code  /refactor <type> <file>" },
    { cmd: "/smells", desc: "Detect code smells  /smells <file>" },
    { cmd: "/extract", desc: "Extract function  /extract <file> <start> <end> <name>" },
    { cmd: "/rename", desc: "Rename symbol  /rename <old> <new> [scope]" },
    { cmd: "/simplify", desc: "Simplify code  /simplify <file>" },
    { cmd: "/optimize", desc: "Optimize code  /optimize <file>" },
    // Phase 3: Collaboration
    { cmd: "/pr-review", desc: "Post automated PR review  /pr-review [pr-number]" },
    { cmd: "/pr-comments", desc: "View PR comments  /pr-comments [pr-number]" },
    { cmd: "/pr-reply", desc: "Reply to PR comment  /pr-reply <comment-id> <text>" },
    { cmd: "/notify", desc: "Send notification to Slack/Discord" },
    { cmd: "/team-sync", desc: "Sync team memories  /team-sync" },
];
const ensureSessDir = () => fs.mkdirSync(SESSIONS_DIR, { recursive: true });
const newSessionId = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
function saveSession(s) {
    ensureSessDir();
    fs.writeFileSync(path.join(SESSIONS_DIR, `${s.id}.json`), JSON.stringify(s, null, 2), "utf-8");
}
function loadSessions() {
    ensureSessDir();
    return fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => { try {
        return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf-8"));
    }
    catch {
        return null;
    } })
        .filter(Boolean)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
function sessionTitle(msgs) {
    const first = msgs.find(m => m.role === "user");
    if (!first)
        return "Empty session";
    const txt = typeof first.content === "string" ? first.content
        : (first.content?.find?.((x) => x.type === "text")?.text || "");
    return txt.slice(0, 60) + (txt.length > 60 ? "…" : "");
}
// ── Banner ────────────────────────────────────────────────────────────────────
const LOGO = [
    " ██████╗ ███╗   ███╗███╗   ██╗██╗",
    "██╔═══██╗████╗ ████║████╗  ██║██║",
    "██║   ██║██╔████╔██║██╔██╗ ██║██║",
    "██║   ██║██║╚██╔╝██║██║╚██╗██║██║",
    "╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║",
    " ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝",
];
const GRAD = [fg.cyan, fg.sky, fg.teal, fg.teal, fg.sky, fg.cyan];
function printBanner(model, sessId, provider) {
    const W = cols();
    const line = (s) => c(fg.cyan, "│") + padTo(" " + s, W - 2) + c(fg.cyan, "│");
    console.log();
    console.log(c(fg.cyan, "╭" + "─".repeat(W - 2) + "╮"));
    // Logo centered
    for (let i = 0; i < LOGO.length; i++) {
        const pad = " ".repeat(Math.max(0, Math.floor((W - 2 - LOGO[i].length) / 2)));
        const raw = pad + LOGO[i];
        console.log(c(fg.cyan, "│") + padTo(c(GRAD[i], raw), W - 2) + c(fg.cyan, "│"));
    }
    console.log(c(fg.cyan, "│") + " ".repeat(W - 2) + c(fg.cyan, "│"));
    // tagline
    const tag = `${DIM}powered by ${R}${c(fg.teal, "OmniRoute")} ${c(fg.gray, "·")} ${c(fg.sky, "Kiro")}  ${c(fg.gray, "v2.1")}`;
    const tagPad = " ".repeat(Math.max(0, Math.floor((W - 2 - stripAnsi(tag).length) / 2)));
    console.log(c(fg.cyan, "│") + padTo(tagPad + tag, W - 2) + c(fg.cyan, "│"));
    console.log(c(fg.cyan, "├" + "─".repeat(W - 2) + "┤"));
    // info
    const providerColor = provider === "ollama" ? fg.lime : fg.cyan;
    console.log(line(`${c(fg.gray, "provider")}  ${c(providerColor, provider)}`));
    console.log(line(`${c(fg.gray, "model   ")}  ${c(fg.green, model)}`));
    console.log(line(`${c(fg.gray, "dir     ")}  ${c(fg.yellow, WORK_DIR.replace(os.homedir(), "~"))}`));
    console.log(line(`${c(fg.gray, "sess    ")}  ${c(fg.purple, sessId)}`));
    console.log(c(fg.cyan, "├" + "─".repeat(W - 2) + "┤"));
    // hints
    const hints = `${c(fg.gray, "/")} ${c(fg.gray, "commands")}  ${c(fg.cyan, "·")}  ${c(fg.gray, "/skills")} ${c(fg.gray, "plugins")}  ${c(fg.cyan, "·")}  ${c(fg.gray, "ctrl+c quit")}`;
    console.log(line(hints));
    console.log(c(fg.cyan, "╰" + "─".repeat(W - 2) + "╯"));
    console.log();
}
// ── Animated intro ────────────────────────────────────────────────────────────
async function animatedIntro() {
    const frames = [
        [fg.gray, fg.gray, fg.gray, fg.gray, fg.gray, fg.gray],
        [fg.purple, fg.gray, fg.gray, fg.gray, fg.gray, fg.gray],
        [fg.sky, fg.purple, fg.gray, fg.gray, fg.gray, fg.gray],
        [fg.cyan, fg.sky, fg.purple, fg.gray, fg.gray, fg.gray],
        [fg.teal, fg.cyan, fg.sky, fg.purple, fg.gray, fg.gray],
        [fg.cyan, fg.teal, fg.cyan, fg.sky, fg.purple, fg.gray],
        GRAD, GRAD,
    ];
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    // Switch to alternate screen — clean canvas, no scroll issues (like vim/fzf)
    process.stdout.write("\x1b[?1049h");
    process.stdout.write("\x1b[?25l"); // hide cursor
    process.stdout.write("\x1b[2J\x1b[H"); // clear alt screen
    const drawFrame = (frame) => {
        process.stdout.write("\x1b[H"); // move to top-left (no scroll possible)
        process.stdout.write("\n\n");
        for (let i = 0; i < LOGO.length; i++) {
            process.stdout.write(`\r${c(frame[i], "    " + LOGO[i])}\n`);
        }
    };
    for (let f = 0; f < frames.length; f++) {
        drawFrame(frames[f]);
        await sleep(f === frames.length - 1 ? 350 : 65);
    }
    process.stdout.write("\x1b[?25h"); // restore cursor
    process.stdout.write("\x1b[?1049l"); // switch back to main screen
}
// ── Selector ──────────────────────────────────────────────────────────────────
async function selectMenu(items, title) {
    return new Promise(resolve => {
        let idx = 0;
        let initialized = false;
        // Total lines the menu will occupy (header + hint + blank + items + blank)
        const menuHeight = items.length + 5;
        const buildContent = () => {
            const lines = [];
            lines.push(`\n  ${B}${c(fg.cyan, "◆")} ${c(fg.white, title)}${R}`);
            lines.push(`  ${c(fg.gray, "↑↓ navigate  ·  enter select  ·  esc cancel")}\n`);
            items.forEach((item, i) => {
                const sel = i === idx;
                const arrow = sel ? c(fg.cyan, " ❯ ") : "   ";
                const lbl = sel ? `${B}${c(fg.white, item.label)}${R}` : c(fg.gray, item.label);
                const detail = item.detail ? `  ${c(fg.gray, item.detail)}` : "";
                lines.push(arrow + lbl + detail);
            });
            lines.push("");
            return lines.join("\n");
        };
        const draw = () => {
            if (!initialized) {
                // Pre-reserve space so the menu never causes scrolling.
                // Write N blank lines, then jump back up — cursor is now
                // guaranteed to have room below it.
                process.stdout.write("\n".repeat(menuHeight));
                process.stdout.write(`\x1b[${menuHeight}A`);
                process.stdout.write("\x1b7"); // save cursor (nothing below can scroll it away)
                initialized = true;
            }
            else {
                process.stdout.write("\x1b8\x1b[0J"); // restore + clear to end
            }
            process.stdout.write(buildContent());
        };
        draw();
        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        if (stdin.setRawMode)
            stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        const done = (val) => {
            stdin.removeListener("data", onKey);
            if (stdin.setRawMode)
                stdin.setRawMode(wasRaw || false);
            process.stdout.write("\x1b[?25h");
            resolve(val);
        };
        const onKey = (key) => {
            if (key === "\x1b[A" || key === "\x1bOA") {
                idx = (idx - 1 + items.length) % items.length;
                draw();
            }
            else if (key === "\x1b[B" || key === "\x1bOB") {
                idx = (idx + 1) % items.length;
                draw();
            }
            else if (key === "\r" || key === "\n")
                done(items[idx].value);
            else if (key === "\x1b" || key === "\x03")
                done(null);
        };
        process.stdout.write("\x1b[?25l");
        stdin.on("data", onKey);
    });
}
// ── Spinners ──────────────────────────────────────────────────────────────────
const SPINNERS = {
    think: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    dots: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
    pulse: ["◐", "◓", "◑", "◒"],
    arc: ["◜", "◠", "◝", "◞", "◡", "◟"],
    bounce: ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█", "▉", "▊", "▋", "▌", "▍", "▎"],
};
let spinHandle = null;
let spinFrame = 0;
function startSpinner(label = "thinking", style = "think") {
    spinFrame = 0;
    const frames = SPINNERS[style];
    const colors = [fg.cyan, fg.sky, fg.teal, fg.purple, fg.sky, fg.cyan];
    process.stdout.write("\n");
    spinHandle = setInterval(() => {
        clrLine();
        const f = frames[spinFrame % frames.length];
        const col = colors[Math.floor(spinFrame / frames.length) % colors.length];
        process.stdout.write(`  ${c(col, f)}  ${c(fg.gray, label + "…")}`);
        spinFrame++;
    }, 80);
}
function stopSpinner() {
    if (spinHandle) {
        clearInterval(spinHandle);
        spinHandle = null;
    }
    clrLine();
}
// ── Markdown renderer with typewriter effect ─────────────────────────────────
async function renderMdAnimated(text, animate = true) {
    const lines = text.split("\n");
    const out = [];
    let inCode = false, codeLines = [], codeLang = "";
    for (const raw of lines) {
        if (raw.startsWith("```")) {
            if (!inCode) {
                inCode = true;
                codeLang = raw.slice(3).trim() || "code";
                codeLines = [];
            }
            else {
                inCode = false;
                const W = Math.min(cols() - 6, 90);
                out.push(`  ${c(fg.gray, "╭─")} ${c(fg.yellow, codeLang)} ${c(fg.gray, "─".repeat(Math.max(0, W - codeLang.length - 3)))}`);
                // Apply syntax highlighting if enabled
                const codeText = codeLines.join("\n");
                const highlighted = CONFIG.syntaxHighlight
                    ? (0, syntax_1.highlightCode)(codeText, codeLang, {
                        keyword: fg.purple,
                        string: fg.green,
                        comment: fg.gray,
                        number: fg.orange,
                        operator: fg.cyan,
                        function: fg.sky,
                        type: fg.yellow,
                        reset: R,
                    })
                    : codeText;
                for (const cl of highlighted.split("\n")) {
                    out.push(`  ${c(fg.gray, "│")} ${cl}`);
                }
                out.push(`  ${c(fg.gray, "╰" + "─".repeat(W + 1))}`);
                codeLines = [];
            }
            continue;
        }
        if (inCode) {
            codeLines.push(raw);
            continue;
        }
        const hm = raw.match(/^(#{1,3}) (.+)/);
        if (hm) {
            const lc = [fg.white, fg.sky, fg.teal][hm[1].length - 1] || fg.white;
            out.push(`\n  ${B}${c(lc, hm[2])}${R}`);
            continue;
        }
        const bm = raw.match(/^(\s*)[-*] (.+)/);
        if (bm) {
            out.push("  " + "  ".repeat(Math.floor(bm[1].length / 2)) + c(fg.teal, "▸") + " " + inl(bm[2]));
            continue;
        }
        const nm = raw.match(/^(\d+)\. (.+)/);
        if (nm) {
            out.push(`  ${c(fg.teal, nm[1] + ".")} ${inl(nm[2])}`);
            continue;
        }
        if (raw.trim())
            out.push("  " + inl(raw));
        else
            out.push("");
    }
    // Animate output if enabled
    if (animate && CONFIG.typewriterEffect) {
        const typewriter = new animations_1.Typewriter({
            speed: CONFIG.typewriterSpeed,
            minDelay: 3,
            maxDelay: 15,
            punctuationDelay: 50
        });
        for (const line of out) {
            await typewriter.type(line + '\n');
        }
    }
    else {
        console.log(out.join("\n"));
    }
}
function renderMd(text) {
    const lines = text.split("\n");
    const out = [];
    let inCode = false, codeLines = [], codeLang = "";
    for (const raw of lines) {
        if (raw.startsWith("```")) {
            if (!inCode) {
                inCode = true;
                codeLang = raw.slice(3).trim() || "code";
                codeLines = [];
            }
            else {
                inCode = false;
                const W = Math.min(cols() - 6, 90);
                out.push(`  ${c(fg.gray, "╭─")} ${c(fg.yellow, codeLang)} ${c(fg.gray, "─".repeat(Math.max(0, W - codeLang.length - 3)))}`);
                // Apply syntax highlighting if enabled
                const codeText = codeLines.join("\n");
                const highlighted = CONFIG.syntaxHighlight
                    ? (0, syntax_1.highlightCode)(codeText, codeLang, {
                        keyword: fg.purple,
                        string: fg.green,
                        comment: fg.gray,
                        number: fg.orange,
                        operator: fg.cyan,
                        function: fg.sky,
                        type: fg.yellow,
                        reset: R,
                    })
                    : codeText;
                for (const cl of highlighted.split("\n")) {
                    out.push(`  ${c(fg.gray, "│")} ${cl}`);
                }
                out.push(`  ${c(fg.gray, "╰" + "─".repeat(W + 1))}`);
                codeLines = [];
            }
            continue;
        }
        if (inCode) {
            codeLines.push(raw);
            continue;
        }
        const hm = raw.match(/^(#{1,3}) (.+)/);
        if (hm) {
            const lc = [fg.white, fg.sky, fg.teal][hm[1].length - 1] || fg.white;
            out.push(`\n  ${B}${c(lc, hm[2])}${R}`);
            continue;
        }
        const bm = raw.match(/^(\s*)[-*] (.+)/);
        if (bm) {
            out.push("  " + "  ".repeat(Math.floor(bm[1].length / 2)) + c(fg.teal, "▸") + " " + inl(bm[2]));
            continue;
        }
        const nm = raw.match(/^(\d+)\. (.+)/);
        if (nm) {
            out.push(`  ${c(fg.teal, nm[1] + ".")} ${inl(nm[2])}`);
            continue;
        }
        if (raw.startsWith("> ")) {
            out.push("  " + c(fg.gray, "┃") + " " + c(IT, inl(raw.slice(2))));
            continue;
        }
        out.push(raw === "" ? "" : "  " + inl(raw));
    }
    return out.join("\n");
}
function inl(s) {
    return s
        .replace(/`([^`]+)`/g, (_, x) => `${fg.cyan}${x}${R}`)
        .replace(/\*\*([^*]+)\*\*/g, (_, x) => `${B}${x}${R}`)
        .replace(/\*([^*]+)\*/g, (_, x) => `${IT}${x}${R}`)
        .replace(/~~([^~]+)~~/g, (_, x) => `\x1b[9m${x}${R}`)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, (_, l) => `${UL}${c(fg.sky, l)}${R}`);
}
// ── Tool display ──────────────────────────────────────────────────────────────
const TOOL_STYLE = {
    read_file: { icon: "📖", col: fg.sky },
    write_file: { icon: "✏️ ", col: fg.lime },
    list_files: { icon: "📁", col: fg.yellow },
    run_command: { icon: "⚡", col: fg.orange },
    search_in_files: { icon: "🔍", col: fg.purple },
    delete_file: { icon: "🗑️ ", col: fg.red },
};
function showTool(name, args, result) {
    const s = TOOL_STYLE[name] || { icon: "⚙️ ", col: fg.gray };
    const arg1 = String(Object.values(args)[0] || "").slice(0, 60);
    // Show tool execution with animation
    console.log(`\n  ${c(fg.gray, "│")} ${s.icon}  ${c(s.col, name)}  ${c(fg.gray, arg1)}`);
    // Show diff for write_file operations
    if (name === "write_file" && result && result.startsWith("DIFF:")) {
        const diffContent = result.slice(5);
        console.log(diffContent);
    }
    // Show result summary for other operations
    if (result && !result.startsWith("DIFF:") && !result.startsWith("✓")) {
        const preview = result.slice(0, 100);
        if (preview.length < result.length) {
            console.log(`  ${c(fg.gray, "│")}   ${c(fg.gray, preview + "...")}`);
        }
    }
}
// ── Vision ────────────────────────────────────────────────────────────────────
function encodeImage(p) {
    try {
        const abs = path.isAbsolute(p) ? p : path.join(WORK_DIR, p);
        const data = fs.readFileSync(abs);
        const ext = path.extname(p).toLowerCase().slice(1);
        const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
        const mt = mime[ext] || "image/png";
        return { type: "image_url", image_url: { url: `data:${mt};base64,${data.toString("base64")}` } };
    }
    catch {
        return null;
    }
}
// ── Tool runners ──────────────────────────────────────────────────────────────
const res = (p) => path.isAbsolute(p) ? p : path.join(WORK_DIR, p);
// Cross-platform file search (replaces shell grep)
function searchInFiles(pattern, searchPath) {
    const results = [];
    const regex = new RegExp(pattern, "i");
    const fullPath = res(searchPath);
    function search(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullEntryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules, .git, etc.
                    if (!["node_modules", ".git", ".omni", "dist"].includes(entry.name)) {
                        search(fullEntryPath);
                    }
                }
                else if (entry.isFile()) {
                    try {
                        const content = fs.readFileSync(fullEntryPath, "utf-8");
                        const lines = content.split("\n");
                        lines.forEach((line, idx) => {
                            if (regex.test(line)) {
                                const relPath = path.relative(WORK_DIR, fullEntryPath);
                                results.push(`${relPath}:${idx + 1}:${line.trim()}`);
                            }
                        });
                    }
                    catch (e) {
                        // Skip binary files or files we can't read
                    }
                }
            }
        }
        catch (e) {
            // Skip directories we can't read
        }
    }
    if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            search(fullPath);
        }
        else {
            // Single file search
            try {
                const content = fs.readFileSync(fullPath, "utf-8");
                const lines = content.split("\n");
                lines.forEach((line, idx) => {
                    if (regex.test(line)) {
                        results.push(`${searchPath}:${idx + 1}:${line.trim()}`);
                    }
                });
            }
            catch (e) {
                return `Error reading file: ${e}`;
            }
        }
    }
    return results.length > 0 ? results.slice(0, 100).join("\n") : "No matches";
}
function runTool(name, args) {
    try {
        // Check if it's an MCP tool (format: mcp:server:tool)
        if (name.startsWith("mcp:")) {
            const parts = name.split(":");
            if (parts.length === 3) {
                const [, serverName, toolName] = parts;
                // MCP tools are async, but we need sync here - return placeholder
                // In practice, this should be handled in runAgent with async/await
                return `[MCP tool ${toolName} from ${serverName}]`;
            }
        }
        // Check if it's an advanced tool from ToolManager
        const advancedToolNames = ["edit_file", "glob", "grep", "git_status", "git_diff", "git_commit", "git_log"];
        if (advancedToolNames.includes(name)) {
            // These are async, we'll handle them in runAgent
            return `[Advanced tool ${name} - handled async]`;
        }
        switch (name) {
            case "read_file": {
                const filePath = res(args.path);
                const stat = fs.statSync(filePath);
                // Lazy load large files
                if (stat.size > 1000000) {
                    const t = fs.readFileSync(filePath, "utf-8");
                    return t.slice(0, 120000) + `\n[truncated - file is ${(stat.size / 1024 / 1024).toFixed(1)}MB]`;
                }
                const t = fs.readFileSync(filePath, "utf-8");
                return t.length > 120000 ? t.slice(0, 120000) + "\n[truncated]" : t;
            }
            case "write_file": {
                const filePath = res(args.path);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                // Generate diff if file exists
                let diffOutput = "";
                if (fs.existsSync(filePath)) {
                    const oldContent = fs.readFileSync(filePath, "utf-8");
                    const diff = (0, diff_1.generateDiff)(oldContent, args.content);
                    diffOutput = "\n" + (0, diff_1.formatDiff)(diff, {
                        add: fg.green,
                        remove: fg.red,
                        context: fg.gray,
                        reset: R,
                    });
                }
                fs.writeFileSync(filePath, args.content, "utf-8");
                return diffOutput ? `DIFF:${diffOutput}\n✓ Written ${args.path}` : `✓ Written ${args.path}`;
            }
            case "list_files":
                return fs.readdirSync(res(args.path || "."), { withFileTypes: true })
                    .map(i => i.isDirectory() ? `📁 ${i.name}/` : `📄 ${i.name}`).join("\n") || "(empty)";
            case "run_command":
                return (0, child_process_1.execSync)(args.command, { cwd: WORK_DIR, timeout: 30000, encoding: "utf-8" }) || "(no output)";
            case "search_in_files":
                return searchInFiles(args.pattern, args.path || ".");
            case "delete_file":
                fs.unlinkSync(res(args.path));
                return `✓ Deleted ${args.path}`;
            default: return `Unknown tool: ${name}`;
        }
    }
    catch (e) {
        return `Error: ${e.message}`;
    }
}
// ── API ───────────────────────────────────────────────────────────────────────
function getToolsDef() {
    // Get tools from ToolManager
    const toolDefs = toolManager.getDefinitions().map(def => ({
        type: "function",
        function: {
            name: def.name,
            description: def.description,
            parameters: def.parameters,
        },
    }));
    // Add basic tools that aren't in ToolManager yet
    const baseTools = [
        { type: "function", function: { name: "read_file", description: "Read a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
        { type: "function", function: { name: "write_file", description: "Write content to a file", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } } },
        { type: "function", function: { name: "list_files", description: "List directory", parameters: { type: "object", properties: { path: { type: "string" } } } } },
        { type: "function", function: { name: "run_command", description: "Run shell command", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } },
        { type: "function", function: { name: "search_in_files", description: "Search text in files", parameters: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } } },
        { type: "function", function: { name: "delete_file", description: "Delete a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
    ];
    // Add MCP tools
    const mcpTools = mcpManager.getAllTools();
    for (const { server, tool } of mcpTools) {
        baseTools.push({
            type: "function",
            function: {
                name: `mcp:${server}:${tool.name}`,
                description: `[MCP:${server}] ${tool.description}`,
                parameters: tool.inputSchema,
            },
        });
    }
    // Combine all tools
    return [...toolDefs, ...baseTools];
}
const TOOLS_DEF = getToolsDef();
async function callAPI(msgs, model, attempt = 0) {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify({ model, messages: msgs, tools: TOOLS_DEF, tool_choice: "auto", max_tokens: 8192, stream: false }),
    });
    const raw = await r.text();
    if (raw.trimStart().startsWith("data:"))
        return parseSSE(raw);
    // Auto-retry: "reset after Ns" or 5xx
    const resetMatch = raw.match(/reset after (\d+)s/i);
    if ((resetMatch || r.status >= 500) && attempt < 3) {
        const wait = resetMatch ? (parseInt(resetMatch[1]) + 1) * 1000 : 2000;
        await new Promise(res => setTimeout(res, wait));
        return callAPI(msgs, model, attempt + 1);
    }
    if (!r.ok)
        throw new Error(`API ${r.status}: ${raw.slice(0, 300)}`);
    try {
        return JSON.parse(raw);
    }
    catch {
        if (attempt < 2) {
            await new Promise(res => setTimeout(res, 1200));
            return callAPI(msgs, model, attempt + 1);
        }
        throw new Error(`Bad JSON from API: ${raw.slice(0, 150)}`);
    }
}
function parseSSE(raw) {
    let content = "";
    const tcs = [];
    for (const line of raw.split("\n").filter(l => l.startsWith("data:"))) {
        const json = line.slice(5).trim();
        if (json === "[DONE]")
            break;
        try {
            const d = JSON.parse(json).choices?.[0]?.delta;
            if (!d)
                continue;
            if (d.content)
                content += d.content;
            if (d.tool_calls)
                for (const tc of d.tool_calls) {
                    const i = tc.index ?? 0;
                    if (!tcs[i])
                        tcs[i] = { id: "", type: "function", function: { name: "", arguments: "" } };
                    if (tc.id)
                        tcs[i].id = tc.id;
                    if (tc.function?.name)
                        tcs[i].function.name += tc.function.name;
                    if (tc.function?.arguments)
                        tcs[i].function.arguments += tc.function.arguments;
                }
        }
        catch { }
    }
    return { choices: [{ message: { role: "assistant", content: content || null, tool_calls: tcs.length ? tcs : undefined }, finish_reason: "stop" }] };
}
// ── Agent ─────────────────────────────────────────────────────────────────────
async function runAgent(input, history, model, pendingImage, onTool, provider, onStreamStart) {
    const userContent = pendingImage
        ? [encodeImage(pendingImage), { type: "text", text: input }].filter(Boolean)
        : input;
    const msgs = [
        { role: "system", content: `You are an expert coding assistant. Working dir: ${WORK_DIR}. Read files before editing. Be concise.` },
        ...history,
        { role: "user", content: userContent },
    ];
    // Get fresh tools list (includes MCP tools)
    const tools = getToolsDef();
    for (let i = 0; i < 25; i++) {
        // Streaming callback for real-time token display
        let streamedContent = "";
        let streamStarted = false;
        const onToken = CONFIG.streamingEnabled ? (token) => {
            if (!streamStarted) {
                streamStarted = true;
                onStreamStart?.();
            }
            streamedContent += token;
            process.stdout.write(token);
        } : undefined;
        const response = await provider.call(msgs, {
            model,
            tools,
            tool_choice: "auto",
            max_tokens: 8192,
            stream: CONFIG.streamingEnabled,
            onToken,
        });
        // If we streamed, add newline after completion
        if (CONFIG.streamingEnabled && streamedContent) {
            process.stdout.write("\n");
        }
        msgs.push({
            role: response.role,
            content: response.content,
            tool_calls: response.tool_calls,
        });
        const tcs = response.tool_calls;
        if (!tcs?.length)
            return response.content || "";
        for (const tc of tcs) {
            let args = {};
            try {
                args = JSON.parse(tc.function.arguments || "{}");
            }
            catch { }
            // Handle MCP tools asynchronously
            let result;
            if (tc.function.name.startsWith("mcp:")) {
                const parts = tc.function.name.split(":");
                if (parts.length === 3) {
                    const [, serverName, toolName] = parts;
                    try {
                        const mcpResult = await mcpManager.callTool(serverName, toolName, args);
                        result = JSON.stringify(mcpResult);
                    }
                    catch (e) {
                        result = `MCP Error: ${e.message}`;
                    }
                }
                else {
                    result = "Invalid MCP tool name format";
                }
            }
            else {
                // Check if it's an advanced tool
                const advancedToolNames = ["edit_file", "glob", "grep", "git_status", "git_diff", "git_commit", "git_log"];
                if (advancedToolNames.includes(tc.function.name)) {
                    try {
                        const toolResult = await toolManager.execute(tc.function.name, args, { workDir: WORK_DIR });
                        result = toolResult.success ? toolResult.output : `Error: ${toolResult.error}`;
                    }
                    catch (e) {
                        result = `Tool Error: ${e.message}`;
                    }
                }
                else {
                    result = runTool(tc.function.name, args);
                }
            }
            onTool(tc.function.name, args, result);
            msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
        }
    }
    return "";
}
// ── Context helpers ────────────────────────────────────────────────────────────
// Token estimation now handled by tokens.ts module
// ── Custom input: enhanced with IDE-like autocomplete ───────────────────────
async function readInput(history, pendingImg, onCtrlC) {
    const input = new input_simple_1.EnhancedInput({
        history,
        pendingImg,
        onCtrlC,
        autocomplete,
        colors: fg,
        estimateTokens: tokens_1.estimateMessagesTokens,
        formatTokens: tokens_1.formatTokens,
        cmdHistory,
    });
    return input.read();
}
// ── REPL ──────────────────────────────────────────────────────────────────────
async function main() {
    const argv = process.argv.slice(2);
    let model = argv.find(a => a.startsWith("--model="))?.split("=")[1] || DEF_MODEL;
    const oneshot = argv.filter(a => !a.startsWith("--")).join(" ");
    const sessId = newSessionId();
    const session = { id: sessId, model, startedAt: new Date().toISOString(), messages: [] };
    await animatedIntro();
    // Load available models from API
    MODELS = await (0, models_1.fetchAvailableModels)(BASE_URL, API_KEY);
    console.log(`  ${c(fg.gray, `Loaded ${MODELS.length} models from Omniroute`)}`);
    // Initialize model orchestrator
    modelOrchestrator = new orchestrator_1.ModelOrchestrator(MODELS);
    console.log(`  ${c(fg.gray, `Model orchestrator initialized`)}`);
    // Initialize code reviewer
    codeReviewer = new reviewer_1.CodeReviewer(WORK_DIR, currentProvider, model);
    console.log(`  ${c(fg.gray, `Code reviewer initialized`)}`);
    // Initialize test generator
    testGenerator = new test_generator_1.TestGenerator(WORK_DIR, currentProvider, model);
    console.log(`  ${c(fg.gray, `Test generator initialized`)}`);
    // Initialize refactoring assistant
    refactoringAssistant = new refactoring_1.RefactoringAssistant(WORK_DIR, currentProvider, model);
    console.log(`  ${c(fg.gray, `Refactoring assistant initialized`)}`);
    // Initialize codebase indexer
    codebaseIndexer = new indexer_1.CodebaseIndexer(WORK_DIR);
    const indexLoaded = await codebaseIndexer.loadIndex();
    if (indexLoaded) {
        const stats = codebaseIndexer.getStats();
        console.log(`  ${c(fg.gray, `Loaded index: ${stats.totalChunks} chunks from ${stats.totalFiles} files`)}`);
    }
    else {
        console.log(`  ${c(fg.gray, `No index found. Run /index to build one.`)}`);
    }
    // Initialize Phase 3 integrations
    githubPR = new github_pr_1.GitHubPRIntegration(WORK_DIR);
    console.log(`  ${c(fg.gray, `GitHub PR integration initialized`)}`);
    // Load chat integration config if available
    const chatConfigPath = path.join(os.homedir(), ".omni", "chat-config.json");
    if (fs.existsSync(chatConfigPath)) {
        try {
            const chatConfig = JSON.parse(fs.readFileSync(chatConfigPath, "utf-8"));
            chatIntegration = new chat_1.ChatIntegrationManager(chatConfig);
            console.log(`  ${c(fg.gray, `Chat integration loaded (Slack/Discord)`)}`);
        }
        catch (e) {
            console.log(`  ${c(fg.yellow, `⚠ Failed to load chat config`)}`);
        }
    }
    // Load team memory sync config if available
    const teamMemoryConfigPath = path.join(os.homedir(), ".omni", "team-memory-config.json");
    if (fs.existsSync(teamMemoryConfigPath)) {
        try {
            const teamMemoryConfig = JSON.parse(fs.readFileSync(teamMemoryConfigPath, "utf-8"));
            teamMemorySync = new team_memory_1.TeamMemorySync(teamMemoryConfig);
            await teamMemorySync.initialize();
            console.log(`  ${c(fg.gray, `Team memory sync initialized (${teamMemoryConfig.syncMethod})`)}`);
            // Enable auto-sync if configured
            if (teamMemoryConfig.autoSync) {
                teamMemorySync.enableAutoSync(teamMemoryConfig.syncInterval || 5);
            }
        }
        catch (e) {
            console.log(`  ${c(fg.yellow, `⚠ Failed to load team memory config`)}`);
        }
    }
    // Initialize autocomplete engine
    autocomplete.setCommands(CMDS);
    autocomplete.setModels(MODELS);
    autocomplete.setProviders(["omniroute", "ollama"]);
    // Initialize providers with loaded models
    providers.set("omniroute", new omniroute_1.OmniRouteProvider({
        name: "omniroute",
        url: BASE_URL,
        apiKey: API_KEY,
        models: MODELS.map(m => m.id),
        defaultModel: DEF_MODEL,
    }));
    providers.set("ollama", new ollama_1.OllamaProvider({
        name: "ollama",
        url: "http://localhost:11434",
        models: ["gemma:4b"],
    }));
    currentProvider = providers.get("omniroute");
    // Load MCP config
    await mcpManager.loadConfig();
    // Load custom skills
    const { loaded, errors } = await skillManager.loadCustomSkills();
    if (loaded > 0) {
        console.log(`  ${c(fg.gray, `Loaded ${loaded} custom skill${loaded > 1 ? 's' : ''}`)}`);
    }
    if (errors.length > 0) {
        console.log(`  ${c(fg.red, `Skill errors: ${errors.length}`)}`);
    }
    // Debug: Check registered skills
    const registeredSkills = skillManager.getAll();
    console.log(`  ${c(fg.gray, `Registered ${registeredSkills.length} skill${registeredSkills.length !== 1 ? 's' : ''}: ${registeredSkills.map(s => s.name).join(', ')}`)}`);
    // Update autocomplete with skills
    autocomplete.setSkills(skillManager.getAll().map(s => ({ name: s.name, description: s.description })));
    printBanner(model, sessId, currentProvider.name);
    // ── one-shot mode ──────────────────────────────────────────────────────────
    if (oneshot) {
        startSpinner("thinking", "think");
        try {
            const reply = await runAgent(oneshot, [], model, null, (n, a, r) => {
                stopSpinner();
                showTool(n, a, r);
                startSpinner("running", "dots");
            }, currentProvider);
            stopSpinner();
            const W = cols();
            console.log(`\n  ${c(fg.gray, "─".repeat(W - 4))}`);
            console.log(`  ${B}${c(fg.green, "◆ omni")}${R}  ${c(fg.gray, model)}`);
            console.log(renderMd(reply));
        }
        catch (e) {
            stopSpinner();
            console.log(`\n  ${c(fg.red, "✖ " + e.message)}`);
        }
        return;
    }
    // ── interactive REPL ───────────────────────────────────────────────────────
    const history = [];
    let pendingImg = null;
    const saveAndQuit = async () => {
        // Stop all MCP servers
        await mcpManager.stopAll();
        if (session.messages.length > 0) {
            session.title = sessionTitle(session.messages);
            saveSession(session);
            console.log(`\n  ${c(fg.gray, "session saved →")} ${c(fg.purple, sessId)}`);
        }
        console.log(`\n  ${c(fg.gray, "bye.")}\n`);
        process.exit(0);
    };
    // SIGINT from OS (e.g. terminal close) — not Ctrl+C inside readInput
    process.on("SIGINT", saveAndQuit);
    const ask = async () => {
        const input = await readInput(history, pendingImg, saveAndQuit);
        if (!input)
            return ask();
        // ── commands ──────────────────────────────────────────────────────────────
        if (input === "/exit" || input === "/quit") {
            saveAndQuit();
            return;
        }
        if (input === "/clear") {
            history.length = 0;
            pendingImg = null;
            clrScreen();
            printBanner(model, sessId, currentProvider.name);
            return ask();
        }
        // Provider commands
        if (input === "/providers") {
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Providers")} ${c(fg.cyan, "─".repeat(W - 14))}`);
            for (const [name, provider] of providers) {
                const active = name === currentProvider.name;
                const indicator = active ? c(fg.green, "●") : c(fg.gray, "○");
                const nameColor = active ? fg.green : fg.gray;
                console.log(`  ${c(fg.cyan, "│")}  ${indicator} ${c(nameColor, name.padEnd(12))}`);
            }
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input === "/models") {
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Available Models")} ${c(fg.cyan, "─".repeat(W - 21))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, `Total: ${MODELS.length} models`)}\n`);
            // Group by provider
            const byProvider = new Map();
            for (const m of MODELS) {
                if (!byProvider.has(m.provider)) {
                    byProvider.set(m.provider, []);
                }
                byProvider.get(m.provider).push(m);
            }
            for (const [provider, models] of byProvider) {
                console.log(`  ${c(fg.cyan, "│")}  ${B}${c(fg.sky, provider.toUpperCase())}${R}`);
                for (const m of models) {
                    const active = m.id === model;
                    const indicator = active ? c(fg.green, "★") : " ";
                    const caps = [];
                    if (m.capabilities?.vision)
                        caps.push(c(fg.purple, "👁"));
                    if (m.capabilities?.tools)
                        caps.push(c(fg.orange, "🔧"));
                    const capStr = caps.length > 0 ? ` ${caps.join(" ")}` : "";
                    console.log(`  ${c(fg.cyan, "│")}   ${indicator} ${c(fg.sky, m.id.padEnd(30))} ${c(fg.gray, m.desc)}${capStr}`);
                }
                console.log(`  ${c(fg.cyan, "│")}`);
            }
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input.startsWith("/provider ")) {
            const name = input.slice(10).trim();
            const provider = providers.get(name);
            if (provider) {
                currentProvider = provider;
                console.log(`\n  ${c(fg.lime, "✓ Switched to:")} ${c(fg.cyan, name)}\n`);
                clrScreen();
                printBanner(model, sessId, currentProvider.name);
            }
            else {
                console.log(`\n  ${c(fg.red, "✖ Unknown provider:")} ${name}\n`);
            }
            return ask();
        }
        // Skills commands
        if (input === "/skills") {
            const skills = skillManager.getAll();
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Available Skills")} ${c(fg.cyan, "─".repeat(W - 21))}`);
            if (skills.length === 0) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "No skills loaded")}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Built-in skills: git, web")}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Custom skills: ~/.omni/skills/")}`);
            }
            else {
                for (const skill of skills) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, skill.name.padEnd(12))} ${c(fg.gray, skill.description)}`);
                    if (skill.usage) {
                        console.log(`  ${c(fg.cyan, "│")}    ${c(fg.gray, skill.usage)}`);
                    }
                }
            }
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        // ── NEW: Tools command ────────────────────────────────────────────────────
        if (input === "/tools") {
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "AI Tools")} ${c(fg.cyan, "─".repeat(W - 13))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Tools the AI can use automatically:")}\n`);
            // Advanced tools from ToolManager
            const advancedTools = toolManager.getAll();
            if (advancedTools.length > 0) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, "Advanced Tools")} ${c(fg.gray, "(from ToolManager)")}`);
                for (const tool of advancedTools) {
                    console.log(`  ${c(fg.cyan, "│")}    ${c(fg.green, "●")} ${c(fg.white, tool.name.padEnd(20))} ${c(fg.gray, tool.description)}`);
                }
                console.log(`  ${c(fg.cyan, "│")}`);
            }
            // Basic tools
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, "Basic Tools")}`);
            const basicTools = [
                { name: "read_file", desc: "Read a file" },
                { name: "write_file", desc: "Write content to a file" },
                { name: "list_files", desc: "List directory" },
                { name: "run_command", desc: "Run shell command" },
                { name: "search_in_files", desc: "Search text in files" },
                { name: "delete_file", desc: "Delete a file" },
            ];
            for (const tool of basicTools) {
                console.log(`  ${c(fg.cyan, "│")}    ${c(fg.green, "●")} ${c(fg.white, tool.name.padEnd(20))} ${c(fg.gray, tool.desc)}`);
            }
            // MCP tools
            const mcpTools = mcpManager.getAllTools();
            if (mcpTools.length > 0) {
                console.log(`  ${c(fg.cyan, "│")}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, "MCP Tools")} ${c(fg.gray, "(from MCP servers)")}`);
                for (const { server, tool } of mcpTools) {
                    console.log(`  ${c(fg.cyan, "│")}    ${c(fg.green, "●")} ${c(fg.white, `${server}:${tool.name}`.padEnd(20))} ${c(fg.gray, tool.description)}`);
                }
            }
            console.log(`  ${c(fg.cyan, "│")}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Total:")} ${c(fg.white, String(advancedTools.length + basicTools.length + mcpTools.length))} ${c(fg.gray, "tools available")}`);
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        // Check for skill triggers
        const skill = skillManager.findByTrigger(input);
        if (skill) {
            console.log(`\n  ${c(fg.purple, "◆ skill:")} ${c(fg.sky, skill.name)}`);
            startSpinner("executing", "dots");
            const toolExecutor = {
                read: async (p) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(WORK_DIR, p), "utf-8"),
                write: async (p, content) => {
                    const fullPath = path.isAbsolute(p) ? p : path.join(WORK_DIR, p);
                    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                    fs.writeFileSync(fullPath, content, "utf-8");
                },
                list: async (p) => fs.readdirSync(path.isAbsolute(p) ? p : path.join(WORK_DIR, p)),
                run: async (cmd) => (0, child_process_1.execSync)(cmd, { cwd: WORK_DIR, encoding: "utf-8" }),
                search: async (pattern, p) => {
                    // Use existing searchInFiles function
                    return "Search results...";
                },
            };
            try {
                const result = await skillManager.execute(skill.name, {
                    input,
                    args: input.split(" ").slice(1),
                    workDir: WORK_DIR,
                    history,
                    tools: toolExecutor,
                    provider: currentProvider,
                });
                stopSpinner();
                console.log(`\n  ${result.success ? c(fg.green, "✓") : c(fg.red, "✖")} ${result.message}`);
                if (result.data) {
                    console.log(`\n${JSON.stringify(result.data, null, 2)}`);
                }
                if (result.error) {
                    console.log(`  ${c(fg.red, "Error:")} ${result.error}`);
                }
                console.log();
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Skill failed:")} ${e.message}\n`);
            }
            return ask();
        }
        // Planning commands
        if (input === "/plan") {
            console.log(`\n  ${c(fg.purple, "◆ Planning mode")}`);
            console.log(`  ${c(fg.gray, "Describe your task and I'll create a plan...")}\n`);
            return ask();
        }
        if (input === "/plan show") {
            const plan = planner.getCurrentPlan();
            if (plan) {
                console.log(planner.formatPlan(plan, fg));
            }
            else {
                console.log(`\n  ${c(fg.gray, "No active plan")}\n`);
            }
            return ask();
        }
        // MCP commands
        if (input === "/mcp") {
            const status = mcpManager.getServerStatus();
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "MCP Servers")} ${c(fg.cyan, "─".repeat(W - 16))}`);
            if (status.length === 0) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "No MCP servers configured")}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Edit ~/.omni/mcp.json to add servers")}`);
            }
            else {
                for (const server of status) {
                    const statusColor = server.status === "running" ? fg.green : server.status === "error" ? fg.red : fg.gray;
                    const indicator = server.status === "running" ? "●" : server.status === "error" ? "✖" : "○";
                    console.log(`  ${c(fg.cyan, "│")}  ${c(statusColor, indicator)} ${c(fg.sky, server.name.padEnd(15))} ${c(fg.gray, server.status.padEnd(10))} ${c(fg.gray, server.toolCount + " tools")}`);
                }
            }
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input.startsWith("/mcp start ")) {
            const name = input.slice(11).trim();
            try {
                startSpinner("starting MCP server", "dots");
                await mcpManager.startServer(name);
                stopSpinner();
                console.log(`\n  ${c(fg.lime, "✓ Started MCP server:")} ${c(fg.cyan, name)}\n`);
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Failed to start:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/mcp stop ")) {
            const name = input.slice(10).trim();
            try {
                await mcpManager.stopServer(name);
                console.log(`\n  ${c(fg.lime, "✓ Stopped MCP server:")} ${c(fg.cyan, name)}\n`);
            }
            catch (e) {
                console.log(`\n  ${c(fg.red, "✖ Failed to stop:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input === "/help") {
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Commands")} ${c(fg.cyan, "─".repeat(W - 14))}`);
            for (const cmd of CMDS)
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, cmd.cmd.padEnd(14))} ${c(fg.gray, cmd.desc)}`);
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        // ── NEW: Agent command ────────────────────────────────────────────────────
        if (input.startsWith("/agent ")) {
            const parts = input.slice(7).split(" ");
            const agentType = parts[0];
            const task = parts.slice(1).join(" ");
            if (!task) {
                console.log(`\n  ${c(fg.red, "Usage:")} /agent <explore|plan|review|test> <task>\n`);
                return ask();
            }
            console.log(`\n  ${c(fg.purple, "◆ Agent:")} ${c(fg.sky, agentType)}`);
            startSpinner(`running ${agentType} agent`, "dots");
            try {
                const result = await agentManager.execute(agentType, task, {
                    workDir: WORK_DIR,
                    history,
                    provider: currentProvider,
                    model,
                    tools: getToolsDef(),
                });
                stopSpinner();
                if (result.success) {
                    console.log(`\n${renderMd(result.output)}\n`);
                }
                else {
                    console.log(`\n  ${c(fg.red, "✖ Agent failed:")} ${result.error}\n`);
                }
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Error:")} ${e.message}\n`);
            }
            return ask();
        }
        // ── NEW: Memory commands ──────────────────────────────────────────────────
        if (input.startsWith("/memory")) {
            const args = input.slice(8).trim().split(" ");
            const action = args[0];
            if (action === "save") {
                const type = args[1];
                const name = args[2];
                const content = args.slice(3).join(" ");
                if (!type || !name || !content) {
                    console.log(`\n  ${c(fg.red, "Usage:")} /memory save <user|feedback|project|reference> <name> <content>\n`);
                    return ask();
                }
                memoryManager.save({
                    name,
                    type,
                    description: content.slice(0, 100),
                    content,
                });
                console.log(`\n  ${c(fg.lime, "✓ Memory saved:")} ${name}\n`);
            }
            else if (action === "list") {
                const memories = memoryManager.list();
                const W = cols();
                console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Memories")} ${c(fg.cyan, "─".repeat(W - 13))}`);
                if (memories.length === 0) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "No memories saved yet")}`);
                }
                else {
                    for (const mem of memories) {
                        const typeColor = { user: fg.sky, feedback: fg.orange, project: fg.purple, reference: fg.green }[mem.type];
                        console.log(`  ${c(fg.cyan, "│")}  ${c(typeColor, mem.type.padEnd(10))} ${c(fg.white, mem.name)}`);
                        console.log(`  ${c(fg.cyan, "│")}    ${c(fg.gray, mem.description)}`);
                    }
                }
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            else if (action === "search") {
                const query = args.slice(1).join(" ");
                const results = memoryManager.search(query);
                console.log(`\n  ${c(fg.cyan, "Found")} ${c(fg.white, String(results.length))} ${c(fg.cyan, "memories:")}\n`);
                for (const mem of results) {
                    console.log(`  ${c(fg.sky, mem.name)} ${c(fg.gray, `(${mem.type})`)}`);
                    console.log(`    ${c(fg.gray, mem.description)}\n`);
                }
            }
            else if (action === "delete") {
                const name = args[1];
                if (memoryManager.delete(name)) {
                    console.log(`\n  ${c(fg.lime, "✓ Deleted memory:")} ${name}\n`);
                }
                else {
                    console.log(`\n  ${c(fg.red, "✖ Memory not found:")} ${name}\n`);
                }
            }
            else {
                console.log(`\n  ${c(fg.red, "Usage:")} /memory <save|list|search|delete>\n`);
            }
            return ask();
        }
        // ── NEW: Tasks commands ───────────────────────────────────────────────────
        if (input === "/tasks") {
            console.log(taskManager.format(fg));
            return ask();
        }
        if (input.startsWith("/task ")) {
            const args = input.slice(6).split(" ");
            const action = args[0];
            if (action === "create") {
                const subject = args[1];
                const description = args.slice(2).join(" ");
                if (!subject) {
                    console.log(`\n  ${c(fg.red, "Usage:")} /task create <subject> [description]\n`);
                    return ask();
                }
                const task = taskManager.create({ subject, description: description || subject });
                console.log(`\n  ${c(fg.lime, "✓ Task created:")} #${task.id} ${task.subject}\n`);
            }
            else if (action === "update") {
                const id = args[1];
                const status = args[2];
                if (!id || !status) {
                    console.log(`\n  ${c(fg.red, "Usage:")} /task update <id> <pending|in_progress|completed|failed>\n`);
                    return ask();
                }
                if (taskManager.setStatus(id, status)) {
                    console.log(`\n  ${c(fg.lime, "✓ Task updated:")} #${id} → ${status}\n`);
                }
                else {
                    console.log(`\n  ${c(fg.red, "✖ Task not found:")} #${id}\n`);
                }
            }
            else if (action === "delete") {
                const id = args[1];
                if (taskManager.delete(id)) {
                    console.log(`\n  ${c(fg.lime, "✓ Task deleted:")} #${id}\n`);
                }
                else {
                    console.log(`\n  ${c(fg.red, "✖ Task not found:")} #${id}\n`);
                }
            }
            return ask();
        }
        // ── NEW: Agent commands ───────────────────────────────────────────────────
        if (input.startsWith("/agent")) {
            const args = input.slice(7).trim().split(" ");
            const agentType = args[0];
            const task = args.slice(1).join(" ");
            if (!agentType || !task) {
                console.log(`\n  ${c(fg.red, "Usage:")} /agent <explore|plan|review|test> "task description"\n`);
                console.log(`  ${c(fg.gray, "Available agents:")}`);
                console.log(`    ${c(fg.cyan, "explore")} - Find files, search code, understand structure`);
                console.log(`    ${c(fg.cyan, "plan")}    - Design implementation plans`);
                console.log(`    ${c(fg.cyan, "review")}  - Review code for quality and security`);
                console.log(`    ${c(fg.cyan, "test")}    - Generate and run tests\n`);
                return ask();
            }
            const validAgents = ["explore", "plan", "review", "test"];
            if (!validAgents.includes(agentType)) {
                console.log(`\n  ${c(fg.red, "✖ Unknown agent:")} ${agentType}`);
                console.log(`  ${c(fg.gray, "Valid agents:")} ${validAgents.join(", ")}\n`);
                return ask();
            }
            try {
                startSpinner(`running ${agentType} agent`, "dots");
                const context = {
                    workDir: WORK_DIR,
                    history: history,
                    provider: providers.get("omniroute"),
                    model: model,
                    tools: TOOLS_DEF,
                };
                const result = await agentManager.execute(agentType, task, context);
                stopSpinner();
                if (result.success) {
                    console.log(`\n  ${c(fg.lime, "✓ Agent completed")}\n`);
                    console.log(result.output);
                    console.log();
                }
                else {
                    console.log(`\n  ${c(fg.red, "✖ Agent failed:")} ${result.error}\n`);
                }
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Error:")} ${e.message}\n`);
            }
            return ask();
        }
        // ── NEW: Worktree commands ────────────────────────────────────────────────
        if (input.startsWith("/worktree")) {
            const args = input.slice(10).trim().split(" ");
            const action = args[0];
            if (!worktreeManager.isGitRepo()) {
                console.log(`\n  ${c(fg.red, "✖ Not a git repository")}\n`);
                return ask();
            }
            if (action === "create") {
                const name = args[1];
                try {
                    const wt = worktreeManager.create(name);
                    console.log(`\n  ${c(fg.lime, "✓ Worktree created:")}`);
                    console.log(`    ${c(fg.gray, "Path:")} ${c(fg.yellow, wt.path)}`);
                    console.log(`    ${c(fg.gray, "Branch:")} ${c(fg.green, wt.branch)}`);
                    console.log(`\n  ${c(fg.gray, "Switch to it with:")} cd "${wt.path}"\n`);
                }
                catch (e) {
                    console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
                }
            }
            else if (action === "list") {
                const worktrees = worktreeManager.list();
                const W = cols();
                console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Worktrees")} ${c(fg.cyan, "─".repeat(W - 14))}`);
                if (worktrees.length === 0) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "No worktrees")}`);
                }
                else {
                    for (const wt of worktrees) {
                        console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, wt.name.padEnd(20))} ${c(fg.green, wt.branch)}`);
                        console.log(`  ${c(fg.cyan, "│")}    ${c(fg.gray, wt.path)}`);
                    }
                }
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            else if (action === "remove") {
                const name = args[1];
                const force = args.includes("--force");
                try {
                    worktreeManager.remove(name, force);
                    console.log(`\n  ${c(fg.lime, "✓ Worktree removed:")} ${name}\n`);
                }
                catch (e) {
                    console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
                    if (e.message.includes("uncommitted changes")) {
                        console.log(`  ${c(fg.gray, "Use --force to discard changes")}\n`);
                    }
                }
            }
            else {
                console.log(`\n  ${c(fg.red, "Usage:")} /worktree <create|list|remove> [name]\n`);
            }
            return ask();
        }
        // ── Git Commands ──────────────────────────────────────────────────────────
        if (input.startsWith("/commit")) {
            const message = input.slice(8).trim();
            try {
                // Check if in git repo
                (0, child_process_1.execSync)("git rev-parse --git-dir", { cwd: WORK_DIR, stdio: "ignore" });
            }
            catch {
                console.log(`\n  ${c(fg.red, "✖ Not a git repository")}\n`);
                return ask();
            }
            try {
                startSpinner("analyzing changes", "dots");
                // Get status
                const status = (0, child_process_1.execSync)("git status --porcelain", { cwd: WORK_DIR, encoding: "utf-8" });
                if (!status.trim()) {
                    stopSpinner();
                    console.log(`\n  ${c(fg.yellow, "⚠ No changes to commit")}\n`);
                    return ask();
                }
                // Get current branch
                const branch = (0, child_process_1.execSync)("git branch --show-current", { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                // Warn if on main/master
                if (["main", "master"].includes(branch)) {
                    stopSpinner();
                    console.log(`\n  ${c(fg.yellow, "⚠ You're on " + branch + " branch")}`);
                    console.log(`  ${c(fg.gray, "Consider creating a feature branch with:")} ${c(fg.cyan, "/branch <name>")}\n`);
                    return ask();
                }
                // Stage all changes if nothing staged
                const diffStaged = (0, child_process_1.execSync)("git diff --cached", { cwd: WORK_DIR, encoding: "utf-8" });
                if (!diffStaged.trim()) {
                    (0, child_process_1.execSync)("git add -A", { cwd: WORK_DIR });
                }
                // Generate commit message if not provided
                let commitMsg = message;
                if (!commitMsg) {
                    // Simple auto-generation based on file changes
                    const lines = status.split("\n").filter(l => l.trim());
                    const adds = lines.filter(l => l.startsWith("A") || l.startsWith("??")).length;
                    const mods = lines.filter(l => l.startsWith("M")).length;
                    const dels = lines.filter(l => l.startsWith("D")).length;
                    if (lines.length === 1) {
                        const file = lines[0].slice(3);
                        commitMsg = `Update ${path.basename(file)}`;
                    }
                    else {
                        const parts = [];
                        if (adds > 0)
                            parts.push(`add ${adds} file${adds > 1 ? "s" : ""}`);
                        if (mods > 0)
                            parts.push(`update ${mods} file${mods > 1 ? "s" : ""}`);
                        if (dels > 0)
                            parts.push(`delete ${dels} file${dels > 1 ? "s" : ""}`);
                        commitMsg = parts.join(", ") || "Update files";
                    }
                }
                // Add co-author
                const fullMsg = `${commitMsg}\n\nCo-Authored-By: Omni Agent <noreply@omni.dev>`;
                // Commit
                (0, child_process_1.execSync)(`git commit -m "${fullMsg.replace(/"/g, '\\"')}"`, { cwd: WORK_DIR, stdio: "pipe" });
                // Get commit hash
                const hash = (0, child_process_1.execSync)("git rev-parse --short HEAD", { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                stopSpinner();
                console.log(`\n  ${c(fg.lime, "✓ Committed:")} ${c(fg.white, commitMsg)}`);
                console.log(`  ${c(fg.gray, "Hash:")} ${c(fg.cyan, hash)}  ${c(fg.gray, "Branch:")} ${c(fg.green, branch)}\n`);
                // Send notification if chat integration is configured
                if (chatIntegration) {
                    try {
                        await chatIntegration.notifyCommit(commitMsg, hash, branch, "Omni Agent");
                    }
                    catch (e) {
                        // Silent fail for notifications
                    }
                }
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Commit failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/pr")) {
            const title = input.slice(4).trim();
            try {
                // Check if in git repo
                (0, child_process_1.execSync)("git rev-parse --git-dir", { cwd: WORK_DIR, stdio: "ignore" });
            }
            catch {
                console.log(`\n  ${c(fg.red, "✖ Not a git repository")}\n`);
                return ask();
            }
            try {
                // Check if gh CLI is available
                try {
                    (0, child_process_1.execSync)("gh --version", { stdio: "ignore" });
                }
                catch {
                    console.log(`\n  ${c(fg.red, "✖ GitHub CLI (gh) not installed")}`);
                    console.log(`  ${c(fg.gray, "Install from:")} ${c(fg.cyan, "https://cli.github.com/")}\n`);
                    return ask();
                }
                startSpinner("creating pull request", "dots");
                // Get current branch
                const branch = (0, child_process_1.execSync)("git branch --show-current", { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                if (["main", "master"].includes(branch)) {
                    stopSpinner();
                    console.log(`\n  ${c(fg.red, "✖ Cannot create PR from " + branch + " branch")}\n`);
                    return ask();
                }
                // Check if branch has upstream, push if not
                try {
                    (0, child_process_1.execSync)("git rev-parse @{u}", { cwd: WORK_DIR, stdio: "ignore" });
                }
                catch {
                    // No upstream, push
                    (0, child_process_1.execSync)(`git push -u origin ${branch}`, { cwd: WORK_DIR, stdio: "pipe" });
                }
                // Get commits for PR description
                const log = (0, child_process_1.execSync)("git log origin/main..HEAD --oneline", { cwd: WORK_DIR, encoding: "utf-8" });
                const commits = log.trim().split("\n").filter(c => c);
                // Generate PR title and body
                const prTitle = title || commits[0]?.slice(8) || "Update from omni-agent";
                const prBody = `## Summary\n${commits.map(c => `- ${c.slice(8)}`).join("\n")}\n\n## Test plan\n- [ ] Manual testing completed\n- [ ] All tests passing\n\n🤖 Generated with Omni Agent`;
                // Create PR
                const prUrl = (0, child_process_1.execSync)(`gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`, { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                stopSpinner();
                console.log(`\n  ${c(fg.lime, "✓ Pull request created")}`);
                console.log(`  ${c(fg.gray, "Title:")} ${c(fg.white, prTitle)}`);
                console.log(`  ${c(fg.gray, "URL:")} ${c(fg.cyan, prUrl)}`);
                console.log(`  ${c(fg.gray, "Commits:")} ${c(fg.yellow, commits.length.toString())}\n`);
                // Send notification if chat integration is configured
                if (chatIntegration) {
                    try {
                        await chatIntegration.notifyPR(prTitle, prUrl, branch, "Omni Agent");
                    }
                    catch (e) {
                        // Silent fail for notifications
                    }
                }
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ PR creation failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/branch")) {
            const args = input.slice(8).trim().split(/\s+/);
            const branchName = args[0];
            const action = args[1] || "create";
            try {
                // Check if in git repo
                (0, child_process_1.execSync)("git rev-parse --git-dir", { cwd: WORK_DIR, stdio: "ignore" });
            }
            catch {
                console.log(`\n  ${c(fg.red, "✖ Not a git repository")}\n`);
                return ask();
            }
            if (!branchName) {
                // List branches
                try {
                    const branches = (0, child_process_1.execSync)("git branch -vv", { cwd: WORK_DIR, encoding: "utf-8" });
                    const current = (0, child_process_1.execSync)("git branch --show-current", { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                    const W = cols();
                    console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Branches")} ${c(fg.cyan, "─".repeat(W - 14))}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Current:")} ${c(fg.green, current)}\n`);
                    branches.split("\n").forEach(line => {
                        if (line.trim()) {
                            const isCurrent = line.startsWith("*");
                            const color = isCurrent ? fg.green : fg.gray;
                            console.log(`  ${c(fg.cyan, "│")}  ${c(color, line.trim())}`);
                        }
                    });
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                }
                catch (e) {
                    console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
                }
                return ask();
            }
            try {
                switch (action) {
                    case "create":
                    case "new":
                        (0, child_process_1.execSync)(`git checkout -b ${branchName}`, { cwd: WORK_DIR, stdio: "pipe" });
                        console.log(`\n  ${c(fg.lime, "✓ Created and switched to branch:")} ${c(fg.green, branchName)}\n`);
                        break;
                    case "switch":
                    case "checkout":
                        (0, child_process_1.execSync)(`git checkout ${branchName}`, { cwd: WORK_DIR, stdio: "pipe" });
                        console.log(`\n  ${c(fg.lime, "✓ Switched to branch:")} ${c(fg.green, branchName)}\n`);
                        break;
                    case "delete":
                    case "remove":
                        const current = (0, child_process_1.execSync)("git branch --show-current", { cwd: WORK_DIR, encoding: "utf-8" }).trim();
                        if (current === branchName) {
                            console.log(`\n  ${c(fg.red, "✖ Cannot delete current branch")}`);
                            console.log(`  ${c(fg.gray, "Switch to another branch first")}\n`);
                            return ask();
                        }
                        (0, child_process_1.execSync)(`git branch -d ${branchName}`, { cwd: WORK_DIR, stdio: "pipe" });
                        console.log(`\n  ${c(fg.lime, "✓ Deleted branch:")} ${c(fg.yellow, branchName)}\n`);
                        break;
                    case "push":
                        (0, child_process_1.execSync)(`git push -u origin ${branchName}`, { cwd: WORK_DIR, stdio: "pipe" });
                        console.log(`\n  ${c(fg.lime, "✓ Pushed branch:")} ${c(fg.green, branchName)}\n`);
                        break;
                    default:
                        console.log(`\n  ${c(fg.red, "Unknown action:")} ${action}`);
                        console.log(`  ${c(fg.gray, "Use:")} create, switch, delete, push\n`);
                }
            }
            catch (e) {
                console.log(`\n  ${c(fg.red, "✖ Branch operation failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/image")) {
            const imgPath = input.slice(6).trim();
            if (!imgPath) {
                console.log(`\n  ${c(fg.red, "Usage:")} /image <path>\n`);
                return ask();
            }
            const abs = path.isAbsolute(imgPath) ? imgPath : path.join(WORK_DIR, imgPath);
            if (!fs.existsSync(abs)) {
                console.log(`\n  ${c(fg.red, "✖ Not found:")} ${c(fg.gray, abs)}\n`);
                return ask();
            }
            pendingImg = abs;
            console.log(`\n  ${c(fg.lime, "✓ Image queued:")} ${c(fg.orange, path.basename(abs))} ${c(fg.gray, "→ sends with next message")}\n`);
            return ask();
        }
        if (input === "/sessions") {
            const sessions = loadSessions();
            if (!sessions.length) {
                console.log(`\n  ${c(fg.gray, "No saved sessions yet.")}\n`);
                return ask();
            }
            const sel = await selectMenu(sessions.slice(0, 20).map(s => ({ label: s.id, value: s, detail: s.title || sessionTitle(s.messages) })), "Saved Sessions");
            if (sel) {
                history.length = 0;
                history.push(...sel.messages);
                clrScreen();
                printBanner(model, sessId, currentProvider.name);
                console.log(`\n  ${c(fg.lime, "✓ Loaded:")} ${c(fg.purple, sel.id)}  ${c(fg.gray, "(" + sel.messages.length + " msgs)")}\n`);
            }
            return ask();
        }
        if (input === "/" || input === "/model") {
            if (input === "/") {
                const cmd = await selectMenu(CMDS.map(x => ({ label: x.cmd, value: x.cmd, detail: x.desc })), "Commands");
                if (!cmd)
                    return ask();
                if (cmd === "/exit") {
                    saveAndQuit();
                    return;
                }
                if (cmd === "/clear") {
                    history.length = 0;
                    pendingImg = null;
                    clrScreen();
                    printBanner(model, sessId, currentProvider.name);
                    return ask();
                }
                if (cmd !== "/model")
                    return ask();
            }
            const m = await selectMenu(MODELS.map(x => ({
                label: x.id,
                value: x.id,
                detail: (0, models_1.formatModelForDisplay)(x)
            })), "Select Model");
            if (m) {
                model = m;
                session.model = m;
                console.log(`\n  ${c(fg.gray, "model →")} ${c(fg.green, model)}\n`);
            }
            return ask();
        }
        if (input.startsWith("/model ")) {
            model = input.slice(7).trim();
            session.model = model;
            console.log(`\n  ${c(fg.gray, "model →")} ${c(fg.green, model)}\n`);
            return ask();
        }
        if (input.startsWith("/dir ")) {
            try {
                process.chdir(input.slice(5).trim());
                WORK_DIR = process.cwd();
                console.log(`\n  ${c(fg.gray, "dir →")} ${c(fg.yellow, WORK_DIR)}\n`);
            }
            catch (e) {
                console.log(`\n  ${c(fg.red, "✖ " + e.message)}\n`);
            }
            return ask();
        }
        if (input === "/history") {
            const hist = cmdHistory.getAll();
            if (!hist.length) {
                console.log(`\n  ${c(fg.gray, "No command history yet.")}\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Command History")} ${c(fg.cyan, "─".repeat(W - 20))}`);
            hist.slice(-20).forEach((cmd, i) => {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, String(i + 1).padStart(3))}  ${c(fg.sky, cmd.slice(0, W - 12))}`);
            });
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input.startsWith("/export")) {
            const exportPath = input.slice(7).trim() || `omni-chat-${sessId}.md`;
            try {
                const lines = [];
                lines.push(`# Omni Chat Export`);
                lines.push(`Session: ${sessId}`);
                lines.push(`Model: ${model}`);
                lines.push(`Date: ${new Date().toISOString()}\n`);
                for (const msg of history) {
                    if (msg.role === "user") {
                        const content = typeof msg.content === "string" ? msg.content : msg.content.find((c) => c.type === "text")?.text || "";
                        lines.push(`## User\n\n${content}\n`);
                    }
                    else if (msg.role === "assistant") {
                        lines.push(`## Assistant\n\n${msg.content}\n`);
                    }
                }
                const fullPath = path.isAbsolute(exportPath) ? exportPath : path.join(WORK_DIR, exportPath);
                fs.writeFileSync(fullPath, lines.join("\n"), "utf-8");
                console.log(`\n  ${c(fg.lime, "✓ Exported:")} ${c(fg.yellow, exportPath)}\n`);
            }
            catch (e) {
                console.log(`\n  ${c(fg.red, "✖ Export failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input === "/stats") {
            const W = cols();
            const tokens = (0, tokens_1.estimateMessagesTokens)(history);
            const turns = history.filter(m => m.role === "user").length;
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Session Statistics")} ${c(fg.cyan, "─".repeat(W - 23))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Session ID:")}     ${c(fg.purple, sessId)}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Model:")}          ${c(fg.green, model)}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Messages:")}       ${c(fg.sky, String(history.length))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Turns:")}          ${c(fg.sky, String(turns))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Est. Tokens:")}    ${c(fg.orange, (0, tokens_1.formatTokens)(tokens))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Working Dir:")}    ${c(fg.yellow, WORK_DIR.replace(os.homedir(), "~"))}`);
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input === "/config") {
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Configuration")} ${c(fg.cyan, "─".repeat(W - 18))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Config file:")}    ${c(fg.yellow, path.join(os.homedir(), ".omni", "config.json"))}`);
            console.log(`  ${c(fg.cyan, "│")}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "defaultModel:")}       ${c(fg.green, CONFIG.defaultModel)}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "syntaxHighlight:")}    ${c(CONFIG.syntaxHighlight ? fg.lime : fg.red, String(CONFIG.syntaxHighlight))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "streamingEnabled:")}   ${c(CONFIG.streamingEnabled ? fg.lime : fg.red, String(CONFIG.streamingEnabled))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "autoModelSelection:")} ${c(CONFIG.autoModelSelection ? fg.lime : fg.red, String(CONFIG.autoModelSelection))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "typewriterEffect:")}   ${c(CONFIG.typewriterEffect ? fg.lime : fg.red, String(CONFIG.typewriterEffect))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "typewriterSpeed:")}    ${c(fg.sky, String(CONFIG.typewriterSpeed))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "autoSave:")}           ${c(CONFIG.autoSave ? fg.lime : fg.red, String(CONFIG.autoSave))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "maxHistory:")}         ${c(fg.sky, String(CONFIG.maxHistory))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "theme:")}              ${c(fg.purple, CONFIG.theme)}`);
            console.log(`  ${c(fg.cyan, "│")}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Edit the config file to change settings")}`);
            console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            return ask();
        }
        if (input === "/stream") {
            CONFIG.streamingEnabled = !CONFIG.streamingEnabled;
            (0, config_1.saveConfig)(CONFIG);
            const status = CONFIG.streamingEnabled ? c(fg.lime, "enabled") : c(fg.red, "disabled");
            console.log(`\n  ${c(fg.cyan, "✓")} Streaming responses ${status}\n`);
            return ask();
        }
        if (input === "/auto") {
            CONFIG.autoModelSelection = !CONFIG.autoModelSelection;
            (0, config_1.saveConfig)(CONFIG);
            const status = CONFIG.autoModelSelection ? c(fg.lime, "enabled") : c(fg.red, "disabled");
            console.log(`\n  ${c(fg.cyan, "✓")} Auto model selection ${status}`);
            if (CONFIG.autoModelSelection) {
                console.log(`  ${c(fg.gray, "Models will be automatically selected based on task complexity")}\n`);
            }
            return ask();
        }
        if (input.startsWith("/review")) {
            const args = input.slice(7).trim();
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Code Review")} ${c(fg.cyan, "─".repeat(W - 15))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Analyzing code...")}`);
            try {
                let result;
                if (args) {
                    // Review specific files
                    const files = args.split(/\s+/);
                    result = await codeReviewer.reviewFiles(files);
                }
                else {
                    // Review staged files
                    result = await codeReviewer.reviewStaged();
                }
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Files reviewed:")} ${c(fg.sky, String(result.filesReviewed))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Lines reviewed:")} ${c(fg.sky, String(result.linesReviewed))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Issues found:")} ${c(fg.sky, String(result.issues.length))}`);
                // Show quality score
                const scoreColor = result.score >= 80 ? fg.lime : result.score >= 60 ? fg.yellow : fg.red;
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Quality Score:")} ${c(scoreColor, `${result.score}/100`)}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                // Show AI insights if available
                if (result.aiInsights && result.aiInsights.length > 0) {
                    console.log(`  ${c(fg.purple, "🤖 AI Insights:")}`);
                    for (const insight of result.aiInsights) {
                        console.log(`    ${c(fg.gray, "•")} ${insight}`);
                    }
                    console.log();
                }
                if (result.issues.length > 0) {
                    // Show summary
                    const { summary } = result;
                    if (summary.critical > 0)
                        console.log(`  🔴 Critical: ${c(fg.red, String(summary.critical))}`);
                    if (summary.high > 0)
                        console.log(`  🟠 High: ${c(fg.orange, String(summary.high))}`);
                    if (summary.medium > 0)
                        console.log(`  🟡 Medium: ${c(fg.yellow, String(summary.medium))}`);
                    if (summary.low > 0)
                        console.log(`  🟢 Low: ${c(fg.green, String(summary.low))}`);
                    if (summary.info > 0)
                        console.log(`  ℹ️  Info: ${c(fg.gray, String(summary.info))}`);
                    // Show top 5 issues
                    console.log(`\n  ${c(fg.white, "Top Issues:")}`);
                    const topIssues = result.issues.slice(0, 5);
                    for (const issue of topIssues) {
                        const severityColor = {
                            critical: fg.red,
                            high: fg.orange,
                            medium: fg.yellow,
                            low: fg.green,
                            info: fg.gray,
                        }[issue.severity];
                        console.log(`\n  ${c(severityColor, "●")} ${c(fg.white, issue.file)}${issue.line ? c(fg.gray, `:${issue.line}`) : ""}`);
                        console.log(`    ${c(fg.gray, `[${issue.category}]`)} ${issue.message}`);
                        if (issue.cwe || issue.owasp) {
                            const tags = [];
                            if (issue.cwe)
                                tags.push(c(fg.purple, issue.cwe));
                            if (issue.owasp)
                                tags.push(c(fg.orange, issue.owasp));
                            console.log(`    ${tags.join(" ")}`);
                        }
                        if (issue.suggestion) {
                            console.log(`    ${c(fg.cyan, "→")} ${issue.suggestion}`);
                        }
                    }
                    if (result.issues.length > 5) {
                        console.log(`\n  ${c(fg.gray, `... and ${result.issues.length - 5} more issues`)}`);
                    }
                    // Offer to save full report
                    console.log(`\n  ${c(fg.gray, "Run")} ${c(fg.cyan, "/export review.md")} ${c(fg.gray, "to save full report")}`);
                }
                else {
                    console.log(`  ${c(fg.lime, "✓ No issues found! Code looks good.")}`);
                }
                console.log();
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/test")) {
            const args = input.slice(5).trim();
            if (!args) {
                console.log(`\n  ${c(fg.red, "Usage:")} /test <file>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /test src/utils.ts\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Test Generation")} ${c(fg.cyan, "─".repeat(W - 18))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Generating tests for")} ${c(fg.sky, args)}`);
            try {
                const result = await testGenerator.generateForFile(args, {
                    coverage: "comprehensive",
                    includeEdgeCases: true,
                    includeMocks: true,
                    style: "bdd",
                    includeIntegration: false,
                    includePerformance: false,
                    coverageThreshold: 80,
                });
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Framework:")} ${c(fg.purple, result.framework)}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Tests generated:")} ${c(fg.lime, String(result.testCount))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Coverage:")} ${c(fg.sky, result.coverage.join(", "))}`);
                // Show quality metrics
                const quality = result.quality;
                const scoreColor = quality.score >= 80 ? fg.lime : quality.score >= 60 ? fg.yellow : fg.red;
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Quality Score:")} ${c(scoreColor, `${quality.score}/100`)}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Coverage Estimate:")} ${c(fg.sky, `${quality.coverageEstimate}%`)}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Edge Cases:")} ${c(fg.purple, String(quality.edgeCasesCovered))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Mocking:")} ${c(fg.teal, quality.mockingQuality)}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                // Show quality feedback
                if (quality.strengths.length > 0) {
                    console.log(`  ${c(fg.lime, "✓ Strengths:")}`);
                    for (const strength of quality.strengths.slice(0, 3)) {
                        console.log(`    ${c(fg.gray, "•")} ${strength}`);
                    }
                    console.log();
                }
                if (quality.weaknesses.length > 0) {
                    console.log(`  ${c(fg.yellow, "⚠ Weaknesses:")}`);
                    for (const weakness of quality.weaknesses.slice(0, 3)) {
                        console.log(`    ${c(fg.gray, "•")} ${weakness}`);
                    }
                    console.log();
                }
                if (quality.suggestions.length > 0) {
                    console.log(`  ${c(fg.cyan, "💡 Suggestions:")}`);
                    for (const suggestion of quality.suggestions.slice(0, 3)) {
                        console.log(`    ${c(fg.gray, "•")} ${suggestion}`);
                    }
                    console.log();
                }
                // Show preview of generated tests
                const preview = result.content.split("\n").slice(0, 15).join("\n");
                console.log(`  ${c(fg.gray, "Preview:")}\n`);
                console.log((0, syntax_1.highlightCode)(preview, result.framework === "pytest" ? "python" : "typescript", {
                    keyword: fg.purple,
                    string: fg.green,
                    comment: fg.gray,
                    number: fg.orange,
                    operator: fg.cyan,
                    function: fg.sky,
                    type: fg.yellow,
                    reset: R,
                }));
                if (result.content.split("\n").length > 15) {
                    console.log(`  ${c(fg.gray, "...")}\n`);
                }
                // Ask if user wants to save
                console.log(`  ${c(fg.gray, "Save to")} ${c(fg.cyan, result.fileName)}${c(fg.gray, "? (y/n)")}`);
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });
                rl.question("  ", async (answer) => {
                    rl.close();
                    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
                        const savedPath = await testGenerator.writeTestFile(result);
                        console.log(`\n  ${c(fg.lime, "✓")} Tests saved to ${c(fg.cyan, savedPath)}\n`);
                    }
                    else {
                        console.log(`\n  ${c(fg.gray, "Tests not saved")}\n`);
                    }
                    ask();
                });
                return;
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                return ask();
            }
        }
        // ── Refactoring Commands ────────────────────────────────────────────────
        if (input.startsWith("/smells")) {
            const args = input.slice(7).trim();
            if (!args) {
                console.log(`\n  ${c(fg.red, "Usage:")} /smells <file>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /smells src/utils.ts\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Code Smell Detection")} ${c(fg.cyan, "─".repeat(W - 23))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Analyzing")} ${c(fg.sky, args)}`);
            try {
                const smells = await refactoringAssistant.detectCodeSmells(args);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Code smells found:")} ${c(fg.sky, String(smells.length))}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                if (smells.length > 0) {
                    // Group by severity
                    const high = smells.filter(s => s.severity === "high");
                    const medium = smells.filter(s => s.severity === "medium");
                    const low = smells.filter(s => s.severity === "low");
                    if (high.length > 0)
                        console.log(`  🔴 High: ${c(fg.red, String(high.length))}`);
                    if (medium.length > 0)
                        console.log(`  🟡 Medium: ${c(fg.yellow, String(medium.length))}`);
                    if (low.length > 0)
                        console.log(`  🟢 Low: ${c(fg.green, String(low.length))}`);
                    // Show details
                    console.log(`\n  ${c(fg.white, "Code Smells:")}`);
                    for (const smell of smells.slice(0, 10)) {
                        const severityColor = {
                            high: fg.red,
                            medium: fg.yellow,
                            low: fg.green,
                        }[smell.severity];
                        console.log(`\n  ${c(severityColor, "●")} ${c(fg.white, smell.type)} ${c(fg.gray, `(line ${smell.line})`)}`);
                        console.log(`    ${c(fg.gray, smell.description)}`);
                        console.log(`    ${c(fg.cyan, "→")} ${smell.suggestion}`);
                    }
                    if (smells.length > 10) {
                        console.log(`\n  ${c(fg.gray, `... and ${smells.length - 10} more smells`)}`);
                    }
                    // Suggest refactorings
                    console.log(`\n  ${c(fg.gray, "Run")} ${c(fg.cyan, "/refactor " + args)} ${c(fg.gray, "to get refactoring suggestions")}`);
                }
                else {
                    console.log(`  ${c(fg.lime, "✓ No code smells detected! Code looks clean.")}`);
                }
                console.log();
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/refactor")) {
            const args = input.slice(9).trim();
            if (!args) {
                console.log(`\n  ${c(fg.red, "Usage:")} /refactor <file>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /refactor src/utils.ts\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Refactoring Suggestions")} ${c(fg.cyan, "─".repeat(W - 26))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Analyzing")} ${c(fg.sky, args)}`);
            try {
                const suggestions = await refactoringAssistant.suggestRefactorings(args);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Suggestions found:")} ${c(fg.sky, String(suggestions.length))}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                if (suggestions.length > 0) {
                    console.log(`  ${c(fg.white, "Refactoring Opportunities:")}\n`);
                    for (let i = 0; i < Math.min(suggestions.length, 10); i++) {
                        const s = suggestions[i];
                        const effortColor = { low: fg.green, medium: fg.yellow, high: fg.red }[s.effort];
                        const safetyIcon = s.safety === "safe" ? "✓" : "⚠";
                        console.log(`  ${c(fg.cyan, `${i + 1}.`)} ${c(fg.white, s.type)} ${c(fg.gray, `(${s.target})`)}`);
                        console.log(`     ${c(fg.gray, "Reason:")} ${s.reason}`);
                        console.log(`     ${c(fg.gray, "Benefit:")} ${s.benefit}`);
                        console.log(`     ${c(fg.gray, "Effort:")} ${c(effortColor, s.effort)} ${c(fg.gray, "Safety:")} ${safetyIcon} ${s.safety}`);
                        console.log();
                    }
                    if (suggestions.length > 10) {
                        console.log(`  ${c(fg.gray, `... and ${suggestions.length - 10} more suggestions`)}\n`);
                    }
                    console.log(`  ${c(fg.gray, "Use specific commands to apply refactorings:")}`);
                    console.log(`  ${c(fg.cyan, "/extract")} ${c(fg.gray, "- Extract function")}`);
                    console.log(`  ${c(fg.cyan, "/rename")} ${c(fg.gray, "- Rename symbol")}`);
                    console.log(`  ${c(fg.cyan, "/simplify")} ${c(fg.gray, "- Simplify code")}`);
                    console.log(`  ${c(fg.cyan, "/optimize")} ${c(fg.gray, "- Optimize performance")}`);
                }
                else {
                    console.log(`  ${c(fg.lime, "✓ No refactoring opportunities found!")}`);
                }
                console.log();
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/extract")) {
            const args = input.slice(8).trim().split(/\s+/);
            if (args.length < 4) {
                console.log(`\n  ${c(fg.red, "Usage:")} /extract <file> <start-line> <end-line> <function-name>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /extract src/utils.ts 10 25 calculateTotal\n`);
                return ask();
            }
            const [file, startStr, endStr, functionName] = args;
            const startLine = parseInt(startStr);
            const endLine = parseInt(endStr);
            if (isNaN(startLine) || isNaN(endLine)) {
                console.log(`\n  ${c(fg.red, "Error:")} Line numbers must be integers\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Extract Function")} ${c(fg.cyan, "─".repeat(W - 19))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Extracting lines")} ${c(fg.sky, `${startLine}-${endLine}`)} ${c(fg.gray, "from")} ${c(fg.sky, file)}`);
            try {
                const result = await refactoringAssistant.extractFunction(file, startLine, endLine, functionName, true);
                if (result.success) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.lime, "✓ Extraction successful")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                    // Show preview
                    console.log(`  ${c(fg.white, "Preview:")}\n`);
                    console.log(result.preview);
                    if (result.warnings && result.warnings.length > 0) {
                        console.log(`\n  ${c(fg.yellow, "⚠ Warnings:")}`);
                        for (const warning of result.warnings) {
                            console.log(`    ${c(fg.gray, warning)}`);
                        }
                    }
                    // Ask to apply
                    console.log(`\n  ${c(fg.gray, "Apply this refactoring? (y/n)")}`);
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question("  ", async (answer) => {
                        rl.close();
                        if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
                            const applied = await refactoringAssistant.extractFunction(file, startLine, endLine, functionName, false);
                            if (applied.success) {
                                console.log(`\n  ${c(fg.lime, "✓")} Refactoring applied to ${c(fg.cyan, file)}\n`);
                            }
                            else {
                                console.log(`\n  ${c(fg.red, "✗")} Failed to apply: ${applied.error}\n`);
                            }
                        }
                        else {
                            console.log(`\n  ${c(fg.gray, "Refactoring cancelled")}\n`);
                        }
                        ask();
                    });
                    return;
                }
                else {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "✗ Extraction failed")}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, result.error || "Unknown error")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                }
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/rename")) {
            const args = input.slice(7).trim().split(/\s+/);
            if (args.length < 2) {
                console.log(`\n  ${c(fg.red, "Usage:")} /rename <old-name> <new-name> [scope]\n`);
                console.log(`  ${c(fg.gray, "Example:")} /rename oldFunc newFunc file\n`);
                console.log(`  ${c(fg.gray, "Scope:")} file (default) or project\n`);
                return ask();
            }
            const [oldName, newName, scope = "file"] = args;
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Rename Symbol")} ${c(fg.cyan, "─".repeat(W - 16))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Renaming")} ${c(fg.sky, oldName)} ${c(fg.gray, "→")} ${c(fg.lime, newName)}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Scope:")} ${c(fg.purple, scope)}`);
            try {
                const result = await refactoringAssistant.renameSymbol(oldName, newName, scope);
                if (result.success) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.lime, "✓ Rename successful")}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Files changed:")} ${c(fg.sky, String(result.changes.length))}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                    // Show changed files
                    console.log(`  ${c(fg.white, "Changed Files:")}\n`);
                    for (const change of result.changes) {
                        console.log(`  ${c(fg.cyan, "●")} ${change.file}`);
                    }
                    console.log();
                }
                else {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "✗ Rename failed")}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, result.error || "Unknown error")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                }
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/simplify")) {
            const args = input.slice(9).trim();
            if (!args) {
                console.log(`\n  ${c(fg.red, "Usage:")} /simplify <file>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /simplify src/utils.ts\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Simplify Code")} ${c(fg.cyan, "─".repeat(W - 16))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Simplifying")} ${c(fg.sky, args)}`);
            try {
                const result = await refactoringAssistant.simplifyCode(args);
                if (result.success) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.lime, "✓ Simplification successful")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                    // Show diff
                    console.log(`  ${c(fg.white, "Changes:")}\n`);
                    const diffLines = result.changes[0].diff.split("\n").slice(0, 30);
                    for (const line of diffLines) {
                        if (line.startsWith("+")) {
                            console.log(`  ${c(fg.green, line)}`);
                        }
                        else if (line.startsWith("-")) {
                            console.log(`  ${c(fg.red, line)}`);
                        }
                        else {
                            console.log(`  ${c(fg.gray, line)}`);
                        }
                    }
                    if (result.changes[0].diff.split("\n").length > 30) {
                        console.log(`  ${c(fg.gray, "...")}`);
                    }
                    console.log(`\n  ${c(fg.lime, "✓")} Changes applied to ${c(fg.cyan, args)}\n`);
                }
                else {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "✗ Simplification failed")}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, result.error || "Unknown error")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                }
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/optimize")) {
            const args = input.slice(9).trim();
            if (!args) {
                console.log(`\n  ${c(fg.red, "Usage:")} /optimize <file>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /optimize src/utils.ts\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Optimize Code")} ${c(fg.cyan, "─".repeat(W - 16))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Optimizing")} ${c(fg.sky, args)}`);
            try {
                const result = await refactoringAssistant.optimizeCode(args);
                if (result.success) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.lime, "✓ Optimization successful")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                    // Show optimizations
                    if (result.warnings && result.warnings.length > 0) {
                        console.log(`  ${c(fg.white, "Optimizations Applied:")}\n`);
                        for (const opt of result.warnings) {
                            console.log(`  ${c(fg.cyan, "●")} ${opt}`);
                        }
                        console.log();
                    }
                    // Show diff preview
                    console.log(`  ${c(fg.white, "Changes Preview:")}\n`);
                    const diffLines = result.changes[0].diff.split("\n").slice(0, 20);
                    for (const line of diffLines) {
                        if (line.startsWith("+")) {
                            console.log(`  ${c(fg.green, line)}`);
                        }
                        else if (line.startsWith("-")) {
                            console.log(`  ${c(fg.red, line)}`);
                        }
                        else {
                            console.log(`  ${c(fg.gray, line)}`);
                        }
                    }
                    console.log(`\n  ${c(fg.lime, "✓")} Optimizations applied to ${c(fg.cyan, args)}\n`);
                }
                else {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "✗ Optimization failed")}`);
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, result.error || "Unknown error")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                }
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/index")) {
            const args = input.slice(6).trim();
            const rebuild = args === "rebuild";
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Codebase Indexing")} ${c(fg.cyan, "─".repeat(W - 21))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, rebuild ? "Rebuilding index..." : "Building index...")}`);
            try {
                const stats = await codebaseIndexer.indexCodebase(".");
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Files indexed:")} ${c(fg.lime, String(stats.totalFiles))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Code chunks:")} ${c(fg.sky, String(stats.totalChunks))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Index size:")} ${c(fg.purple, (stats.indexSize / 1024).toFixed(2) + " KB")}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                console.log(`  ${c(fg.lime, "✓")} Index built successfully`);
                console.log(`  ${c(fg.gray, "Use")} ${c(fg.cyan, "/search <query>")} ${c(fg.gray, "to search the codebase")}\n`);
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        if (input.startsWith("/search")) {
            const query = input.slice(7).trim();
            if (!query) {
                console.log(`\n  ${c(fg.red, "Usage:")} /search <query>\n`);
                console.log(`  ${c(fg.gray, "Example:")} /search authentication function\n`);
                return ask();
            }
            const W = cols();
            console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Code Search")} ${c(fg.cyan, "─".repeat(W - 15))}`);
            console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Searching for:")} ${c(fg.sky, query)}`);
            try {
                const results = codebaseIndexer.search(query, 10);
                if (results.length === 0) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.yellow, "No results found")}`);
                    console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                    return ask();
                }
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Found:")} ${c(fg.lime, String(results.length))} ${c(fg.gray, "results")}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
                // Show top results
                for (let i = 0; i < Math.min(5, results.length); i++) {
                    const result = results[i];
                    const score = (result.score * 100).toFixed(1);
                    console.log(`  ${c(fg.purple, `${i + 1}.`)} ${c(fg.white, result.chunk.name)} ${c(fg.gray, `(${score}% match)`)}`);
                    console.log(`     ${c(fg.gray, result.chunk.file)}:${c(fg.sky, String(result.chunk.startLine))}`);
                    console.log(`     ${c(fg.gray, result.chunk.type)}\n`);
                }
                if (results.length > 5) {
                    console.log(`  ${c(fg.gray, `... and ${results.length - 5} more results`)}\n`);
                }
                console.log(`  ${c(fg.gray, "Tip: Use")} ${c(fg.cyan, "read <file>")} ${c(fg.gray, "to view the full code")}\n`);
            }
            catch (e) {
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.red, "Error:")} ${e.message}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            return ask();
        }
        // ── Phase 3: Collaboration Commands ──────────────────────────────────────
        if (input.startsWith("/pr-review")) {
            const args = input.slice(11).trim();
            const prNumber = args ? parseInt(args) : undefined;
            try {
                startSpinner("posting automated review", "dots");
                // Get PR info
                const prInfo = await githubPR.getPRInfo(prNumber);
                if (!prInfo) {
                    stopSpinner();
                    console.log(`\n  ${c(fg.red, "✖ No PR found")}\n`);
                    return ask();
                }
                // Run code review
                const reviewResult = await codeReviewer.reviewStaged();
                // Post review to PR
                await githubPR.postAutomatedReview(prInfo.number, reviewResult);
                stopSpinner();
                console.log(`\n  ${c(fg.lime, "✓ Automated review posted to PR #" + prInfo.number)}`);
                console.log(`  ${c(fg.gray, "URL:")} ${c(fg.cyan, prInfo.url)}`);
                console.log(`  ${c(fg.gray, "Issues:")} ${c(fg.yellow, reviewResult.issues.length.toString())}\n`);
                // Notify via chat if configured
                if (chatIntegration) {
                    await chatIntegration.notifyReview(prInfo.title, prInfo.url, reviewResult.summary);
                }
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/pr-comments")) {
            const args = input.slice(13).trim();
            const prNumber = args ? parseInt(args) : undefined;
            try {
                startSpinner("fetching PR comments", "dots");
                const comments = await githubPR.getPRComments(prNumber);
                stopSpinner();
                const W = cols();
                console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "PR Comments")} ${c(fg.cyan, "─".repeat(W - 16))}`);
                if (comments.length === 0) {
                    console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "No comments")}`);
                }
                else {
                    for (const comment of comments) {
                        console.log(`  ${c(fg.cyan, "│")}`);
                        console.log(`  ${c(fg.cyan, "│")}  ${c(fg.sky, comment.user)} ${c(fg.gray, "on")} ${c(fg.yellow, comment.path)}:${c(fg.white, String(comment.line))}`);
                        console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, comment.body)}`);
                        console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "ID:")} ${c(fg.purple, String(comment.id))}`);
                    }
                }
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/pr-reply")) {
            const args = input.slice(10).trim().split(/\s+/);
            const commentId = parseInt(args[0]);
            const replyText = args.slice(1).join(" ");
            if (!commentId || !replyText) {
                console.log(`\n  ${c(fg.red, "Usage:")} /pr-reply <comment-id> <reply-text>\n`);
                return ask();
            }
            try {
                startSpinner("posting reply", "dots");
                const prInfo = await githubPR.getPRInfo();
                if (!prInfo) {
                    stopSpinner();
                    console.log(`\n  ${c(fg.red, "✖ No PR found")}\n`);
                    return ask();
                }
                await githubPR.replyToComment(prInfo.number, commentId, replyText);
                stopSpinner();
                console.log(`\n  ${c(fg.lime, "✓ Reply posted to comment #" + commentId)}\n`);
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/notify")) {
            const message = input.slice(8).trim();
            if (!message) {
                console.log(`\n  ${c(fg.red, "Usage:")} /notify <message>\n`);
                return ask();
            }
            if (!chatIntegration) {
                console.log(`\n  ${c(fg.yellow, "⚠ Chat integration not configured")}`);
                console.log(`  ${c(fg.gray, "Create ~/.omni/chat-config.json with Slack/Discord webhooks")}\n`);
                return ask();
            }
            try {
                await chatIntegration.broadcastText(message);
                console.log(`\n  ${c(fg.lime, "✓ Notification sent")}\n`);
            }
            catch (e) {
                console.log(`\n  ${c(fg.red, "✖ Failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/team-sync")) {
            if (!teamMemorySync) {
                console.log(`\n  ${c(fg.yellow, "⚠ Team memory sync not configured")}`);
                console.log(`  ${c(fg.gray, "Create ~/.omni/team-memory-config.json")}\n`);
                return ask();
            }
            try {
                startSpinner("syncing team memories", "dots");
                const status = await teamMemorySync.sync();
                stopSpinner();
                const W = cols();
                console.log(`\n  ${c(fg.cyan, "╭─")} ${c(fg.white, "Team Memory Sync")} ${c(fg.cyan, "─".repeat(W - 21))}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Synced:")} ${c(fg.green, status.synced.toString())} memories`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Conflicts:")} ${c(fg.yellow, status.conflicts.toString())}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Failed:")} ${c(fg.red, status.failed.toString())}`);
                console.log(`  ${c(fg.cyan, "│")}  ${c(fg.gray, "Last sync:")} ${c(fg.purple, status.lastSync)}`);
                console.log(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
            }
            catch (e) {
                stopSpinner();
                console.log(`\n  ${c(fg.red, "✖ Sync failed:")} ${e.message}\n`);
            }
            return ask();
        }
        if (input.startsWith("/")) {
            console.log(`\n  ${c(fg.red, "Unknown command")}  type ${c(fg.cyan, "/")} to see options\n`);
            return ask();
        }
        // ── agent ─────────────────────────────────────────────────────────────────
        const imgForMsg = pendingImg;
        pendingImg = null;
        const displayInput = imgForMsg
            ? `${c(fg.orange, "[🖼 " + path.basename(imgForMsg) + "]")} ${input}`
            : input;
        // Check if planning is needed
        const analysis = planner.analyzeTask(input, { workDir: WORK_DIR, history });
        if (analysis.requiresPlanning && analysis.complexity !== "simple") {
            console.log(`\n  ${c(fg.purple, "◆ Planning mode")} ${c(fg.gray, "(task complexity: " + analysis.complexity + ")")}`);
            const plan = planner.createPlan(input, analysis);
            // Add exploration steps
            planner.addStep({
                description: "Analyze task requirements",
                type: "analyze",
            });
            if (analysis.suggestedSkills.length > 0) {
                planner.addStep({
                    description: `Consider using skills: ${analysis.suggestedSkills.join(", ")}`,
                    type: "analyze",
                });
            }
            console.log(planner.formatPlan(plan, fg));
            console.log(`  ${c(fg.gray, "Auto-approving plan (full autonomy mode)...")}\n`);
            planner.approvePlan();
            planner.startExecution();
        }
        const W = cols();
        console.log(`\n  ${B}${c(fg.blue, "◆ you")}${R}\n  ${displayInput}`);
        // Auto model selection
        let selectedModel = model;
        if (CONFIG.autoModelSelection) {
            const recommendation = modelOrchestrator.recommend(input, history, MODELS.map(m => m.id));
            selectedModel = recommendation.model;
            // Show model selection reasoning
            if (selectedModel !== model) {
                console.log(`  ${c(fg.gray, "│")} ${c(fg.purple, "🤖 Auto-selected:")} ${c(fg.cyan, selectedModel)}`);
                console.log(`  ${c(fg.gray, "│")} ${c(fg.gray, recommendation.reason)}`);
            }
        }
        // Show typing indicator
        const typingIndicator = new animations_1.TypingIndicator("thinking");
        typingIndicator.start();
        try {
            const reply = await runAgent(input, history, selectedModel, imgForMsg, (n, a, r) => {
                typingIndicator.stop();
                showTool(n, a, r);
                typingIndicator.start();
            }, currentProvider, () => {
                // Called when streaming starts - show header
                typingIndicator.stop();
                const tokStr = (0, tokens_1.formatTokens)((0, tokens_1.estimateMessagesTokens)(history));
                const divLeft = `  ${c(fg.gray, "─".repeat(Math.floor((W - 4) / 2 - 10)))}`;
                const divRight = c(fg.gray, "─".repeat(W - 4 - Math.floor((W - 4) / 2 - 10) - 20));
                const ctxBadge = `${c(fg.gray, "[")}${c(fg.purple, history.length / 2 + " turns")} ${c(fg.gray, "·")} ${c(fg.sky, "~" + tokStr + " tok")}${c(fg.gray, "]")}`;
                console.log(`\n${divLeft} ${ctxBadge} ${divRight}`);
                console.log(`  ${B}${c(fg.green, "◆ omni")}${R}  ${c(fg.gray, model)}\n`);
            });
            typingIndicator.stop();
            history.push(imgForMsg
                ? { role: "user", content: [encodeImage(imgForMsg), { type: "text", text: input }].filter(Boolean) }
                : { role: "user", content: input });
            history.push({ role: "assistant", content: reply });
            session.messages = [...history];
            session.title = sessionTitle(session.messages);
            saveSession(session);
            // Response with context counter in the divider (only if not streaming)
            if (!CONFIG.streamingEnabled) {
                const tokStr = (0, tokens_1.formatTokens)((0, tokens_1.estimateMessagesTokens)(history));
                const divLeft = `  ${c(fg.gray, "─".repeat(Math.floor((W - 4) / 2 - 10)))}`;
                const divRight = c(fg.gray, "─".repeat(W - 4 - Math.floor((W - 4) / 2 - 10) - 20));
                const ctxBadge = `${c(fg.gray, "[")}${c(fg.purple, history.length / 2 + " turns")} ${c(fg.gray, "·")} ${c(fg.sky, "~" + tokStr + " tok")}${c(fg.gray, "]")}`;
                console.log(`\n${divLeft} ${ctxBadge} ${divRight}`);
                console.log(`  ${B}${c(fg.green, "◆ omni")}${R}  ${c(fg.gray, model)}`);
                // Render with typewriter animation
                await renderMdAnimated(reply, CONFIG.typewriterEffect);
            }
            console.log();
        }
        catch (e) {
            typingIndicator.stop();
            console.log(`\n  ${c(fg.red, "✖ " + e.message)}\n`);
        }
        ask();
    };
    ask();
}
main().catch(e => { process.stdout.write("\x1b[?25h"); console.error(e.message); process.exit(1); });
