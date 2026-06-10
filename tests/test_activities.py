"""
Tests for the High School Management System API using AAA pattern.
"""

import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset in-memory activities to known state before each test."""
    # Arrange: Set up clean state
    activities.clear()
    activities.update({
        "Chess Club": {
            "description": "Learn strategies and compete in chess tournaments",
            "schedule": "Fridays, 3:30 PM - 5:00 PM",
            "max_participants": 12,
            "participants": ["michael@mergington.edu"]
        },
        "Programming Class": {
            "description": "Learn programming fundamentals and build software projects",
            "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
            "max_participants": 20,
            "participants": []
        }
    })
    yield
    # Cleanup after test
    activities.clear()


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)


class TestGetActivities:
    """Test suite for retrieving activities."""

    def test_get_all_activities(self, client):
        # Arrange: No additional setup needed (fixture handles it)
        # Act: Make GET request to /activities
        response = client.get("/activities")
        # Assert: Verify response
        assert response.status_code == 200
        assert "Chess Club" in response.json()
        assert "Programming Class" in response.json()
        assert len(response.json()) == 2

    def test_get_activities_returns_correct_structure(self, client):
        # Arrange: Ready via fixture
        # Act: Get activities
        response = client.get("/activities")
        # Assert: Verify structure
        activities_data = response.json()
        chess_club = activities_data["Chess Club"]
        assert "description" in chess_club
        assert "schedule" in chess_club
        assert "max_participants" in chess_club
        assert "participants" in chess_club


class TestSignupForActivity:
    """Test suite for signing up for activities."""

    def test_signup_for_activity_success(self, client):
        # Arrange: Activity exists, email not signed up
        activity_name = "Chess Club"
        email = "newstudent@mergington.edu"
        # Act: Sign up for activity
        response = client.post(
            f"/activities/{activity_name}/signup",
            params={"email": email}
        )
        # Assert: Verify successful signup
        assert response.status_code == 200
        assert email in response.json()["message"]
        assert email in activities[activity_name]["participants"]

    def test_signup_nonexistent_activity(self, client):
        # Arrange: Activity does not exist
        activity_name = "Nonexistent Club"
        email = "student@mergington.edu"
        # Act: Attempt to sign up
        response = client.post(
            f"/activities/{activity_name}/signup",
            params={"email": email}
        )
        # Assert: Verify error
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]

    def test_signup_duplicate_email(self, client):
        # Arrange: Email already signed up for activity
        activity_name = "Chess Club"
        email = "michael@mergington.edu"  # Already in participants
        # Act: Attempt duplicate signup
        response = client.post(
            f"/activities/{activity_name}/signup",
            params={"email": email}
        )
        # Assert: Verify duplicate prevented
        assert response.status_code == 400
        assert "already signed up" in response.json()["detail"]


class TestUnregisterParticipant:
    """Test suite for unregistering from activities."""

    def test_unregister_participant_success(self, client):
        # Arrange: Participant exists in activity
        activity_name = "Chess Club"
        email = "michael@mergington.edu"
        # Act: Unregister participant
        response = client.delete(
            f"/activities/{activity_name}/participants",
            params={"email": email}
        )
        # Assert: Verify successful unregistration
        assert response.status_code == 200
        assert email not in activities[activity_name]["participants"]

    def test_unregister_nonexistent_activity(self, client):
        # Arrange: Activity does not exist
        activity_name = "Nonexistent Club"
        email = "student@mergington.edu"
        # Act: Attempt to unregister
        response = client.delete(
            f"/activities/{activity_name}/participants",
            params={"email": email}
        )
        # Assert: Verify error
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]

    def test_unregister_nonexistent_participant(self, client):
        # Arrange: Participant not in activity
        activity_name = "Chess Club"
        email = "notreal@mergington.edu"
        # Act: Attempt to unregister
        response = client.delete(
            f"/activities/{activity_name}/participants",
            params={"email": email}
        )
        # Assert: Verify error
        assert response.status_code == 404
        assert "Participant not found" in response.json()["detail"]
