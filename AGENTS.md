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

## Gidh Forge Sidecar & AST Weapons (MANDATORY)

DO NOT read or dump entire multi-thousand line files with raw tools when inspecting unfamiliar code. Always use `gidh-forge` to conserve context and pinpoint AST nodes:

- **Topology & Discovery**: Run `gidh-forge map` or `gidh-forge map <path>` (e.g. `gidh-forge map --agent`) to inspect package structure, symbol outlines, and modified boundaries in minimal tokens (<300 tokens).
- **Targeted Inspection**: Use `gidh-forge file <path> --macro` for skeletons/types, or `gidh-forge file <path> --focus <symbol>` to view only the target function body and helper signatures instead of reading entire files.
- **Blast Radius & Impact**: ALWAYS run `gidh-forge impact <symbol>` or `gidh-forge impact --diff` before modifying shared functions, hooks, state stores, or types to evaluate all upstream/downstream callers across Go, TypeScript, Python, and SQL.
- **Semantic Diff Review**: Run `gidh-forge diff` to verify changes mapped directly to modified functions and classes.
- For in-depth CLI usage and options, refer to [docs/GIDH_FORGE.md](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/docs/GIDH_FORGE.md).
- Only fall back to standard tools (`view_file`, `replace_file_content`) for surgical line-level edits once the target AST node has been identified.
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

