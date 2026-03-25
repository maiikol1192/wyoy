'use strict';

function renderHandoff(ctx) {
  const messagesBlock = ctx.messages.length === 0
    ? 'No conversation history available.'
    : ctx.messages.map((m) => `### ${m.role === 'user' ? 'User' : 'Assistant'}:\n${m.content}`).join('\n\n');

  return `You are resuming work that was started in a previous session with ${ctx.engine}.
The session was interrupted due to: ${ctx.errorClass}.

## Session Context

- Working directory: ${ctx.cwd}
- Git branch: ${ctx.branch || 'unknown'}
- Work mode: ${ctx.workMode}
- Session duration before interruption: ${ctx.duration || 'unknown'}

## Files Modified During Session

${ctx.gitDiffStat || 'No file changes detected.'}

## Recent Conversation (last ${ctx.messages.length} exchanges)

${messagesBlock}

## Instructions

Continue from where the previous session left off. The user will
guide you on what to do next. Do NOT repeat work that was already
completed — the file changes listed above are already on disk.`;
}

module.exports = { renderHandoff };
