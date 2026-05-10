"use strict";
// Simple, reliable input system without complex rendering
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedInput = void 0;
class EnhancedInput {
    constructor(options) {
        this.options = options;
        this.line = "";
        this.cursorPos = 0;
        this.suggestions = [];
        this.selectedSuggestion = 0;
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
            this.render();
            const cleanup = () => {
                stdin.removeListener("data", onKey);
                if (stdin.setRawMode)
                    stdin.setRawMode(wasRaw || false);
                process.stdout.write("\n");
            };
            const onKey = (key) => {
                // Ctrl+C
                if (key === "\x03") {
                    cleanup();
                    this.options.onCtrlC();
                    return;
                }
                // Enter
                if (key === "\r" || key === "\n") {
                    // Accept selected suggestion if available
                    if (this.suggestions.length > 0) {
                        this.line = this.suggestions[this.selectedSuggestion].text;
                        this.cursorPos = this.line.length;
                        this.updateSuggestions();
                        this.render();
                        return;
                    }
                    const text = this.line.trim();
                    if (!text) {
                        this.render();
                        return;
                    }
                    cleanup();
                    if (!text.startsWith("/")) {
                        this.options.cmdHistory.add(text);
                    }
                    resolve(text);
                    return;
                }
                // Backspace
                if (key === "\x7f" || key === "\b") {
                    if (this.cursorPos > 0) {
                        this.line = this.line.slice(0, this.cursorPos - 1) + this.line.slice(this.cursorPos);
                        this.cursorPos--;
                    }
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Tab - autocomplete
                if (key === "\t") {
                    if (this.suggestions.length > 0) {
                        this.line = this.suggestions[this.selectedSuggestion].text;
                        this.cursorPos = this.line.length;
                    }
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Arrow Left
                if (key === "\x1b[D" || key === "\x1bOD") {
                    if (this.cursorPos > 0)
                        this.cursorPos--;
                    this.render();
                    return;
                }
                // Arrow Right
                if (key === "\x1b[C" || key === "\x1bOC") {
                    if (this.cursorPos < this.line.length)
                        this.cursorPos++;
                    this.render();
                    return;
                }
                // Arrow Up - navigate suggestions or history
                if (key === "\x1b[A" || key === "\x1bOA") {
                    if (this.suggestions.length > 0) {
                        // Navigate suggestions
                        this.selectedSuggestion = Math.max(0, this.selectedSuggestion - 1);
                        this.render();
                    }
                    else {
                        // Navigate history
                        const prev = this.options.cmdHistory.previous(this.line);
                        if (prev !== null) {
                            this.line = prev;
                            this.cursorPos = this.line.length;
                            this.updateSuggestions();
                            this.render();
                        }
                    }
                    return;
                }
                // Arrow Down - navigate suggestions or history
                if (key === "\x1b[B" || key === "\x1bOB") {
                    if (this.suggestions.length > 0) {
                        // Navigate suggestions
                        this.selectedSuggestion = Math.min(this.suggestions.length - 1, this.selectedSuggestion + 1);
                        this.render();
                    }
                    else {
                        // Navigate history
                        const next = this.options.cmdHistory.next(this.line);
                        if (next !== null) {
                            this.line = next;
                            this.cursorPos = this.line.length;
                            this.updateSuggestions();
                            this.render();
                        }
                    }
                    return;
                }
                // Home
                if (key === "\x1b[H" || key === "\x1b[1~" || key === "\x01") {
                    this.cursorPos = 0;
                    this.render();
                    return;
                }
                // End
                if (key === "\x1b[F" || key === "\x1b[4~" || key === "\x05") {
                    this.cursorPos = this.line.length;
                    this.render();
                    return;
                }
                // Ignore other escape sequences
                if (key.startsWith("\x1b[") || key.startsWith("\x1bO")) {
                    return;
                }
                // Handle pasted text (multi-character input)
                if (key.length > 1) {
                    // Filter out control characters but allow newlines for multi-line paste
                    const cleanText = key.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
                    this.line = this.line.slice(0, this.cursorPos) + cleanText + this.line.slice(this.cursorPos);
                    this.cursorPos += cleanText.length;
                    this.options.cmdHistory.reset();
                    this.updateSuggestions();
                    this.render();
                    return;
                }
                // Printable characters (single character input)
                if (key.length === 1 && key >= " ") {
                    this.line = this.line.slice(0, this.cursorPos) + key + this.line.slice(this.cursorPos);
                    this.cursorPos++;
                    this.options.cmdHistory.reset();
                    this.updateSuggestions();
                    this.render();
                }
            };
            stdin.on("data", onKey);
        });
    }
    updateSuggestions() {
        this.suggestions = this.options.autocomplete.getSuggestions(this.line, 5);
        this.selectedSuggestion = 0;
    }
    render() {
        const { colors: fg } = this.options;
        const c = (col, s) => `${col}${s}\x1b[0m`;
        const B = "\x1b[1m";
        const R = "\x1b[0m";
        // Clear from cursor to end of screen
        process.stdout.write("\x1b[J");
        // Show suggestions if available
        if (this.suggestions.length > 0 && this.line.length > 0) {
            process.stdout.write("\n");
            for (let i = 0; i < Math.min(this.suggestions.length, 5); i++) {
                const sugg = this.suggestions[i];
                const selected = i === this.selectedSuggestion;
                const arrow = selected ? c(fg.cyan, "❯") : " ";
                const display = sugg.display.padEnd(30);
                const desc = sugg.description.slice(0, 40);
                const style = selected ? `${B}${c(fg.white, display)}${R}` : c(fg.sky, display);
                process.stdout.write(`  ${arrow} ${style} ${c(fg.gray, desc)}\n`);
            }
            process.stdout.write(`  ${c(fg.gray, "↑↓ navigate · tab/enter accept")}\n`);
        }
        // Move back up if we showed suggestions
        if (this.suggestions.length > 0 && this.line.length > 0) {
            const linesToMove = Math.min(this.suggestions.length, 5) + 2;
            process.stdout.write(`\x1b[${linesToMove}A`);
        }
        // Clear current line and show prompt
        process.stdout.write("\r\x1b[K");
        process.stdout.write(`${c(fg.cyan, "❯")} `);
        // Show line with cursor
        const before = this.line.slice(0, this.cursorPos);
        const after = this.line.slice(this.cursorPos);
        process.stdout.write(before);
        process.stdout.write(c(fg.cyan, "▌"));
        process.stdout.write(after);
        // Show ghost text if available
        const ghost = this.options.autocomplete.getInlineCompletion(this.line);
        if (ghost && this.cursorPos === this.line.length) {
            process.stdout.write(c(fg.gray, ghost));
        }
    }
}
exports.EnhancedInput = EnhancedInput;
