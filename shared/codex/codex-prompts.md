# TripKey Codex Prompt Set

> Use these prompts in VS Code Codex.
> Use `@path/to/file` tags so Codex reads only the required files.

---

## Common rules for all prompts
- Do not modify any `.md` files without explicit permission.
- Default mode is analysis, planning, review, and proposals.
- Do not edit files until the user explicitly says: `수정해`, `구현해`, `적용해`, or `고쳐`.
- Always respond in Korean.
- Do not translate code, identifiers, API field names, logs, error codes, or file paths.

---

## 1. Plan first

```text
Read @AGENTS.md first.
Do not modify any .md files without explicit permission.
Do not edit anything.

First:
- inspect only the minimum relevant files,
- explain what files you chose and why,
- propose a short implementation plan,
- list risks / assumptions,
- report any [SSOT CHANGE CANDIDATE] if architecture, API shape, or policy would change.
```

---

## 2. Proposal only

```text
Read @AGENTS.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Analyze the issue and return:
1. Files checked
2. Root cause
3. Proposed changes
4. Risks / assumptions
5. [SSOT CHANGE CANDIDATE] if needed
```

---

## 3. Edit after approval

```text
Read @AGENTS.md first.
Do not modify any .md files without explicit permission.

You are now approved to edit files for this task.
Keep the diff minimal.

After editing, return:
1. Changed files
2. What changed
3. Checks run
4. Risks / assumptions
5. Follow-up review notes
```

---

## 4. Backend review

```text
Read @AGENTS.md and @shared/docs/codex/review/backend-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review the current backend-related changes only.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. Suggested follow-up checks
```

---

## 5. Frontend review

```text
Read @AGENTS.md and @shared/docs/codex/review/frontend-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review the current frontend-related changes only.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. Suggested follow-up checks
```

---

## 6. AI engine review

```text
Read @AGENTS.md and @shared/docs/codex/review/ai-engine-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review the current ai-engine-related changes only.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. Suggested follow-up checks
```

---

## 7. Cross-layer review — ai-engine ↔ backend

```text
Read @AGENTS.md,
@shared/docs/codex/review/backend-review.md,
@shared/docs/codex/review/ai-engine-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review changes that affect the ai-engine <-> backend contract.
Check both sides for schema, route, and fallback consistency.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. [SSOT CHANGE CANDIDATE] if contract changed
```

---

## 8. Cross-layer review — frontend ↔ backend API

```text
Read @AGENTS.md,
@shared/docs/codex/review/frontend-review.md,
@shared/docs/codex/review/backend-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review changes that affect the frontend <-> backend API contract.
Check request paths, response shapes, and error handling on both sides.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. [SSOT CHANGE CANDIDATE] if API contract changed
```

---

## 9. Full review

```text
Read @AGENTS.md,
@shared/docs/codex/review/core-review.md,
@shared/docs/codex/review/backend-review.md,
@shared/docs/codex/review/frontend-review.md,
@shared/docs/codex/review/ai-engine-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Review the current branch across the whole repo.

Return:
1. Blocking findings
2. Risky findings
3. Notes
4. Files reviewed
5. [SSOT CHANGE CANDIDATE] if architecture, API shape, or policy drift is found
```

---

## 10. Check SSOT drift only

```text
Read @AGENTS.md and @shared/docs/codex/review/core-review.md first.
Do not modify any .md files without explicit permission.
Do not edit files.

Check only for drift in:
- architecture
- API shape
- policy

Ignore implementation details unless they prove one of the above changed.

Return:
1. Confirmed drift
2. Files reviewed
3. Why it is drift
4. [SSOT CHANGE CANDIDATE]
```

---

## 11. Two-step workflow

**Step 1 — plan only**
```text
Read @AGENTS.md first.
Do not modify any .md files without explicit permission.
Do not edit anything. Analyze and propose the minimum changes only.
```

**Step 2 — edit after approval**
```text
Approved. Apply the proposed changes with a minimal diff.
Do not modify any .md files without explicit permission.
```

---

## 12. Review and implement in one run

```text
Read @AGENTS.md first.
Do not modify any .md files without explicit permission.

Task:
[여기에 작업 내용 입력]

Context:
Check only the files needed first.

Constraints:
- Do not change architecture or API shape silently.
- If you find an SSOT-level mismatch, mark it as [SSOT CHANGE CANDIDATE].
- Do not modify any .md files without explicit permission.

Done when:
- the issue is fixed,
- relevant checks are run if available,
- your own diff is reviewed,
- confirmed risks and assumptions are listed.
```
