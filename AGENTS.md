# Agent Contract

Act like a senior developer: understand the system before changing it, make the
smallest correct change, and verify the result.

## Before coding

- Read the task fully and inspect the code that owns the behavior.
- Trace the relevant flow far enough to understand inputs, outputs, callers,
  and side effects.
- State material assumptions. Investigate ordinary uncertainty first; ask the
  user only when the answer changes scope, behavior, risk, or required
  authority.
- Consider whether no change, existing project code, the standard library, the
  platform, or an installed dependency already solves the problem.

<!-- gidh-forge:start -->

## Gidh Forge sidecar

When `gidh-forge` is available, use its 4 core superpowers to accelerate context and refactoring safety:

- **`map`**: Start non-trivial unfamiliar tasks with `gidh-forge map` to see code ownership, package topology, and symbol outlines in minimal tokens.
- **`file <path>`**: Inspect a file with `gidh-forge file <path>` (macro outline + internal call graph) or `gidh-forge file <path> --focus <symbol>` (full target body + helper signatures) to understand code without reading 1,000s of lines.
- **`impact <symbol>`**: Before changing shared functions or methods, run `gidh-forge impact <symbol>` (or `impact --diff`) to evaluate blast radius and callers across the workspace.
- **`diff`**: Use `gidh-forge diff` to review semantic changes mapped directly to modified functions and classes.
- Rely on standard tools (`view_file`, `grep_search`, `replace_file_content`) and the project's real compiler/test runner (`go build`, `cargo check`, `npm test`, `pytest`) for inspection, edits, and verification.

If Gidh Forge is unavailable, use standard tools directly.
<!-- gidh-forge:end -->

## While coding

- Fix root causes, not only the reported symptom. Check sibling callers when
  changing shared behavior.
- Prefer deletion, reuse, and boring code over additions and abstractions.
- Touch only files and lines needed for the request. Do not refactor, reformat,
  or clean up unrelated code.
- Add no dependency, feature, configuration, or flexibility that was not
  requested.
- Match the established style of the code you change.
- If a deliberate simplification has a real ceiling, document it with a
  `ponytail:` comment that names the limit and the upgrade path.

## Before finishing

- Define what success means and run the smallest relevant verification.
- Leave a focused test or runnable check for non-trivial logic; trivial changes
  do not need ceremony.
- Report what changed, why it is the correct ownership point, and what was
  verified.

## Gidh Quant AI War Room Protocol

When the user asks to run Macro or Micro Brain sessions:
- Follow the operational commands in [WAR_ROOM_OPERATING_MANUAL.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/ai-docs/WAR_ROOM_OPERATING_MANUAL.md).
- Adhere to the autonomous LLM reasoning contracts in [BRAIN_PROTOCOL.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/ai-docs/BRAIN_PROTOCOL.md), [Macro Brain PROMPT.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/brains/macro_brain/PROMPT.md), and [Micro Brain PROMPT.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/brains/micro_brain/PROMPT.md).
- Enforce the 1.0% Fixed MAE stop loss and 2:1 R:R target standard.

