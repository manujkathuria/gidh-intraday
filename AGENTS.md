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

When `gidh-forge` is available, use it to reduce exploration context. It is an
optional sidecar: it never replaces this project contract or normal tools.

- Start a non-trivial unfamiliar task with `gidh-forge map` to see code
  ownership and filesystem context.
- Use `gidh-forge search "<hypothesis>"` when the implementation point is
  uncertain; then use `find`, `view`, or `get` for focused inspection instead
  of reading whole code files by default.
- Before changing a shared symbol, use `impact <symbol>` and, where supported,
  `trace <symbol>`. Treat unresolved or text-only results as leads, not proof.
- After changes, use `diff` to review semantic ownership and `check` for
  syntax. Use `check --strict` when Tree-Sitter coverage is required.
- `gidh-forge init` owns only `.gidh/`. Do not overwrite user-owned agent or
  editor instruction files outside this marked block.

If Gidh Forge is unavailable or does not support a language, use the project's
existing tools and state that limitation.
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
