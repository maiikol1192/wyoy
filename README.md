# WYOY — Work Yes Or Yes

CLI wrapper for Claude Code and Gemini CLI with automatic failover.

## Install

```bash
# From GitHub (available now)
git clone https://github.com/maiikol1192/wyoy.git
cd wyoy
npm install
npm link

# From npm (coming soon)
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
