# Gidh Forge CLI Reference

`gidh-forge` is the AI agent context precision and AST sidecar suite built for Gidh Intraday. It indexes source code into abstract syntax trees (AST) across Go, TypeScript, Python, and SQL, providing token-efficient repository topology, pinpoint structural call graphs, blast radius impact analysis, and semantic diffs.

---

## Commands Summary

| Command | Purpose | Typical Token Cost |
| :--- | :--- | :--- |
| `gidh-forge map` | Whole-codebase or subpath AST topology, packages, and symbol counts | ~50 - 350 tokens |
| `gidh-forge file <path>` | Macro skeleton, types, exported signatures, and internal call graph | ~100 - 300 tokens |
| `gidh-forge file <path> --focus <fn>` | Full body of target function/method + signatures of helpers | ~150 - 400 tokens |
| `gidh-forge impact <symbol>` | Upstream callers & downstream blast radius across entire workspace | ~100 - 300 tokens |
| `gidh-forge impact --diff` | Automatic blast radius evaluation of all symbols touched in git diff | ~150 - 450 tokens |
| `gidh-forge diff` | Semantic AST diff mapping changes to exact functions/classes | ~100 - 350 tokens |
| `gidh-forge init` | Initialize `.gidh/` sidecar and register agent instructions in `AGENTS.md` | N/A |

---

## Detailed Command Usage

### 1. `gidh-forge map`
Instant whole-codebase AST topology & statistics.

```bash
# Agent-optimized summary (languages, package symbol counts, dirty packages)
gidh-forge map --agent

# Scope map to a specific subfolder with custom depth
gidh-forge map web/src --depth 3

# Directory-only or file-only view
gidh-forge map --dirs-only
gidh-forge map web/src/features --files-only

# Structured JSON output for programmatic tools
gidh-forge map --json
```

**Common Flags:**
- `--agent`: Ultra-compact mode for LLM prompt context (<250 tokens).
- `--depth <N>`: Maximum directory tree depth (default: 2).
- `--max-symbols <N>`: Maximum total symbols displayed (0 for unlimited).
- `--json`: Output as raw JSON.
- `--no-stats`: Omit language percentage headers.

---

### 2. `gidh-forge file`
Connected file viewer that replaces raw multi-thousand line file dumps with AST skeletons or targeted functions.

```bash
# Macro outline: imports, structs/interfaces, functions, and internal call graph
gidh-forge file web/src/features/positions/PositionsTerminal.tsx --macro

# Focus on a specific symbol: renders target body + signatures of internal callees
gidh-forge file quant/brains/micro_brain/runner.py --focus run_micro_scan

# Output structured AST symbol table in JSON
gidh-forge file backend/server.go --json
```

**Common Flags:**
- `--macro`: Show skeleton, exported types, and function signatures.
- `--focus, -f <symbol>`: Print the complete body of `<symbol>` alongside signatures of caller/callee helpers.
- `--json`: Return structured AST node tree.

---

### 3. `gidh-forge impact`
Calculates upstream callers, downstream references, and blast radius before modifying shared logic.

```bash
# Check blast radius of a specific function, type, or hook across all packages
gidh-forge impact usePositionsData

# Check blast radius of all changes currently unstaged in git
gidh-forge impact --diff

# Check blast radius of staged git changes
gidh-forge impact --staged

# Check blast radius against a specific git commit
gidh-forge impact --commit HEAD~1
```

**Common Flags:**
- `--diff, -d`: Automatically detect all modified symbols from `git diff` and report cross-file impact.
- `--staged`: Target staged files only.
- `--commit, -c <ref>`: Compare against a specific commit hash or ref.
- `--json`: Output blast radius graph as JSON.

---

### 4. `gidh-forge diff`
Semantic AST-aware diff that explains git modifications by function, class, and method instead of raw line hunks.

```bash
# Semantic diff of current working tree
gidh-forge diff

# Semantic diff of staged changes
gidh-forge diff --staged

# Semantic diff against prior commit
gidh-forge diff --commit HEAD~1 --json
```

---

### 5. `gidh-forge init`
Initializes or refreshes the sidecar index inside `.gidh/` and ensures the agent guide block in `AGENTS.md` is present and up-to-date.

```bash
# Rebuild or initialize sidecar
gidh-forge init

# Update the prompt contract block inside AGENTS.md
gidh-forge init --add-agent-guide
```

---

## Agent Workflow Best Practices

1. **Orientation**: Run `gidh-forge map --agent` or `gidh-forge map <subdir>` to understand symbol density without burning tokens.
2. **Inspection**: Use `gidh-forge file <path> --macro` to view API contracts before editing. If modifying a specific routine, use `--focus <symbol>`.
3. **Safety Check**: Always run `gidh-forge impact <symbol>` before editing shared utility hooks, models, or core order dispatchers.
4. **Verification**: After editing, run `gidh-forge diff` to confirm that changes are strictly isolated to intended AST nodes.
