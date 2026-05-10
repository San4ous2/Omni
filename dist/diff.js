"use strict";
// Simple unified diff generator without external dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiff = generateDiff;
exports.formatDiff = formatDiff;
function generateDiff(oldText, newText) {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const diff = [];
    const lcs = longestCommonSubsequence(oldLines, newLines);
    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;
    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
            // Context line
            diff.push({ type: "context", content: oldLines[oldIdx], lineNum: oldIdx + 1 });
            oldIdx++;
            newIdx++;
            lcsIdx++;
        }
        else if (lcsIdx < lcs.length && newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
            // Context line from new
            diff.push({ type: "context", content: newLines[newIdx], lineNum: newIdx + 1 });
            newIdx++;
            lcsIdx++;
        }
        else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
            // Removed line
            diff.push({ type: "remove", content: oldLines[oldIdx], lineNum: oldIdx + 1 });
            oldIdx++;
        }
        else if (newIdx < newLines.length) {
            // Added line
            diff.push({ type: "add", content: newLines[newIdx], lineNum: newIdx + 1 });
            newIdx++;
        }
    }
    return diff;
}
function longestCommonSubsequence(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            }
            else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    // Backtrack to find LCS
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        }
        else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        }
        else {
            j--;
        }
    }
    return lcs;
}
function formatDiff(diff, colors) {
    const lines = [];
    let contextCount = 0;
    for (let i = 0; i < diff.length; i++) {
        const line = diff[i];
        if (line.type === "context") {
            contextCount++;
            // Show only 3 lines of context around changes
            if (contextCount <= 3 || i >= diff.length - 3) {
                lines.push(`${colors.context}  ${line.content}${colors.reset}`);
            }
            else if (contextCount === 4) {
                lines.push(`${colors.context}  ...${colors.reset}`);
            }
        }
        else {
            contextCount = 0;
            if (line.type === "add") {
                lines.push(`${colors.add}+ ${line.content}${colors.reset}`);
            }
            else {
                lines.push(`${colors.remove}- ${line.content}${colors.reset}`);
            }
        }
    }
    return lines.join("\n");
}
