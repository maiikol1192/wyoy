# Changelog

All notable changes to WYOY will be documented in this file.

## [0.0.1-beta] - 2026-03-25

### Added
- Initial release
- Engine selection at startup (Claude default, Gemini available)
- Work mode selection: full-auto, with-approval, read-only
- Auth management with interactive login for Claude (`claude auth login`) and Gemini (native auth flow)
- Transparent PTY passthrough — native engine UI preserved
- Stdout logger with 500-line circular buffer and log rotation (max 10 files, 50MB each)
- Claude JSONL session reader for rich context extraction
- Health monitoring: crash, API overload, auth expired, network error, zombie process detection
- Automatic context handoff to fallback engine with structured prompt
- Manual engine switch via `wyoy engine switch` using SIGUSR1-based IPC
- Same-engine retry with native resume (`claude --continue` / `gemini --resume latest`)
- Auto-update check at startup (24h cache) + `wyoy update` command
- Engine update notifications for Claude and Gemini
- Session state persistence (`~/.wyoy/session.json`) with PID lockfile
- Graceful shutdown on SIGTERM, SIGHUP with engine cleanup

## [0.0.2] - Planned

### Planned
- Automatic translation of Claude skills/hooks to Gemini equivalents on switch
- Automatic MCP server reconfiguration when switching engines
- Auto-install engine updates

## [0.0.3] - Planned

### Planned
- Linux support
- Windows support
- Uptime/failover metrics

## [0.1.0] - Planned

### Planned
- Dual-engine hot standby
- Real-time context sync between engines
- Zero-downtime failover
