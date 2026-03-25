# WYOY — Work Yes Or Yes

CLI wrapper for Claude Code and Gemini CLI with automatic failover.

## Install

```bash
npm install -g wyoy
```

## Usage

```bash
wyoy                    # Start interactive session
wyoy --engine claude    # Start with Claude
wyoy --engine gemini    # Start with Gemini
wyoy engine status      # Check engine status
wyoy engine auth claude # Authenticate Claude
wyoy engine switch      # Switch to fallback engine
wyoy update             # Update WYOY
```

## Version

0.0.1-beta
