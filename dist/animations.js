"use strict";
// Typing animation utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypingIndicator = exports.ProgressBar = exports.Typewriter = void 0;
class Typewriter {
    constructor(options = {}) {
        this.cancelled = false;
        this.speed = options.speed || 80;
        this.minDelay = options.minDelay || 5;
        this.maxDelay = options.maxDelay || 30;
        this.punctuationDelay = options.punctuationDelay || 100;
    }
    cancel() {
        this.cancelled = true;
    }
    async type(text, onChar) {
        this.cancelled = false;
        const chars = text.split("");
        for (let i = 0; i < chars.length; i++) {
            if (this.cancelled)
                break;
            const char = chars[i];
            if (onChar)
                onChar(char);
            else
                process.stdout.write(char);
            // Calculate delay
            let delay = this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
            // Add extra delay after punctuation
            if (['.', '!', '?', ',', ';', ':'].includes(char)) {
                delay += this.punctuationDelay;
            }
            // Add small delay after newlines
            if (char === '\n') {
                delay += 50;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    async typeLines(lines, onLine) {
        for (const line of lines) {
            if (this.cancelled)
                break;
            await this.type(line + '\n', onLine);
        }
    }
}
exports.Typewriter = Typewriter;
class ProgressBar {
    constructor(total, label = "Progress", width = 40) {
        this.current = 0;
        this.total = total;
        this.label = label;
        this.width = width;
        this.startTime = Date.now();
    }
    update(current) {
        this.current = current;
        this.render();
    }
    increment() {
        this.current++;
        this.render();
    }
    render() {
        const percent = Math.min(100, Math.floor((this.current / this.total) * 100));
        const filled = Math.floor((this.current / this.total) * this.width);
        const empty = this.width - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const eta = this.current > 0
            ? Math.floor((elapsed / this.current) * (this.total - this.current))
            : 0;
        process.stdout.write('\r\x1b[2K');
        process.stdout.write(`  \x1b[96m${this.label}\x1b[0m  [\x1b[92m${bar}\x1b[0m] ${percent}% ` +
            `\x1b[90m(${this.current}/${this.total}) ${elapsed}s elapsed, ${eta}s remaining\x1b[0m`);
    }
    complete() {
        this.current = this.total;
        this.render();
        process.stdout.write('\n');
    }
}
exports.ProgressBar = ProgressBar;
class TypingIndicator {
    constructor(label = "typing") {
        this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.colors = ['\x1b[96m', '\x1b[38;5;117m', '\x1b[38;5;43m', '\x1b[38;5;141m'];
        this.handle = null;
        this.frame = 0;
        this.label = label;
    }
    start() {
        this.frame = 0;
        process.stdout.write('\n');
        this.handle = setInterval(() => {
            process.stdout.write('\r\x1b[2K');
            const spinner = this.frames[this.frame % this.frames.length];
            const color = this.colors[Math.floor(this.frame / this.frames.length) % this.colors.length];
            process.stdout.write(`  ${color}${spinner}\x1b[0m  \x1b[90m${this.label}…\x1b[0m`);
            this.frame++;
        }, 80);
    }
    stop() {
        if (this.handle) {
            clearInterval(this.handle);
            this.handle = null;
        }
        process.stdout.write('\r\x1b[2K');
    }
}
exports.TypingIndicator = TypingIndicator;
