# WYOY — Work Yes Or Yes

CLI wrapper for Claude Code and Gemini CLI with automatic failover. If one goes down, the other picks up with full context. Never stop working.

## Install

```bash
# From GitHub
git clone https://github.com/maiikol1192/wyoy.git
cd wyoy
npm install
npm link

# From npm (coming soon)
npm install -g wyoy
```

**Requirements:** Node.js >= 18, macOS, [Claude Code](https://claude.ai/code) and/or [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed.

## Usage

```bash
# Start interactive session (asks which engine + work mode)
wyoy

# Start directly with an engine
wyoy --engine claude
wyoy --engine gemini

# Engine management
wyoy engine status            # Show engine status and auth
wyoy engine auth claude       # Authenticate Claude
wyoy engine auth gemini       # Authenticate Gemini
wyoy engine switch            # Switch to fallback engine (mid-session)
wyoy engine switch gemini     # Switch to specific engine

# Updates
wyoy update                   # Check and install WYOY updates
wyoy update --check           # Check only, don't install
```

## How It Works

1. WYOY spawns Claude or Gemini in a transparent PTY — you see the native UI
2. It monitors the process for crashes, API errors, auth failures, and network issues
3. If the engine fails, WYOY captures context (conversation + git state) and offers:
   - **Retry** with the same engine (uses native `--continue` / `--resume`)
   - **Switch** to the fallback engine with a structured handoff prompt
   - **Quit**
4. The fallback engine receives the conversation context and continues where you left off

## Roadmap

### v0.0.1-beta (current)
- [x] Engine selection at startup (Claude default)
- [x] Work mode selection (full-auto / with-approval / read-only)
- [x] Auth management for both engines with interactive login
- [x] Transparent PTY passthrough — native engine UI
- [x] Stdout logging for context capture
- [x] Failure detection (crash, API down, auth expired, network error)
- [x] Automatic context handoff to fallback engine
- [x] Manual engine switch via `wyoy engine switch` (SIGUSR1-based IPC)
- [x] Same-engine retry with native resume (`--continue` / `--resume latest`)
- [x] Auto-update check + `wyoy update` command
- [x] Engine update notifications

### v0.0.2 — Skills & MCP Translation
- [ ] Automatic translation of Claude skills/hooks to Gemini equivalents on switch
- [ ] Automatic MCP server reconfiguration when switching engines
- [ ] Auto-install engine updates (not just notify)

### v0.0.3 — Cross-Platform & Metrics
- [ ] Linux support
- [ ] Windows support
- [ ] Uptime/failover metrics (which engine fails more, avg switch time)

### v0.1.0 — Hot Standby
- [ ] Dual-engine hot standby (both running, instant switch)
- [ ] Real-time context sync between engines
- [ ] Zero-downtime failover

## Architecture

```
User <-> Terminal
            |
        [WYOY PTY Manager]
            |                \
  [claude/gemini process]    [Stdout Logger -> ~/.wyoy/logs/]
                                   | (on failure)
                             [Context Builder]
                                   |
                             [Fallback Engine]
```

## License

MIT
