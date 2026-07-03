"""Integration tests for resume copy and master-promotion endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")

@pytest.mark.asyncio
class TestCreateFromMaster:
    """POST /api/v1/resumes/create-from-master"""

    async def test_create_from_master_success_no_job(self, isolated_db, client, sample_resume):
        # 1. Create a master resume in isolated database
        master = await isolated_db.create_resume(
            content="",
            content_type="json",
            filename="master_resume.json",
            is_master=True,
            processed_data=sample_resume,
            processing_status="ready",
            title="My Master Resume"
        )
        master_id = master["resume_id"]

        # 2. Call endpoint
        async with client:
            resp = await client.post(
                "/api/v1/resumes/create-from-master",
                json={"source_resume_id": master_id}
            )

        # 3. Assertions
        assert resp.status_code == 200
        data = resp.json()
        assert "resume_id" in data
        assert data["processing_status"] == "ready"
        assert "Tailored" in data["title"]

        # Verify record in DB
        new_resume_id = data["resume_id"]
        new_resume = await isolated_db.get_resume(new_resume_id)
        assert new_resume is not None
        assert new_resume["parent_id"] == master_id
        assert new_resume["is_master"] is False
        assert new_resume["cover_letter"] == ""
        assert new_resume["outreach_message"] == ""
        assert new_resume["processed_data"]["personalInfo"]["name"] == sample_resume["personalInfo"]["name"]

    async def test_create_from_master_success_with_job(self, isolated_db, client, sample_resume):
        # 1. Create master resume
        master = await isolated_db.create_resume(
            content="",
            content_type="json",
            filename="master_resume.json",
            is_master=True,
            processed_data=sample_resume,
            processing_status="ready",
            title="My Master Resume"
        )
        master_id = master["resume_id"]

        # 2. Call endpoint with job description (LLM not configured)
        async with client:
            resp = await client.post(
                "/api/v1/resumes/create-from-master",
                json={
                    "source_resume_id": master_id,
                    "job_description": "We are looking for a Software Engineer at Google. Need Python and FastAPI skills."
                }
            )

        # 3. Assertions
        assert resp.status_code == 200
        data = resp.json()
        new_resume_id = data["resume_id"]

        # Verify application tracker card created in DB
        apps = await isolated_db.list_applications()
        assert len(apps) == 1
        app_card = apps[0]
        assert app_card["resume_id"] == new_resume_id
        assert app_card["master_resume_id"] == master_id
        assert app_card["company"] == "Unknown Company"
        assert app_card["role"] == "Manual Edit Role"
        assert app_card["status"] == "applied"

        # Verify cover letter/outreach are empty strings (since LLM not configured)
        new_resume = await isolated_db.get_resume(new_resume_id)
        assert new_resume["cover_letter"] == ""
        assert new_resume["outreach_message"] == ""

    async def test_create_from_master_allows_non_master_source(self, isolated_db, client, sample_resume):
        source_resume = await isolated_db.create_resume(
            content="",
            content_type="json",
            is_master=False,
            processed_data=sample_resume,
            processing_status="ready"
        )

        async with client:
            resp = await client.post(
                "/api/v1/resumes/create-from-master",
                json={"source_resume_id": source_resume["resume_id"]}
            )

        assert resp.status_code == 200
        created = await isolated_db.get_resume(resp.json()["resume_id"])
        assert created is not None
        assert created["parent_id"] == source_resume["resume_id"]

    async def test_create_from_master_not_ready_returns_400(self, isolated_db, client, sample_resume):
        source_resume = await isolated_db.create_resume(
            content="",
            content_type="json",
            is_master=False,
            processed_data=sample_resume,
            processing_status="processing"
        )

        async with client:
            resp = await client.post(
                "/api/v1/resumes/create-from-master",
                json={"source_resume_id": source_resume["resume_id"]}
            )

        assert resp.status_code == 400
        assert "ready status" in resp.json()["detail"]

    async def test_create_from_master_missing_data_returns_422(self, isolated_db, client):
        source_resume = await isolated_db.create_resume(
            content="",
            content_type="md",
            is_master=False,
            processed_data=None,
            processing_status="ready"
        )

        async with client:
            resp = await client.post(
                "/api/v1/resumes/create-from-master",
                json={"source_resume_id": source_resume["resume_id"]}
            )

        assert resp.status_code == 422
        assert "Processed data is missing" in resp.json()["detail"]

    async def test_set_master_resume_promotes_selected_resume(self, isolated_db, client, sample_resume):
        current_master = await isolated_db.create_resume(
            content="",
            content_type="json",
            is_master=True,
            processed_data=sample_resume,
            processing_status="ready",
        )
        target = await isolated_db.create_resume(
            content="",
            content_type="json",
            is_master=False,
            processed_data=sample_resume,
            processing_status="ready",
        )

        async with client:
            resp = await client.post(f"/api/v1/resumes/{target['resume_id']}/set-master")

        assert resp.status_code == 200
        assert resp.json()["resume_id"] == target["resume_id"]
        assert resp.json()["is_master"] is True

        refreshed_master = await isolated_db.get_resume(current_master["resume_id"])
        refreshed_target = await isolated_db.get_resume(target["resume_id"])
        assert refreshed_master["is_master"] is False
        assert refreshed_target["is_master"] is True
