# TripKey Core Review

## ⚠️ MD file modification policy
- Never modify this file or any `.md` file without explicit user permission.
- If a Markdown change is required, ask first using `[MD 수정 허락 요청]`.

## Use this when
- reviewing changes across multiple layers,
- checking architecture drift,
- checking API or policy drift,
- reviewing the whole branch or full flow.

## Related review files
- If backend contracts are involved, also read `backend-review.md`.
- If frontend API usage is involved, also read `frontend-review.md`.
- If ai-engine contracts or fallbacks are involved, also read `ai-engine-review.md`.

## Severity
- `blocking`: must fix before merge.
- `risky`: should usually fix.
- `note`: worth recording.

## Review checklist

### 1. Architecture
- Does the change preserve:
  `frontend -> backend -> ai-engine -> database`
- Has any responsibility moved to the wrong layer?
- Does any client-facing behavior bypass the backend?
- Does any change imply public exposure of an internal service?

### 2. Cross-layer contracts
- Are ai-engine ↔ backend schemas consistent on both sides?
- Are frontend ↔ backend request paths, response shapes, and error assumptions consistent?
- Did the change affect adjacent layers without reviewing them?

### 3. API / policy
- Did architecture, API shape, or policy change?
- If yes, was it reported as `[SSOT CHANGE CANDIDATE]`?
- Did shared naming or cross-service contracts drift?

### 4. Shared runtime behavior
- Are fallback behaviors still explicit?
- Is uncertainty still surfaced instead of hidden?
- Is the session flow still coherent with `trip_id`-based MVP behavior?

## Output format
```text
[Core Review 결과]
검토 파일:

blocking:

risky:

note:

SSOT 변경 후보:
```
