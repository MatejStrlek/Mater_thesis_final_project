/**
 * Comment-aware line counter for JS/TS/JSON source, shared by every
 * benchmark script that reports a line-count metric (H3's config LOC, H5's
 * code-volume LOC, H6's diff-stat comparison).
 *
 * Why this exists: `split('\n').length` (the original rubric for all three
 * scripts) counts comment-only lines the same as functional code — but a
 * comment doesn't run, so a file with more of them isn't "more code," it's
 * more prose. That's a real confound here specifically because the two
 * sibling repos follow different comment conventions (this repo's own
 * CLAUDE.md defaults to *no* comments; the Selenium repo's Page Objects and
 * utils carry heavy rationale-explaining comment blocks throughout) — so a
 * raw line count partly measures documentation style, not framework
 * verbosity. This tokenizes each file (tracking string/template-literal
 * state so a `//` or `/*` inside a string isn't mistaken for a comment) and
 * classifies every line as code, comment-only, or blank.
 *
 * Known limitation: no regex-literal handling (a `/pattern/` could
 * confuse the `/` state machine into thinking it started a comment) —
 * checked, neither repo's `pages/`, `utils/`, or config files use a regex
 * literal, so this doesn't affect any file actually counted. A file that
 * did would need a real parser; deliberately not building one for a case
 * that doesn't occur, per the same "simpler, more defensible than guessing"
 * spirit the original rubric used.
 */

function classifyLines(content) {
  const lines = [];
  let lineHasCode = false;
  let lineHasComment = false;
  let state = 'NORMAL'; // NORMAL | LINE_COMMENT | BLOCK_COMMENT | SQ | DQ | TEMPLATE

  const push = () => {
    lines.push({ code: lineHasCode, comment: lineHasComment });
    lineHasCode = false;
    lineHasComment = false;
  };

  let i = 0;
  const n = content.length;
  while (i < n) {
    const c = content[i];
    const c2 = content[i + 1];

    if (state === 'NORMAL') {
      if (c === '\n') { push(); i += 1; continue; }
      if (c === '/' && c2 === '/') { state = 'LINE_COMMENT'; lineHasComment = true; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'BLOCK_COMMENT'; lineHasComment = true; i += 2; continue; }
      if (c === "'") { state = 'SQ'; lineHasCode = true; i += 1; continue; }
      if (c === '"') { state = 'DQ'; lineHasCode = true; i += 1; continue; }
      if (c === '`') { state = 'TEMPLATE'; lineHasCode = true; i += 1; continue; }
      if (!/\s/.test(c)) lineHasCode = true;
      i += 1;
      continue;
    }

    if (state === 'LINE_COMMENT') {
      if (c === '\n') { state = 'NORMAL'; push(); i += 1; continue; }
      i += 1;
      continue;
    }

    if (state === 'BLOCK_COMMENT') {
      if (c === '\n') { push(); lineHasComment = true; i += 1; continue; }
      if (c === '*' && c2 === '/') { state = 'NORMAL'; i += 2; continue; }
      i += 1;
      continue;
    }

    if (state === 'SQ' || state === 'DQ') {
      const quote = state === 'SQ' ? "'" : '"';
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') { push(); i += 1; continue; } // unterminated string guard, shouldn't occur
      if (c === quote) { state = 'NORMAL'; i += 1; continue; }
      i += 1;
      continue;
    }

    if (state === 'TEMPLATE') {
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') { push(); lineHasCode = true; i += 1; continue; }
      if (c === '`') { state = 'NORMAL'; i += 1; continue; }
      i += 1;
      continue;
    }
  }
  push();
  return lines;
}

/**
 * Returns { total, code, commentOnly, blank, sloc } for one file's content.
 * `sloc` (source lines of code) = total minus comment-only lines — every
 * line that isn't *purely* a comment, matching the original rubric's
 * explicit choice to still count blank lines, just not comment prose.
 */
function countSourceLines(content) {
  const lines = classifyLines(content);
  const commentOnly = lines.filter((l) => l.comment && !l.code).length;
  const code = lines.filter((l) => l.code).length;
  const blank = lines.filter((l) => !l.code && !l.comment).length;
  return { total: lines.length, code, commentOnly, blank, sloc: code + blank };
}

module.exports = { countSourceLines };
