"""Sprint 05 — questionnaire: selection, the ≤5 cap, filler identity, urgency.

The invariant under test throughout: an ANSWER may raise urgency and add
context, but it can never change what the model said. The analysis row is
asserted untouched in the urgency test for exactly that reason.
"""
from conftest import (
    PENYULUH_PROFILE_ID,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    bearer_headers,
    seed_analysis,
    seed_case,
    seed_question,
)
from models.siaga_triage import MAX_QUESTIONS, select_questions

PETANI = bearer_headers(PETANI_USER_ID)
PENYULUH = bearer_headers(PENYULUH_USER_ID)

CASE_ID = "case-quest-1"
ANALYSIS_ID = "analysis-quest-1"


def seed_bank(repo):
    """Mirrors the shape of the 0013 seed: general + disease-specific + a draft."""
    seed_question(
        repo, "qb-sebar", "QST-SEBAR-01", "Apakah bercak menyebar?",
        urgency_rules={"ya": 2}, ordinal=10,
    )
    seed_question(
        repo, "qb-luas", "QST-LUAS-01", "Apakah lebih dari seperempat petak?",
        urgency_rules={"ya": 2}, ordinal=20,
    )
    seed_question(
        repo, "qb-tetangga", "QST-TETANGGA-01", "Apakah petak tetangga serupa?",
        urgency_rules={"ya": 1}, ordinal=30,
    )
    seed_question(
        repo, "qb-hujan", "QST-HUJAN-01", "Apakah sering hujan?",
        trigger_rules={"diseases": ["blas_daun", "hawar_daun_bakteri"]},
        urgency_rules={"ya": 1}, ordinal=40,
    )
    seed_question(
        repo, "qb-pupuk", "QST-PUPUK-01", "Apakah baru dipupuk nitrogen?",
        trigger_rules={"diseases": ["blas_daun"]}, ordinal=50,
    )
    seed_question(
        repo, "qb-leher", "QST-LEHER-01", "Apakah malai mengering di pangkal?",
        trigger_rules={
            "diseases": ["blas_daun"],
            "phases": ["REPRODUCTIVE", "RIPENING"],
        },
        urgency_rules={"ya": 3}, ordinal=60,
    )
    seed_question(
        repo, "qb-bulat", "QST-BULAT-01", "Apakah bercak bulat cokelat?",
        trigger_rules={"diseases": ["bercak_coklat"]}, ordinal=90,
    )
    seed_question(
        repo, "qb-draft", "QST-DRAFT-01", "Pertanyaan yang belum disetujui.",
        ordinal=5, approved=False,
    )


def seed_answerable_case(repo, growth_stage="VEGETATIVE", abstain_status="yakin"):
    """A case at NEEDS_CONTEXT with a frozen analysis and a seeded bank."""
    case = seed_case(
        repo, CASE_ID, PETANI_PROFILE_ID, status="NEEDS_CONTEXT",
        area_kecamatan="Ciparay", growth_stage=growth_stage,
    )
    seed_analysis(repo, ANALYSIS_ID, CASE_ID, abstain_status=abstain_status)
    seed_bank(repo)
    return case


# ---- pure selection ------------------------------------------------------------


def test_selection_is_capped_at_five():
    # Arrange
    questions = [
        {
            "id": f"q{index}",
            "code": f"Q{index}",
            "approved": True,
            "trigger_rules": {},
            "ordinal": index,
        }
        for index in range(10)
    ]

    # Act
    selected = select_questions(questions, ["blas_daun"], "VEGETATIVE")

    # Assert
    assert len(selected) == MAX_QUESTIONS


def test_selection_is_deterministic():
    # Arrange
    questions = [
        {"id": "a", "code": "A", "approved": True, "trigger_rules": {}, "ordinal": 2},
        {"id": "b", "code": "B", "approved": True, "trigger_rules": {}, "ordinal": 1},
    ]

    # Act
    first = select_questions(questions, ["blas_daun"], "VEGETATIVE")
    second = select_questions(list(reversed(questions)), ["blas_daun"], "VEGETATIVE")

    # Assert
    assert [row["id"] for row in first] == [row["id"] for row in second] == ["b", "a"]


def test_unapproved_questions_are_never_selected():
    # Arrange
    questions = [
        {
            "id": "draft",
            "code": "D",
            "approved": False,
            "trigger_rules": {},
            "ordinal": 1,
        }
    ]

    # Act
    selected = select_questions(questions, ["blas_daun"], "VEGETATIVE")

    # Assert
    assert selected == []


# ---- endpoint ------------------------------------------------------------------


def test_blas_case_at_vegetative_gets_the_expected_questions(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act
    data = client.get(f"/cases/{CASE_ID}/questions", headers=PETANI).json()["data"]

    # Assert — disease-specific first, then general, capped at 5
    codes = [item["code"] for item in data["questions"]]
    assert codes == [
        "QST-HUJAN-01",
        "QST-PUPUK-01",
        "QST-SEBAR-01",
        "QST-LUAS-01",
        "QST-TETANGGA-01",
    ]
    assert data["totalCount"] == MAX_QUESTIONS
    assert data["answeredCount"] == 0
    assert all(item["whyAsked"] for item in data["questions"])


def test_phase_rule_admits_the_neck_blast_question(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo, growth_stage="REPRODUCTIVE")

    # Act
    data = client.get(f"/cases/{CASE_ID}/questions", headers=PETANI).json()["data"]

    # Assert
    assert "QST-LEHER-01" in [item["code"] for item in data["questions"]]


def test_bercak_specific_question_is_not_asked_for_a_blas_case(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act
    data = client.get(f"/cases/{CASE_ID}/questions", headers=PETANI).json()["data"]

    # Assert
    assert "QST-BULAT-01" not in [item["code"] for item in data["questions"]]


def test_abstain_case_still_receives_questions(client, triage_repo):
    # Arrange — the model gave no label at all
    seed_case(
        triage_repo, CASE_ID, PETANI_PROFILE_ID, status="NEEDS_CONTEXT",
        area_kecamatan="Ciparay",
    )
    row = seed_analysis(
        triage_repo, ANALYSIS_ID, CASE_ID, abstain_status="tidak_yakin"
    )
    triage_repo.analyses[ANALYSIS_ID] = {**row, "candidates": []}
    seed_bank(triage_repo)

    # Act
    data = client.get(f"/cases/{CASE_ID}/questions", headers=PETANI).json()["data"]

    # Assert — general questions remain, which is the context the reviewer needs
    assert data["totalCount"] > 0
    assert "QST-SEBAR-01" in [item["code"] for item in data["questions"]]


def test_answers_are_recorded_and_the_case_moves_on(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act
    response = client.post(
        f"/cases/{CASE_ID}/answers",
        json={
            "answers": [
                {"questionId": "qb-hujan", "answer": "ya"},
                {"questionId": "qb-sebar", "answer": "tidak_tahu"},
            ]
        },
        headers=PETANI,
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["data"]["answeredCount"] == 2
    assert triage_repo.cases[CASE_ID]["status"] == "GENERATING_RECOMMENDATION"


def test_partial_answers_are_allowed(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act — one of five, the rest left unanswered on purpose
    data = client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-luas", "answer": "tidak"}]},
        headers=PETANI,
    ).json()["data"]

    # Assert
    assert data["answeredCount"] == 1
    assert data["totalCount"] == MAX_QUESTIONS


def test_re_answering_updates_rather_than_duplicates(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)
    client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-luas", "answer": "tidak"}]},
        headers=PETANI,
    )

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-luas", "answer": "ya"}]},
        headers=PETANI,
    ).json()["data"]

    # Assert
    assert len(triage_repo.list_answers(CASE_ID)) == 1
    answered = {item["code"]: item["answer"] for item in data["questions"]}
    assert answered["QST-LUAS-01"] == "ya"


def test_risky_combination_flags_urgency_without_touching_the_label(
    client, triage_repo
):
    # Arrange
    seed_answerable_case(triage_repo)
    before = dict(triage_repo.analyses[ANALYSIS_ID])

    # Act — sebar(2) + luas(2) = 4, past the threshold of 3
    client.post(
        f"/cases/{CASE_ID}/answers",
        json={
            "answers": [
                {"questionId": "qb-sebar", "answer": "ya"},
                {"questionId": "qb-luas", "answer": "ya"},
            ]
        },
        headers=PETANI,
    )

    # Assert
    assert triage_repo.cases[CASE_ID]["urgency_flag"] is True
    assert triage_repo.analyses[ANALYSIS_ID] == before, "analysis must be untouched"


def test_tidak_tahu_adds_no_urgency(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act
    client.post(
        f"/cases/{CASE_ID}/answers",
        json={
            "answers": [
                {"questionId": "qb-sebar", "answer": "tidak_tahu"},
                {"questionId": "qb-luas", "answer": "tidak_tahu"},
            ]
        },
        headers=PETANI,
    )

    # Assert
    assert triage_repo.cases[CASE_ID]["urgency_flag"] is False


def test_assisted_case_records_the_penyuluh_as_filler(client, triage_repo):
    # Arrange — owned by the petani, created (and answered) by the penyuluh
    seed_case(
        triage_repo, CASE_ID, PETANI_PROFILE_ID,
        created_by_profile_id=PENYULUH_PROFILE_ID, status="NEEDS_CONTEXT",
        area_kecamatan="Ciparay",
    )
    seed_analysis(triage_repo, ANALYSIS_ID, CASE_ID)
    seed_bank(triage_repo)

    # Act
    client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-sebar", "answer": "ya"}]},
        headers=PENYULUH,
    )

    # Assert
    stored = triage_repo.list_answers(CASE_ID)
    assert stored[0]["answered_by_profile_id"] == PENYULUH_PROFILE_ID


def test_invalid_answer_value_is_rejected(client, triage_repo):
    # Arrange
    seed_answerable_case(triage_repo)

    # Act
    response = client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-sebar", "answer": "mungkin"}]},
        headers=PETANI,
    )

    # Assert
    assert response.status_code == 400
    assert not triage_repo.list_answers(CASE_ID)


def test_question_outside_the_selected_set_is_rejected(client, triage_repo):
    # Arrange — qb-bulat is a bercak question; this is a blas case
    seed_answerable_case(triage_repo)

    # Act
    response = client.post(
        f"/cases/{CASE_ID}/answers",
        json={"answers": [{"questionId": "qb-bulat", "answer": "ya"}]},
        headers=PETANI,
    )

    # Assert
    assert response.status_code == 400


def test_questions_are_404_before_the_analysis_exists(client, triage_repo):
    # Arrange
    seed_case(
        triage_repo, CASE_ID, PETANI_PROFILE_ID, status="CAPTURED",
        area_kecamatan="Ciparay",
    )
    seed_bank(triage_repo)

    # Act
    response = client.get(f"/cases/{CASE_ID}/questions", headers=PETANI)

    # Assert
    assert response.status_code == 404
