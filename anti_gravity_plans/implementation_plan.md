# Implementation Plan - Manual Edit Resume Creation Path

This plan introduces a new **Manual Edit** path for creating tailored resumes from the Master Resume, alongside the existing **AI Tailor** path. 
Choosing the **Manual Edit** path copies the Master Resume's structured data to a new tailored resume and immediately redirects the user to the builder for manual edits, entirely bypassing LLM generation.

---

## User Review Required

> [!IMPORTANT]
> - **Zero LLM Dependency**: The Manual Edit button is enabled even if no LLM API key is configured, as long as a Master Resume exists and its processing status is `ready`.
> - **Deep Copy Validation**: On the backend, we load the Master Resume's structured data (`processed_data`), deep-copy it, normalize it, run validation against the `ResumeData` Pydantic model, and save it as a new resume. If the master resume does not have valid structured JSON data (e.g. legacy unstructured upload), a `422 Unprocessable Entity` is returned.
> - **Derived Title Strategy**: The title of the manually created resume will be derived from the master's title (e.g., `"Master Resume"` -> `"Tailored Resume"`, or `"{name} Tailored Resume"`), or fall back to `"Tailored Resume"`.
> - **No JD/Tracker Interaction**: Unlike the AI Tailor path, the manual edit path does not require or create a job description, an Application Tracker card, or Cover Letter/Outreach Message records at creation time.

---

## Open Questions

None. The specifications provided in the original plan are precise and fully cover the requirements.

---

## Proposed Changes

### Backend Components

---

#### [MODIFY] [models.py](file:///Users/haolong/Documents/Resume-Matcher/apps/backend/app/schemas/models.py)
- Define `CreateFromMasterRequest` schema:
  ```python
  class CreateFromMasterRequest(BaseModel):
      master_resume_id: str
  ```
- Define `CreateFromMasterResponse` schema:
  ```python
  class CreateFromMasterResponse(BaseModel):
      resume_id: str
      title: str
      processing_status: str
  ```

#### [MODIFY] [__init__.py](file:///Users/haolong/Documents/Resume-Matcher/apps/backend/app/schemas/__init__.py)
- Export `CreateFromMasterRequest` and `CreateFromMasterResponse` from `app.schemas.models` and add them to `__all__`.

#### [MODIFY] [resumes.py](file:///Users/haolong/Documents/Resume-Matcher/apps/backend/app/routers/resumes.py)
- Import `CreateFromMasterRequest` and `CreateFromMasterResponse` from `app.schemas`.
- Add a new endpoint `POST /resumes/create-from-master` that:
  1. Retrieves the master resume and asserts it exists, `is_master=True`, and `processing_status="ready"`.
  2. Extracts the `processed_data` dictionary. If missing, attempts to parse `content` as JSON. If that fails, raises a `422 HTTP exception`.
  3. Deep-copies the data, normalizes it using `normalize_resume_data(data)`, and validates it with `ResumeData.model_validate(data)`.
  4. Generates a derived title:
     - If the master title contains `"Master"`, replace it with `"Tailored"` (e.g., `"John Doe's Master Resume"` -> `"John Doe's Tailored Resume"`).
     - Else if personal info name is present, use `"{name} Tailored Resume"`.
     - Otherwise fall back to `"Tailored Resume"`.
  5. Saves the new resume record via `db.create_resume` with `is_master=False`, `parent_id=master_resume_id`, `content_type="json"`, `processing_status="ready"`, and the serialized JSON content.
  6. Returns `CreateFromMasterResponse`.

#### [NEW] [test_create_from_master.py](file:///Users/haolong/Documents/Resume-Matcher/apps/backend/tests/integration/test_create_from_master.py)
- Add integration tests for the new endpoint:
  - Successful creation (verifying parent ID, deep-copied data, matching content structure, and non-identity reference).
  - Validation failure when the resume is not a master or is not ready.
  - Validation failure when `processed_data` is empty or invalid.

---

### Frontend Components

---

#### [MODIFY] [resume.ts](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/lib/api/resume.ts)
- Expose a new function:
  ```typescript
  export async function createResumeFromMaster(masterResumeId: string): Promise<{ resume_id: string }> {
    const res = await apiPost('/resumes/create-from-master', { master_resume_id: masterResumeId });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to create resume from master (status ${res.status}): ${text}`);
    }
    return res.json();
  }
  ```

#### [NEW] [create-resume-choice-dialog.tsx](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/components/dashboard/create-resume-choice-dialog.tsx)
- Create a dual-choice dialog component (similar layout to `MasterResumeChoiceDialog` but utilizing Swiss-style styles).
- Choices:
  - **AI Tailor**: Navigates to `/tailor`. Disabled if LLM is not configured (with a tooltip or info banner indicating why).
  - **Manual Edit**: Calls the manual edit action. Shows loading spinner during request.
- Exposes `open`, `onOpenChange`, `onChooseAiTailor`, `onChooseManualEdit`, and `isLlmConfigured` as props.

#### [MODIFY] [page.tsx](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/app/(default)/dashboard/page.tsx)
- Split the enable conditions:
  - `canCreateResume = Boolean(masterResumeId) && processingStatus === 'ready'`
  - `isAiTailorAvailable = canCreateResume && isLlmConfigured`
- Update the Create Resume (+) button:
  - `disabled={!canCreateResume}` (was previously `!isTailorEnabled`, which required `isLlmConfigured`).
  - `onClick` opens `CreateResumeChoiceDialog`.
- Incorporate `CreateResumeChoiceDialog` and wire its handlers:
  - AI Tailor -> route to `/tailor`.
  - Manual Edit -> trigger `createResumeFromMaster`, update UI cache using `incrementResumes()`, and redirect to `/builder?id=...`. Show toast/dialog errors if it fails.

#### [MODIFY] Locale JSON Files
Modify the following files:
- [en.json](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/messages/en.json)
- [es.json](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/messages/es.json)
- [zh.json](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/messages/zh.json)
- [ja.json](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/messages/ja.json)
- [pt-BR.json](file:///Users/haolong/Documents/Resume-Matcher/apps/frontend/messages/pt-BR.json)

Add translation entries under `createResume.entry` (aligned with `resumeWizard.entry`):
```json
"createResume": {
  "entry": {
    "kicker": "...",
    "title": "...",
    "description": "...",
    "aiTailor": {
      "kicker": "...",
      "title": "...",
      "description": "...",
      "action": "...",
      "disabledHint": "..."
    },
    "manualEdit": {
      "kicker": "...",
      "title": "...",
      "description": "...",
      "action": "...",
      "creating": "...",
      "error": "..."
    }
  }
}
```

---

### Documentation

---

#### [MODIFY] [frontend-workflow.md](file:///Users/haolong/Documents/Resume-Matcher/docs/agent/architecture/frontend-workflow.md)
- Update Dashboard entry section to document the dual choice path (AI Tailor vs Manual Edit) on clicking `+`.

#### [MODIFY] [front-end-apis.md](file:///Users/haolong/Documents/Resume-Matcher/docs/agent/apis/front-end-apis.md)
- Add documentation for `createResumeFromMaster` frontend API and its corresponding backend endpoint `POST /api/v1/resumes/create-from-master`.

---

## Verification Plan

### Automated Tests
1. **Backend Integration Tests**:
   - Run the new test module:
     ```bash
     pytest apps/backend/tests/integration/test_create_from_master.py
     ```
   - Ensure all other backend tests pass successfully.

2. **Frontend Lints and Types**:
   - Verify that there are no syntax/type mismatch errors that would block next build:
     ```bash
     npm run build --prefix apps/frontend
     ```

### Manual Verification
1. Navigate to the dashboard with no master resume; verify the `Create Resume (+)` button is not active or hidden.
2. Upload a master resume.
3. If no LLM key is configured:
   - Ensure `Create Resume (+)` button is **enabled**.
   - Click `+`, select `Manual Edit`, verify redirection to `/builder?id=<new_id>` with deep-copied data, and verify dashboard list updates.
   - Verify that `AI Tailor` in the dialog is disabled and displays the LLM not configured prompt.
4. If an LLM key is configured:
   - Verify that `AI Tailor` in the dialog is enabled and redirects to `/tailor` when clicked.
