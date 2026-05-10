"use strict";
// Lightweight syntax highlighter for code blocks
// Supports: JavaScript, TypeScript, Python, Go, Rust, Bash, JSON, SQL
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightCode = highlightCode;
const KEYWORDS = {
    js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "new", "class", "extends", "import", "export", "from", "default", "async", "await", "yield", "typeof", "instanceof"],
    ts: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "new", "class", "extends", "import", "export", "from", "default", "async", "await", "yield", "typeof", "instanceof", "interface", "type", "enum", "namespace", "declare", "public", "private", "protected", "readonly"],
    py: ["def", "class", "return", "if", "elif", "else", "for", "while", "break", "continue", "pass", "try", "except", "finally", "raise", "import", "from", "as", "with", "lambda", "yield", "async", "await", "True", "False", "None", "and", "or", "not", "in", "is"],
    go: ["func", "return", "if", "else", "for", "range", "break", "continue", "switch", "case", "default", "go", "defer", "select", "chan", "var", "const", "type", "struct", "interface", "map", "package", "import"],
    rust: ["fn", "let", "mut", "const", "return", "if", "else", "match", "for", "while", "loop", "break", "continue", "struct", "enum", "trait", "impl", "pub", "use", "mod", "crate", "self", "super", "async", "await", "move"],
    bash: ["if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac", "function", "return", "local", "export", "source", "alias"],
    sql: ["SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "PRIMARY", "KEY", "FOREIGN", "REFERENCES"],
};
function highlightCode(code, lang, colors) {
    const normalizedLang = lang.toLowerCase().replace(/^(javascript|jsx)$/, "js").replace(/^(typescript|tsx)$/, "ts").replace(/^(python|py3)$/, "py").replace(/^(shell|sh)$/, "bash");
    if (!KEYWORDS[normalizedLang]) {
        // No highlighting for unknown languages
        return code;
    }
    const keywords = KEYWORDS[normalizedLang];
    const lines = code.split("\n");
    const highlighted = [];
    for (let line of lines) {
        let result = "";
        let i = 0;
        while (i < line.length) {
            // Skip whitespace
            if (/\s/.test(line[i])) {
                result += line[i];
                i++;
                continue;
            }
            // Comments
            if (line.slice(i, i + 2) === "//" || line.slice(i, i + 1) === "#") {
                result += colors.comment + line.slice(i) + colors.reset;
                break;
            }
            if (line.slice(i, i + 2) === "/*") {
                const end = line.indexOf("*/", i + 2);
                if (end !== -1) {
                    result += colors.comment + line.slice(i, end + 2) + colors.reset;
                    i = end + 2;
                }
                else {
                    result += colors.comment + line.slice(i) + colors.reset;
                    break;
                }
                continue;
            }
            // Strings
            if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
                const quote = line[i];
                let j = i + 1;
                let escaped = false;
                while (j < line.length) {
                    if (escaped) {
                        escaped = false;
                        j++;
                        continue;
                    }
                    if (line[j] === "\\") {
                        escaped = true;
                        j++;
                        continue;
                    }
                    if (line[j] === quote) {
                        j++;
                        break;
                    }
                    j++;
                }
                result += colors.string + line.slice(i, j) + colors.reset;
                i = j;
                continue;
            }
            // Numbers
            if (/\d/.test(line[i])) {
                let j = i;
                while (j < line.length && /[\d._xXa-fA-F]/.test(line[j]))
                    j++;
                result += colors.number + line.slice(i, j) + colors.reset;
                i = j;
                continue;
            }
            // Operators
            if (/[+\-*/%=<>!&|^~?:]/.test(line[i])) {
                let j = i;
                while (j < line.length && /[+\-*/%=<>!&|^~?:]/.test(line[j]))
                    j++;
                result += colors.operator + line.slice(i, j) + colors.reset;
                i = j;
                continue;
            }
            // Keywords and identifiers
            if (/[a-zA-Z_]/.test(line[i])) {
                let j = i;
                while (j < line.length && /[a-zA-Z0-9_]/.test(line[j]))
                    j++;
                const word = line.slice(i, j);
                if (keywords.includes(word)) {
                    result += colors.keyword + word + colors.reset;
                }
                else if (/^[A-Z]/.test(word)) {
                    // Types (capitalized words)
                    result += colors.type + word + colors.reset;
                }
                else if (j < line.length && line[j] === "(") {
                    // Functions (followed by parenthesis)
                    result += colors.function + word + colors.reset;
                }
                else {
                    result += word;
                }
                i = j;
                continue;
            }
            // Default: just add the character
            result += line[i];
            i++;
        }
        highlighted.push(result);
    }
    return highlighted.join("\n");
}
