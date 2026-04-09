# TripKey Frontend Review

## ⚠️ MD file modification policy
- Never modify this file or any `.md` file without explicit user permission.
- If a Markdown change is required, ask first using `[MD 수정 허락 요청]`.

## Use this when
- reviewing `apps/frontend`,
- checking API client usage,
- checking user flow, screen behavior, or local state changes,
- checking frontend ↔ backend API contracts.

## Related review files
- If backend API contracts are involved, also read `backend-review.md`.
- If the task affects multiple layers or full flow, also read `core-review.md`.

## Frontend invariants
- Browser-facing requests must go through `/api/*` to the backend.
- Frontend must not call internal ai-engine URLs directly.
- Preserve user control over AI outputs.
- Preserve fallback and estimated-state messaging.
- Preserve `trip_id`-based session restoration behavior.

## Review checklist
- Did request paths change?
- Did frontend start depending on internal service URLs?
- Did response field assumptions drift from backend contracts?
- Did fallback badges or messages disappear?
- Did optimistic UI behavior break unexpectedly?
- Did refresh or revisit session restoration change?
- Did the UX become more auto-committing than intended?

## Output format
```text
[Frontend Review 결과]
검토 파일:

blocking:

risky:

note:

후속 체크 제안:
```
