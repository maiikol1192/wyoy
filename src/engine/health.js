'use strict';

const ERROR_PATTERNS = [
  { type: 'api_overloaded', patterns: [/overloaded/i, /529/, /rate_limit/i, /rate limit/i, /too many requests/i] },
  { type: 'auth_expired', patterns: [/unauthorized/i, /401/, /token expired/i, /not authenticated/i, /login required/i] },
  { type: 'network_error', patterns: [/ECONNREFUSED/i, /ETIMEDOUT/i, /ENOTFOUND/i, /network/i, /connection reset/i] },
];

const ERROR_DESCRIPTIONS = {
  api_overloaded: 'API overloaded or rate limited',
  auth_expired: 'Authentication expired or invalid',
  network_error: 'Network connection error',
  crash: 'Unexpected crash',
  normal_exit: 'Normal exit',
};

function classifyError(exitCode, lastLines) {
  if (exitCode === 0) return 'normal_exit';
  const text = lastLines.join('\n');
  for (const { type, patterns } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return type;
    }
  }
  return 'crash';
}

function describeError(errorType) {
  return ERROR_DESCRIPTIONS[errorType] || 'Unknown error';
}

module.exports = { classifyError, describeError, ERROR_PATTERNS };
