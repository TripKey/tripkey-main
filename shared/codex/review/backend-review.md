# TripKey Backend Review

## ⚠️ MD file modification policy
- Never modify this file or any `.md` file without explicit user permission.
- If a Markdown change is required, ask first using `[MD 수정 허락 요청]`.

## Use this when
- reviewing `apps/backend`,
- checking controller, service, schema, DTO, or validation changes,
- checking backend ↔ ai-engine contracts,
- checking frontend ↔ backend API contracts.

## Related review files
- If ai-engine contracts are involved, also read `ai-engine-review.md`.
- If frontend API usage is involved, also read `frontend-review.md`.
- If the task affects multiple layers or architecture, also read `core-review.md`.

## Backend invariants
- Backend is the public API gateway.
- Backend owns orchestration, validation, persistence coordination, and client-facing responses.
- Backend coordinates the ai-engine.
- Preserve backend route assumptions under `/v1/*`.
- Preserve flow-centered domains:
  `/trips`, `/groups`, `/schedule`, `/verify`, `/confirm`.
- `ai-engine` must be called through internal-only wiring.

## Review checklist
- Were request or response shapes changed?
- Were status codes or error codes changed?
- Were schema/DTO changes propagated to all callers?
- Was polling or async behavior accidentally changed?
- Was fallback handling removed, hidden, or weakened?
- Did backend logic leak into frontend or ai-engine?
- Did trip/session assumptions change?
- Did public API behavior change without SSOT or API sign-off?

## Output format
```text
[Backend Review 결과]
검토 파일:

blocking:

risky:

note:

후속 체크 제안:
```
