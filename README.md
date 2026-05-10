# omni-agent

A **Claude Code-level** CLI coding agent powered by [OmniRoute](https://github.com/diegosouzapw/OmniRoute) — access free models (Claude via Kiro, Qwen, DeepSeek, Gemini, Kimi) with zero API costs.

## 🚀 Now with Claude Code Features!

- ✅ **20+ Advanced Tools** - Edit, Glob, Grep, Git operations
- ✅ **Multi-Agent System** - Explore, Plan, Review, Test agents
- ✅ **Persistent Memory** - Cross-session context and preferences
- ✅ **Task Management** - Track progress with dependencies
- ✅ **Worktree Isolation** - Safe experimentation in git worktrees
- ✅ **Smart Git Workflow** - `/commit`, `/pr`, `/branch` commands with auto-generation
- ✅ **Code Intelligence** - Review, test generation, refactoring, indexing
- ✅ **Team Collaboration** - PR reviews, Slack/Discord notifications, team memory sync

## Prerequisites

1. **Node.js 18+**
2. **OmniRoute running locally** — install and start it first:
   ```bash
   npm install -g omniroute
   omniroute
   ```
3. **Connect free providers** in the OmniRoute dashboard (http://localhost:20128):
   - **Kiro** → AWS Builder ID (free unlimited Claude Sonnet/Haiku)
   - **Qwen** → device auth (free unlimited Qwen3-Coder)
   - **Gemini CLI** → Google account (1500 req/day free)

## Install

```bash
npm install
npm run build
npm link        # makes `omni` available globally
```

Or run directly:
```bash
node bin/omni.js
```

## Usage

```bash
# Interactive mode
omni

# One-shot mode
omni "explain this codebase"
omni --model=kr/claude-sonnet-4.5 "refactor src/index.ts"
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OMNI_URL` | `http://localhost:20128/v1` | OmniRoute base URL |
| `OMNI_KEY` | `any` | API key (any string works for local OmniRoute) |
| `OMNI_MODEL` | `kr/claude-sonnet-4.5` | Default model |
| `AGENT_DIR` | `cwd` | Working directory |

## Free Models Available

| Model ID | Provider | Cost |
|---|---|---|
| `kr/claude-sonnet-4.5` | Kiro (AWS) | FREE unlimited |
| `kr/claude-haiku-4.5` | Kiro (AWS) | FREE unlimited |
| `qw/qwen3-coder-plus` | Qwen | FREE unlimited |
| `gc/gemini-2.5-flash` | Gemini CLI | FREE 1500/day |
| `if/kimi-k2-thinking` | iFlow/Qoder | FREE unlimited |
| `if/deepseek-r1` | iFlow/Qoder | FREE unlimited |

## Commands

### Core Commands
| Command | Description |
|---|---|
| `/model` | Switch AI model (interactive picker) |
| `/models` | List all available models |
| `/provider` | Switch provider |
| `/help` | Show all commands |
| `/clear` | Clear conversation |

### Advanced Features (NEW!)
| Command | Description |
|---|---|
| `/agent <type> <task>` | Run specialized agent (explore, plan, review, test) |
| `/memory <action>` | Manage persistent memory (save, list, search, delete) |
| `/tasks` | View and manage tasks |
| `/worktree <action>` | Create isolated git worktrees |
| `/commit [msg]` | Smart commit with auto-generated messages |
| `/pr [title]` | Create pull request with gh CLI |
| `/branch <name> [action]` | Advanced branch management |
| `/pr-review [pr]` | Post automated code review on PR |
| `/pr-comments [pr]` | View PR comments |
| `/pr-reply <id> <text>` | Reply to PR comment |
| `/notify <message>` | Send notification to Slack/Discord |
| `/team-sync` | Sync team memories |

### Other Commands
| Command | Description |
|---|---|
| `/skills` | List available skills |
| `/mcp` | Manage MCP servers |
| `/sessions` | Browse saved sessions |
| `/stats` | Token usage stats |
| `/config` | View configuration |
| `/export` | Export chat to markdown |

## Config

Stored at `~/.omni/config.json`:

```json
{
  "defaultModel": "kr/claude-sonnet-4.5",
  "syntaxHighlight": true,
  "typewriterEffect": true,
  "typewriterSpeed": 120,
  "autoSave": true,
  "maxHistory": 100
}
```

## MCP Servers

Add MCP servers at `~/.omni/mcp.json`:

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
}
```
