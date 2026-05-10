"use strict";
// Git Hooks Integration
// Auto-review code on git commit
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
exports.GitHooksManager = void 0;
exports.installGitHooks = installGitHooks;
exports.uninstallGitHooks = uninstallGitHooks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const reviewer_1 = require("../reviewer");
class GitHooksManager {
    constructor(workDir, config = {}) {
        this.workDir = workDir;
        this.config = config;
        this.defaultConfig = {
            enabled: true,
            autoFix: false,
            blockOnCritical: true,
            blockOnHigh: false,
            showSummary: true,
        };
        this.config = { ...this.defaultConfig, ...config };
    }
    /**
     * Install git hooks
     */
    async install() {
        const gitDir = path.join(this.workDir, ".git");
        if (!fs.existsSync(gitDir)) {
            throw new Error("Not a git repository");
        }
        const hooksDir = path.join(gitDir, "hooks");
        if (!fs.existsSync(hooksDir)) {
            fs.mkdirSync(hooksDir, { recursive: true });
        }
        // Install pre-commit hook
        await this.installPreCommitHook(hooksDir);
        // Install commit-msg hook
        await this.installCommitMsgHook(hooksDir);
        console.log("✓ Git hooks installed successfully");
    }
    /**
     * Uninstall git hooks
     */
    async uninstall() {
        const gitDir = path.join(this.workDir, ".git");
        const hooksDir = path.join(gitDir, "hooks");
        const preCommitPath = path.join(hooksDir, "pre-commit");
        const commitMsgPath = path.join(hooksDir, "commit-msg");
        if (fs.existsSync(preCommitPath)) {
            fs.unlinkSync(preCommitPath);
        }
        if (fs.existsSync(commitMsgPath)) {
            fs.unlinkSync(commitMsgPath);
        }
        console.log("✓ Git hooks uninstalled");
    }
    /**
     * Install pre-commit hook
     */
    async installPreCommitHook(hooksDir) {
        const hookPath = path.join(hooksDir, "pre-commit");
        const hookContent = `#!/bin/sh
# Omni-Agent Pre-Commit Hook
# Auto-review staged files before commit

echo "🔍 Running code review..."

# Run omni review
node -e "
const { CodeReviewer } = require('${this.workDir}/src/reviewer');
const reviewer = new CodeReviewer('${this.workDir}');

(async () => {
  try {
    const result = await reviewer.reviewStaged();

    if (result.issues.length === 0) {
      console.log('✓ No issues found');
      process.exit(0);
    }

    // Show summary
    console.log(\`\\n📊 Review Summary:\`);
    console.log(\`   🔴 Critical: \${result.summary.critical}\`);
    console.log(\`   🟠 High: \${result.summary.high}\`);
    console.log(\`   🟡 Medium: \${result.summary.medium}\`);
    console.log(\`   🟢 Low: \${result.summary.low}\`);
    console.log(\`   ℹ️  Info: \${result.summary.info}\\n\`);

    // Show issues
    for (const issue of result.issues.slice(0, 5)) {
      console.log(\`\${issue.file}:\${issue.line || '?'} - \${issue.message}\`);
    }

    if (result.issues.length > 5) {
      console.log(\`... and \${result.issues.length - 5} more issues\\n\`);
    }

    // Block on critical/high issues if configured
    ${this.config.blockOnCritical ? `
    if (result.summary.critical > 0) {
      console.error('❌ Commit blocked: Critical issues found');
      process.exit(1);
    }
    ` : ""}

    ${this.config.blockOnHigh ? `
    if (result.summary.high > 0) {
      console.error('❌ Commit blocked: High severity issues found');
      process.exit(1);
    }
    ` : ""}

    console.log('⚠️  Issues found but allowing commit');
    process.exit(0);

  } catch (error) {
    console.error('Error running review:', error.message);
    process.exit(0); // Don't block on errors
  }
})();
"
`;
        fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    }
    /**
     * Install commit-msg hook
     */
    async installCommitMsgHook(hooksDir) {
        const hookPath = path.join(hooksDir, "commit-msg");
        const hookContent = `#!/bin/sh
# Omni-Agent Commit Message Hook
# Validate commit message format

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Check minimum length
if [ \${#COMMIT_MSG} -lt 10 ]; then
  echo "❌ Commit message too short (minimum 10 characters)"
  exit 1
fi

# Check for conventional commit format (optional)
# if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+"; then
#   echo "⚠️  Consider using conventional commit format: type(scope): message"
# fi

exit 0
`;
        fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    }
    /**
     * Run pre-commit review manually
     */
    async runPreCommitReview() {
        const reviewer = new reviewer_1.CodeReviewer(this.workDir);
        const result = await reviewer.reviewStaged();
        if (result.issues.length === 0) {
            console.log("✓ No issues found");
            return;
        }
        console.log("\n📊 Review Summary:");
        console.log(`   🔴 Critical: ${result.summary.critical}`);
        console.log(`   🟠 High: ${result.summary.high}`);
        console.log(`   🟡 Medium: ${result.summary.medium}`);
        console.log(`   🟢 Low: ${result.summary.low}`);
        console.log(`   ℹ️  Info: ${result.summary.info}\n`);
        // Show all issues
        for (const issue of result.issues) {
            const icon = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", info: "ℹ️" }[issue.severity];
            console.log(`${icon} ${issue.file}:${issue.line || "?"}`);
            console.log(`   ${issue.message}`);
            if (issue.suggestion) {
                console.log(`   💡 ${issue.suggestion}`);
            }
            if (issue.code) {
                console.log(`   ${issue.code}`);
            }
            console.log();
        }
    }
    /**
     * Check if hooks are installed
     */
    isInstalled() {
        const gitDir = path.join(this.workDir, ".git");
        const preCommitPath = path.join(gitDir, "hooks", "pre-commit");
        return fs.existsSync(preCommitPath);
    }
    /**
     * Get hook status
     */
    getStatus() {
        return {
            installed: this.isInstalled(),
            enabled: this.config.enabled,
            config: this.config,
        };
    }
}
exports.GitHooksManager = GitHooksManager;
/**
 * Quick hook installation helper
 */
async function installGitHooks(workDir, config) {
    const manager = new GitHooksManager(workDir, config);
    await manager.install();
}
/**
 * Quick hook uninstallation helper
 */
async function uninstallGitHooks(workDir) {
    const manager = new GitHooksManager(workDir);
    await manager.uninstall();
}
