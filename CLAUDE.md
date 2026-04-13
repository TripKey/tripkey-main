# TripKey Claude Code Rules

<<<<<<< docs/agent-rules
## Purpose
- This document defines the default working rules for agents operating in the TripKey repository.
- The goal is to protect core architecture and project documents without making routine coding work unnecessarily slow.

## ⚠️ MD file modification policy
- Never modify any `.md` file without explicit user permission.
- This applies to all Markdown files including `CLAUDE.md`, review docs, SSOT docs, prompt docs, and project documentation.
- If a Markdown change seems necessary, explain why and ask first in exactly this format:
=======
## ⚠️ MD file modification policy
- Never modify any `.md` file without explicit user permission.
- This applies to all Markdown files including `CLAUDE.md`, review docs, SSOT docs, prompt docs, and project documentation.
- Do not even propose Markdown edits unless the user explicitly asks for Markdown changes.
- If a Markdown change seems necessary, stop and ask first in exactly this format:
>>>>>>> develop

```text
[MD 수정 허락 요청]
파일: path/to/file.md
수정 내용:
수정 이유:
→ 수정해도 될까요?
```

## Language
- Always respond to the user in Korean.
- Write generated code, code comments, docstrings, commit messages, and in-file technical instructions in English.
- Do not translate code, identifiers, API field names, logs, error codes, or file paths.
- Preserve the existing language of a file unless the user explicitly asks to rewrite it.

<<<<<<< docs/agent-rules
## Default working style
- Default to solving the user’s task directly when the request clearly implies implementation.
- Ask before proceeding when the change affects Markdown documents, architecture, API contracts, policy, or other non-obvious cross-layer decisions.
- If the task is ambiguous, ask a short clarifying question or provide a short plan first.
=======
## Default working mode
- Default to analysis, planning, review, and change proposals.
- Do not edit files unless the user explicitly says one of:
  - `수정해`
  - `구현해`
  - `적용해`
  - `고쳐`
- If the task is ambiguous, ask short questions first or provide a short plan.
>>>>>>> develop

## Core behavior
- Act as both an implementer and a reviewer.
- Read the minimum relevant files before making changes.
- Start narrow. Prefer config, entrypoints, interfaces, schemas/DTOs, API clients, and direct call sites before broad exploration.
- Do not assume architecture, API behavior, or contracts without checking the repository.
- After implementation, review your own diff for regressions, edge cases, and contract mismatches.
- If architecture, API shape, or policy change is detected, mark it as:
  `[SSOT CHANGE CANDIDATE]`

## TripKey core invariants
- Preserve the service interaction model:
  - Browser-facing flows must go through backend.
  - DB-backed non-AI flows typically follow: `frontend -> backend -> database`
  - AI-dependent flows typically follow: `frontend -> backend -> ai-engine -> backend -> database`
  - frontend must never call ai-engine directly.
- Preserve browser-facing API usage through `/api/*`.
- Preserve backend app route prefix `/v1/*`.
- `ai-engine` is internal-only and must not be publicly exposed.
- Internal ai-engine address: `http://tripkey-ai-engine:8000`
- Preserve MVP session behavior: `trip_id` based, TTL 24h, no login.
- Preserve explicit fallback behavior for LLM- and Maps-dependent flows.
- Preserve flow-centered domains:
  `/trips`, `/groups`, `/schedule`, `/verify`, `/confirm`

## Repo reading policy
- Start narrow and expand only when repository evidence requires it.
- State which files confirmed the conclusion.
- For infra or runtime issues, inspect config and wiring first before changing app logic.
- For contract issues, inspect both sides of the contract before proposing changes.

## Cross-layer work
- If a task affects more than one layer, read all relevant review files before concluding.
- Even if the task looks single-layered, include adjacent layer review when the contract changes.

<<<<<<< docs/agent-rules
### Review doc location
- `shared/docs/agent/review/core-review.md`
- `shared/docs/agent/review/backend-review.md`
- `shared/docs/agent/review/frontend-review.md`
- `shared/docs/agent/review/ai-engine-review.md`

=======
>>>>>>> develop
### Common combinations
| Task type | Review files to read |
|-----------|----------------------|
| ai-engine ↔ backend integration | `backend-review.md` + `ai-engine-review.md` |
| frontend ↔ backend API | `frontend-review.md` + `backend-review.md` |
| full flow change | `core-review.md` + all affected layer reviews |
| infra/runtime wiring change | `core-review.md` + all affected layer reviews |

## SSOT change handling
- If a task changes architecture, API shape, or policy, do not implement immediately.
- Stop at plan/proposal stage and report exactly:

```text
[SSOT CHANGE CANDIDATE]
Type:
Proposed change:
Reason:
Affected areas:
```

## Completion criteria
A task is complete only when all applicable items are done:
1. the requested change is implemented,
2. relevant checks/tests are run when possible,
3. the diff is reviewed for side effects,
4. assumptions and risks are reported.
<<<<<<< docs/agent-rules
=======

## Review doc location
- `shared/docs/agent/review/core-review.md`
- `shared/docs/agent/review/backend-review.md`
- `shared/docs/agent/review/frontend-review.md`
- `shared/docs/agent/review/ai-engine-review.md`

## Output format

### When not editing
1. Files checked
2. Findings
3. Proposed changes
4. Risks / assumptions
5. SSOT change candidates (if any)

### When editing after explicit approval
1. Changed files
2. What changed
3. Checks run
4. Risks / assumptions
5. Follow-up review notes
>>>>>>> develop
