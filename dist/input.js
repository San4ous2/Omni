"use strict";
// Enhanced input system with IDE-like autocomplete and bug fixes
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedInput = void 0;
class EnhancedInput {
    constructor(options) {
        this.options = options;
        this.lines = [""];
        this.curLine = 0;
        this.cursorPos = 0; // Cursor position within current line
        this.suggestions = [];
        this.selectedSuggestion = 0;
        this.showSuggestions = false;
        this.ghostText = "";
        this.historyMode = false;
    }
    async read() {
        return new Promise((resolve) => {
            const stdin = process.stdin;
            const wasRaw = stdin.isRaw;
            // Setup raw mode
            if (stdin.setRawMode)
                stdin.setRawMode(true);
            stdin.resume();
            stdin.setEncoding("utf8");
            // Reserve space for the UI (prevents scrolling)
            const maxHeight = 15; // Max lines for suggestions + input
            process.stdout.write("\n".repeat(maxHeight));
            process.stdout.write(`\x1b[${maxHeight}A`); // Move back up
            this.render();
            const cleanup = () => {
                stdin.removeListener("data", onKey);
                if (stdin.setRawMode)
                    stdin.setRawMode(wasRaw || false);
                // Clear properly
                process.stdout.write("\x1b[0J"); // Clear from cursor to end
            };
            const onKey = (key) => {
                // Ctrl+C
                if (key === "\x03") {
                    cleanup();
                    process.stdout.write("\n");
                    this.options.onCtrlC();
                    return;
                }
                // Enter → submit or accept suggestion
                if (key === "\r" || key === "\n") {
                    if (this.showSuggestions && this.suggestions.length > 0) {
                        // Accept selected suggestion
                        const suggestion = this.suggestions[this.selectedSuggestion];
                        this.lines[this.curLine] = suggestion.text;
                        this.cursorPos = suggestion.text.length;
                        this.showSuggestions = false;
                        this.updateSuggestions();
                        this.render();
                        return;
                    }
                    const text = this.currentText().trim();
                    if (!text) {
                        this.render();
                        return;
                    }
                    cleanup();
                    process.stdout.write("\n");
                    // Add to history if not a command
                    if (!text.startsWith("/")) {
                        this.options.cmdHistory.add(text);
                    }
                    resolve(text);
                    return;
                }
                // Tab → accept ghost text or cycle suggestions
                if (key === "\t") {
                    if (this.ghostText) {
                        // Accept ghost text
                        this.lines[this.curLine] += this.ghostText;
                        this.cursorPos += this.ghostText.length;
                        this.ghostText = "";
                        this.updateSuggestions();
                        this.render();
                        return;
                    }
                    if (this.suggestions.length > 0) {
                        if (!this.showSuggestions) {
                            this.showSuggestions = true;
                        }
                        else {
                            // Cycle through suggestions
                            this.selectedSuggestion = (this.selectedSuggestion + 1) % this.suggestions.length;
                        }
                        this.render();
                        return;
                    }
                }
                // Shift+Tab → cycle suggestions backwards
                if (key === "\x1b[Z") {
                    if (this.suggestions.length > 0 && this.showSuggestions) {
                        this.selectedSuggestion = (this.selectedSuggestion - 1 + this.suggestions.length) % this.suggestions.length;
                        this.render();
                        return;
                    }
                }
                // Escape → hide suggestions or cancel multiline
                if (key === "\x1b") {
                    if (this.showSuggestions) {
                        this.showSuggestions = false;
                        this.render();
                        return;
                    }
                    if (this.isMultiline()) {
                        this.lines.splice(this.curLine, 1);
                        this.curLine = Math.max(0, this.curLine - 1);
                        this.cursorPos = this.lines[this.curLine]?.length || 0;
                        this.render();
                        return;
                    }
                }
                // Alt+Enter → new line
                if (key === "\x1b\r" || key === "\x1b\n" || key === "\x1b[27;8;13~") {
                    this.lines.splice(this.curLine + 1, 0, "");
                    this.curLine++;
                    this.cursorPos = 0;
                    this.showSuggestions = false;
                    this.render();
                    return;
                }
                // Backspace
                if (key === "\x7f" || key === "\b") {
                    if (this.cursorPos > 0) {
                        this.lines[this.curLine] =
                            this.lines[this.curLine].slice(0, this.cursorPos - 1) +
                                this.lines[this.curLine].slice(this.cursorPos);
                        this.cursorPos--;
                    }
                    else if (this.curLine > 0) {
                        // Merge with previous line
                        const prevLine = this.lines[this.curLine - 1];
                        this.cursorPos = prevLine.length;
                        this.lines[this.curLine - 1] = prevLine + this.lines[this.curLine];
                        this.lines.splice(this.curLine, 1);
                        this.curLine--;
                    }
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Arrow Left
                if (key === "\x1b[D" || key === "\x1bOD") {
                    if (this.cursorPos > 0) {
                        this.cursorPos--;
                        this.render();
                    }
                    return;
                }
                // Arrow Right
                if (key === "\x1b[C" || key === "\x1bOC") {
                    if (this.cursorPos < this.lines[this.curLine].length) {
                        this.cursorPos++;
                        this.render();
                    }
                    else if (this.ghostText) {
                        // Accept one character of ghost text
                        this.lines[this.curLine] += this.ghostText[0];
                        this.cursorPos++;
                        this.ghostText = this.ghostText.slice(1);
                        this.updateSuggestions();
                        this.render();
                    }
                    return;
                }
                // Arrow Up → previous history or previous suggestion
                if (key === "\x1b[A" || key === "\x1bOA") {
                    if (this.showSuggestions && this.suggestions.length > 0) {
                        this.selectedSuggestion = Math.max(0, this.selectedSuggestion - 1);
                        this.render();
                        return;
                    }
                    if (!this.isMultiline()) {
                        const prev = this.options.cmdHistory.previous(this.lines[0]);
                        if (prev !== null) {
                            this.lines[0] = prev;
                            this.cursorPos = prev.length;
                            this.historyMode = true;
                            this.updateSuggestions();
                            this.render();
                        }
                    }
                    return;
                }
                // Arrow Down → next history or next suggestion
                if (key === "\x1b[B" || key === "\x1bOB") {
                    if (this.showSuggestions && this.suggestions.length > 0) {
                        this.selectedSuggestion = Math.min(this.suggestions.length - 1, this.selectedSuggestion + 1);
                        this.render();
                        return;
                    }
                    if (!this.isMultiline()) {
                        const next = this.options.cmdHistory.next(this.lines[0]);
                        if (next !== null) {
                            this.lines[0] = next;
                            this.cursorPos = next.length;
                            this.historyMode = next !== "";
                            this.updateSuggestions();
                            this.render();
                        }
                    }
                    return;
                }
                // Home
                if (key === "\x1b[H" || key === "\x1b[1~") {
                    this.cursorPos = 0;
                    this.render();
                    return;
                }
                // End
                if (key === "\x1b[F" || key === "\x1b[4~") {
                    this.cursorPos = this.lines[this.curLine].length;
                    this.render();
                    return;
                }
                // Ctrl+A → Home
                if (key === "\x01") {
                    this.cursorPos = 0;
                    this.render();
                    return;
                }
                // Ctrl+E → End
                if (key === "\x05") {
                    this.cursorPos = this.lines[this.curLine].length;
                    this.render();
                    return;
                }
                // Ctrl+K → Delete to end of line
                if (key === "\x0b") {
                    this.lines[this.curLine] = this.lines[this.curLine].slice(0, this.cursorPos);
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Ctrl+U → Delete to start of line
                if (key === "\x15") {
                    this.lines[this.curLine] = this.lines[this.curLine].slice(this.cursorPos);
                    this.cursorPos = 0;
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Ctrl+W → Delete word backwards
                if (key === "\x17") {
                    const line = this.lines[this.curLine];
                    const before = line.slice(0, this.cursorPos);
                    const match = before.match(/\s*\S+\s*$/);
                    if (match) {
                        this.lines[this.curLine] = line.slice(0, this.cursorPos - match[0].length) + line.slice(this.cursorPos);
                        this.cursorPos -= match[0].length;
                        this.updateSuggestions();
                        this.render();
                    }
                    return;
                }
                // Ignore other escape sequences
                if (key.startsWith("\x1b[") || key.startsWith("\x1bO")) {
                    return;
                }
                // Printable characters
                if (key.length === 1 && key >= " ") {
                    this.lines[this.curLine] =
                        this.lines[this.curLine].slice(0, this.cursorPos) +
                            key +
                            this.lines[this.curLine].slice(this.cursorPos);
                    this.cursorPos++;
                    this.historyMode = false;
                    this.options.cmdHistory.reset();
                    this.updateSuggestions();
                    this.render();
                }
            };
            stdin.on("data", onKey);
        });
    }
    currentText() {
        return this.lines.join("\n");
    }
    isMultiline() {
        return this.lines.length > 1;
    }
    updateSuggestions() {
        const currentLine = this.lines[this.curLine];
        // Get suggestions
        this.suggestions = this.options.autocomplete.getSuggestions(currentLine, 8);
        // Get ghost text (inline completion)
        this.ghostText = this.options.autocomplete.getInlineCompletion(currentLine) || "";
        // Auto-show suggestions if we have them and user is typing
        if (this.suggestions.length > 0 && currentLine.length > 0) {
            this.showSuggestions = true;
            this.selectedSuggestion = 0;
        }
        else {
            this.showSuggestions = false;
        }
    }
    render() {
        const { colors: fg, estimateTokens, formatTokens, history, pendingImg } = this.options;
        const c = (col, s) => `${col}${s}\x1b[0m`;
        const B = "\x1b[1m";
        const DIM = "\x1b[2m";
        const R = "\x1b[0m";
        const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
        const cols = () => Math.min(process.stdout.columns || 80, 120);
        const imgTag = pendingImg ? ` ${c(fg.orange, "[🖼 " + require("path").basename(pendingImg) + "]")}` : "";
        const W = cols();
        // Context info
        const msgs = history.length;
        const toks = estimateTokens(history);
        const ctxInfo = msgs > 0
            ? `${c(fg.gray, msgs + " msg" + (msgs !== 1 ? "s" : ""))} ${c(fg.gray, "·")} ${c(fg.gray, "~" + formatTokens(toks) + " tok")}`
            : "";
        // Calculate total height needed
        let totalHeight = 0;
        // Suggestions box height
        if (this.showSuggestions && this.suggestions.length > 0) {
            totalHeight += Math.min(this.suggestions.length, 6) + 3; // suggestions + borders
        }
        else {
            totalHeight += 1; // blank line
        }
        // Input box height
        if (this.isMultiline()) {
            totalHeight += this.lines.length + 2; // lines + borders
        }
        else {
            totalHeight += 3; // single line input box
        }
        // Move to saved position and clear everything below
        process.stdout.write("\x1b[0J");
        // Render suggestions box
        if (this.showSuggestions && this.suggestions.length > 0) {
            process.stdout.write(`\n  ${c(fg.cyan, "╭─")} ${c(fg.gray, "suggestions")}\n`);
            for (let i = 0; i < Math.min(this.suggestions.length, 6); i++) {
                const sugg = this.suggestions[i];
                const selected = i === this.selectedSuggestion;
                const arrow = selected ? c(fg.cyan, " ❯ ") : "   ";
                const display = selected ? `${B}${c(fg.white, sugg.display.padEnd(30))}${R}` : c(fg.sky, sugg.display.padEnd(30));
                const desc = c(fg.gray, sugg.description);
                process.stdout.write(`  ${c(fg.cyan, "│")}${arrow}${display} ${desc}\n`);
            }
            process.stdout.write(`  ${c(fg.cyan, "╰─")} ${c(fg.gray, "↑↓ navigate · tab accept · esc cancel")}\n\n`);
        }
        else {
            process.stdout.write("\n");
        }
        // Render input box
        if (this.isMultiline()) {
            // Multiline mode
            process.stdout.write(`  ${c(fg.cyan, "╭─")} ${B}${c(fg.blue, "◆ you")}${R}${imgTag}  ${DIM}${c(fg.gray, "alt+enter newline · enter send · esc cancel")}${R}\n`);
            for (let i = 0; i < this.lines.length; i++) {
                const lineContent = this.lines[i] || "";
                process.stdout.write(`  ${c(fg.cyan, "│")} ${lineContent}\n`);
            }
            process.stdout.write(`  ${c(fg.cyan, "╰" + "─".repeat(W - 3))}\n`);
        }
        else {
            // Single line mode
            const ctx = ctxInfo ? `${DIM}${ctxInfo}${R}  ` : "";
            const histHint = this.historyMode ? `${DIM}${c(fg.purple, "[history]")}${R} ` : "";
            // Top border
            process.stdout.write(`  ${c(fg.cyan, "╭─")} ${B}${c(fg.blue, "◆ you")}${R}${imgTag} ${c(fg.cyan, "─".repeat(Math.max(0, W - 15 - stripAnsi(imgTag).length)))}\n`);
            // Input line with cursor and ghost text
            const before = this.lines[0].slice(0, this.cursorPos);
            const after = this.lines[0].slice(this.cursorPos);
            const ghost = this.ghostText ? c(fg.gray, this.ghostText) : "";
            process.stdout.write(`  ${c(fg.cyan, "│")} ${before}${c(fg.cyan, "▌")}${after}${ghost}\n`);
            // Bottom border with context info
            const bottomInfo = `${ctx}${histHint}${DIM}${c(fg.gray, "tab complete · ↑↓ history · / commands")}${R}`;
            const infoLen = stripAnsi(bottomInfo).length;
            process.stdout.write(`  ${c(fg.cyan, "╰" + "─".repeat(Math.max(0, W - 3 - infoLen)))} ${bottomInfo}\n`);
        }
        // Move cursor back to input position
        const linesToMoveUp = this.isMultiline() ? (this.lines.length - this.curLine + 1) : 2;
        process.stdout.write(`\x1b[${linesToMoveUp}A`);
        // Position cursor at correct column
        const cursorCol = 4 + this.cursorPos;
        process.stdout.write(`\x1b[${cursorCol}G`);
    }
}
exports.EnhancedInput = EnhancedInput;
