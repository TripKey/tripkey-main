# TripKey AI Engine Review

## ⚠️ MD file modification policy
- Never modify this file or any `.md` file without explicit user permission.
- If a Markdown change is required, ask first using `[MD 수정 허락 요청]`.

## Use this when
- reviewing `apps/ai-engine`,
- checking schemas, fallback logic, or internal route behavior,
- checking backend ↔ ai-engine compatibility.

## Related review files
- If backend contracts are involved, also read `backend-review.md`.
- If the task affects multiple layers or full flow, also read `core-review.md`.

## AI engine invariants
- `ai-engine` is internal-only and must not be publicly exposed.
- `ai-engine` must not become a browser-facing API.
- `ai-engine` must not own product orchestration or session policy.
- Backend-facing contracts must remain stable unless explicitly approved.
- Where fallback exists, preserve deterministic degraded behavior.

## Review checklist
- Did backend-facing schemas change?
- Did internal route semantics change?
- Did fallback behavior change or disappear?
- Did ai-engine begin owning workflow or business decisions that belong in backend?
- Does any change imply public exposure?
- Did config or env assumptions drift from backend or compose wiring?

## Output format
```text
[AI Engine Review 결과]
검토 파일:

blocking:

risky:

note:

후속 체크 제안:
```
