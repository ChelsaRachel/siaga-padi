"""Sprint 05 — recommendation: evidence gate, safety checker, PII exclusion.

These are the tests that stand between a language model and a farmer. Most of
them assert a REFUSAL: no references → no AI call; a dosage → blocked; an
invented ref code → blocked; a dosage-bearing chunk → never narrated. The happy
path is here too, but it is the least important test in the file.
"""
import pytest
from conftest import (
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    FakeLlmClient,
    bearer_headers,
    seed_analysis,
    seed_case,
    seed_kb_chunk,
    seed_kb_source,
)
from models.siaga_triage import (
    ORIGIN_AI_ENGINE,
    ORIGIN_INSUFFICIENT_EVIDENCE,
    ORIGIN_RULE_FALLBACK,
)
from service.llm_provider import LlmProviderError
from service.safety_checker import (
    VIOLATION_FORBIDDEN_TERM,
    VIOLATION_MISSING_CITATION,
    VIOLATION_NOT_NARRATABLE,
    VIOLATION_UNKNOWN_REF,
    check_recommendation,
)

PETANI = bearer_headers(PETANI_USER_ID)
PENYULUH = bearer_headers(PENYULUH_USER_ID)

CASE_ID = "case-rec-1"
ANALYSIS_ID = "analysis-rec-1"

BLAS_REF = "RUJ-BLAS-004"
UMUM_REF = "RUJ-UMUM-001"
DOSAGE_REF = "RUJ-HDB-002"


def valid_payload(lakukan_ref=BLAS_REF):
    """A well-formed, citation-complete, dosage-free card."""
    return {
        "farmerView": {
            "indikasi": "Kemungkinan Blas Daun. Ini indikasi awal.",
            "lakukan": [
                {"text": "Kurangi genangan air di petak.", "refCodes": [lakukan_ref]}
            ],
            "pantau": [
                {
                    "text": "Amati daun muda setiap beberapa hari.",
                    "refCodes": [UMUM_REF],
                }
            ],
            "hindari": [],
            "eskalasi": "Hubungi penyuluh bila gejala meluas.",
        },
        "technicalView": {
            "ringkasan": "Kandidat teratas blas daun pada fase vegetatif.",
            "ketidakpastian": "Foto tunggal, gejala awal.",
            "kutipan": [
                {"text": "Varietas tahan blas dianjurkan.", "refCodes": [BLAS_REF]}
            ],
            "penanda": [],
        },
    }


def seed_index(kb_repo, with_dosage_chunk=False):
    """Two narratable approved chunks (the minimum), optionally a flagged one."""
    seed_kb_source(kb_repo, status="disetujui")
    seed_kb_chunk(
        kb_repo, "chk-blas", BLAS_REF,
        content="Gunakan varietas tahan blas daun dan atur pengairan berselang.",
        approval_status="disetujui", disease_tags=["blas_daun"],
        phase_tags=["vegetatif"], action_type="pencegahan",
    )
    seed_kb_chunk(
        kb_repo, "chk-umum", UMUM_REF,
        content="Lakukan pengamatan rutin pada tanaman setiap minggu.",
        approval_status="disetujui", action_type="pemantauan",
    )
    if with_dosage_chunk:
        seed_kb_chunk(
            kb_repo, "chk-dosis", DOSAGE_REF,
            content="Aplikasikan fungisida dengan dosis 2 ml/l air.",
            approval_status="disetujui", disease_tags=["blas_daun"],
            policy_flag="memuat_dosis",
        )


@pytest.fixture()
def compose(monkeypatch, triage_repo, kb_repo):
    """Rebuild the router's service with the fake KB index and a scripted LLM."""
    from router import recommendation as recommendation_router
    from service.kb_retrieval import KbRetrievalService
    from service.recommendation import RecommendationService

    def build(llm_client):
        monkeypatch.setattr(
            recommendation_router,
            "obj",
            RecommendationService(
                repo=triage_repo,
                retrieval=KbRetrievalService(repo=kb_repo),
                llm_client=llm_client,
            ),
        )
        return llm_client

    return build


def seed_composable_case(repo, band="tinggi", abstain_status="yakin"):
    """A case at GENERATING_RECOMMENDATION with a frozen analysis."""
    seed_case(
        repo, CASE_ID, PETANI_PROFILE_ID, status="GENERATING_RECOMMENDATION",
        area_kecamatan="Ciparay",
    )
    seed_analysis(
        repo, ANALYSIS_ID, CASE_ID, band=band, abstain_status=abstain_status
    )


# ---- safety checker (pure) -------------------------------------------------------


def test_checker_accepts_a_clean_card():
    verdict = check_recommendation(
        valid_payload(), {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF}
    )
    assert verdict.is_safe


def test_checker_blocks_a_dosage_in_the_farmer_view():
    # Arrange
    payload = valid_payload()
    payload["farmerView"]["lakukan"][0]["text"] = "Semprot dengan 2 ml/l air."

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert VIOLATION_FORBIDDEN_TERM in verdict.violations


def test_checker_blocks_a_brand_name():
    # Arrange
    payload = valid_payload()
    payload["farmerView"]["lakukan"][0]["text"] = "Gunakan Nativo pada tanaman."

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert VIOLATION_FORBIDDEN_TERM in verdict.violations


def test_checker_blocks_a_claim_of_final_diagnosis():
    # Arrange
    payload = valid_payload()
    payload["farmerView"]["indikasi"] = "Tanaman ini sudah pasti terkena blas."

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert VIOLATION_FORBIDDEN_TERM in verdict.violations


def test_checker_allows_the_required_disclaimer():
    # Arrange — the mandated wording NEGATES the verdict phrase; blocking it
    # would forbid the exact sentence FR-007 requires the card to carry.
    payload = valid_payload()
    payload["farmerView"]["indikasi"] = (
        "Kemungkinan Blas Daun. Ini indikasi awal, bukan diagnosis final."
    )

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert verdict.is_safe


def test_checker_blocks_an_invented_reference():
    # Arrange
    payload = valid_payload(lakukan_ref="RUJ-BLAS-999")

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert VIOLATION_UNKNOWN_REF in verdict.violations


def test_checker_blocks_an_uncited_suggestion():
    # Arrange
    payload = valid_payload()
    payload["farmerView"]["lakukan"][0]["refCodes"] = []

    # Act
    verdict = check_recommendation(payload, {BLAS_REF, UMUM_REF}, {BLAS_REF, UMUM_REF})

    # Assert
    assert VIOLATION_MISSING_CITATION in verdict.violations


def test_checker_blocks_narrating_a_policy_flagged_chunk():
    # Arrange — the code is valid, but it is not narratable to a farmer
    payload = valid_payload(lakukan_ref=DOSAGE_REF)

    # Act
    verdict = check_recommendation(
        payload, {BLAS_REF, UMUM_REF, DOSAGE_REF}, {BLAS_REF, UMUM_REF}
    )

    # Assert
    assert VIOLATION_NOT_NARRATABLE in verdict.violations


def test_checker_allows_a_flagged_chunk_in_the_technical_view():
    # Arrange — a penyuluh may read dosage material
    payload = valid_payload()
    payload["technicalView"]["kutipan"] = [
        {"text": "Rujukan teknis.", "refCodes": [DOSAGE_REF]}
    ]

    # Act
    verdict = check_recommendation(
        payload, {BLAS_REF, UMUM_REF, DOSAGE_REF}, {BLAS_REF, UMUM_REF}
    )

    # Assert
    assert verdict.is_safe


# ---- endpoint --------------------------------------------------------------------


def test_happy_path_stores_an_ai_card(client, triage_repo, kb_repo, compose):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    compose(FakeLlmClient([valid_payload()]))

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI
    ).json()["data"]

    # Assert
    assert data["origin"] == ORIGIN_AI_ENGINE
    assert data["farmerView"]["lakukan"][0]["refCodes"] == [BLAS_REF]
    assert set(data["refCodes"]) == {BLAS_REF, UMUM_REF}
    assert triage_repo.cases[CASE_ID]["status"] == "AUTO_TRIAGE_READY"


def test_petani_gets_no_technical_view(client, triage_repo, kb_repo, compose):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    compose(FakeLlmClient([valid_payload()]))

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI
    ).json()["data"]

    # Assert
    assert data["technicalView"] is None
    assert data["modelVersion"] is None
    assert data["providerVersion"] is None


def test_penyuluh_gets_the_technical_view_and_versions(
    client, triage_repo, kb_repo, compose
):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    compose(FakeLlmClient([valid_payload()]))
    client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Act
    data = client.get(f"/cases/{CASE_ID}/recommendation", headers=PENYULUH).json()[
        "data"
    ]

    # Assert
    assert data["technicalView"]["ringkasan"]
    assert data["modelVersion"] == "cv-fixture-v0"
    assert data["providerVersion"] == "fake:test-model"


def test_too_few_references_never_calls_the_ai(client, triage_repo, kb_repo, compose):
    # Arrange — a single approved chunk, below the minimum of two
    seed_composable_case(triage_repo)
    seed_kb_source(kb_repo, status="disetujui")
    seed_kb_chunk(
        kb_repo, "chk-lonely", BLAS_REF, content="Satu rujukan saja.",
        approval_status="disetujui", disease_tags=["blas_daun"],
    )
    fake = compose(FakeLlmClient([valid_payload()]))

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI
    ).json()["data"]

    # Assert
    assert data["origin"] == ORIGIN_INSUFFICIENT_EVIDENCE
    assert fake.prompts == [], "the provider must not be called at all"
    assert data["farmerView"]["lakukan"] == []
    assert triage_repo.cases[CASE_ID]["status"] == "NEEDS_REVIEW"
    assert triage_repo.cases[CASE_ID]["needs_human_review"] is True


def test_unsafe_output_falls_back_to_the_rule_card(
    client, triage_repo, kb_repo, compose
):
    # Arrange — every attempt carries a dosage, so every attempt is blocked
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    unsafe = valid_payload()
    unsafe["farmerView"]["lakukan"][0]["text"] = "Semprot dengan 2 ml/l air."
    fake = compose(FakeLlmClient([unsafe, unsafe]))

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI
    ).json()["data"]

    # Assert
    assert len(fake.prompts) == 2, "limited retries, then fall back"
    assert data["origin"] == ORIGIN_RULE_FALLBACK
    assert triage_repo.cases[CASE_ID]["status"] == "NEEDS_REVIEW"
    # The fallback cites by construction — every line comes from a chunk.
    for entry in data["farmerView"]["lakukan"]:
        assert entry["refCodes"]


def test_provider_outage_falls_back_instead_of_dead_ending(
    client, triage_repo, kb_repo, compose
):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    compose(FakeLlmClient(error=LlmProviderError("connection refused")))

    # Act
    response = client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Assert — availability rule: the flow must never dead-end
    assert response.status_code == 200
    assert response.json()["data"]["origin"] == ORIGIN_RULE_FALLBACK


def test_missing_provider_key_fails_loudly_instead_of_degrading(
    client, triage_repo, kb_repo, compose
):
    # Arrange — an unconfigured deployment, not a provider outage
    from service.llm_provider import LlmProviderNotConfigured

    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    compose(FakeLlmClient(error=LlmProviderNotConfigured("no key")))

    # Act
    response = client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Assert — a broken install must not hide behind permanent "limited mode"
    assert response.status_code >= 400
    assert triage_repo.get_recommendation_by_case(CASE_ID) is None


def test_dosage_chunk_is_never_narrated_to_the_farmer(
    client, triage_repo, kb_repo, compose
):
    # Arrange — a flagged chunk sits in the index alongside clean ones
    seed_composable_case(triage_repo)
    seed_index(kb_repo, with_dosage_chunk=True)
    compose(FakeLlmClient(error=LlmProviderError("forced fallback")))

    # Act
    data = client.post(
        f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI
    ).json()["data"]

    # Assert
    farmer_refs = {
        code for entry in data["farmerView"]["lakukan"] for code in entry["refCodes"]
    }
    assert DOSAGE_REF not in farmer_refs


def test_prompt_carries_no_identifying_data(client, triage_repo, kb_repo, compose):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    fake = compose(FakeLlmClient([valid_payload()]))

    # Act
    client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Assert — brief 03 §5.3: analysis + context + references, nothing else
    prompt = fake.prompts[0]
    assert "Ani Petani" not in prompt
    assert PETANI_PROFILE_ID not in prompt
    assert CASE_ID not in prompt
    assert "Ciparay" not in prompt
    assert "Kab. Bandung" not in prompt
    assert BLAS_REF in prompt, "references must be present"


def test_low_band_lands_in_review(client, triage_repo, kb_repo, compose):
    # Arrange
    seed_composable_case(triage_repo, band="rendah")
    seed_index(kb_repo)
    compose(FakeLlmClient([valid_payload()]))

    # Act
    client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Assert
    assert triage_repo.cases[CASE_ID]["status"] == "NEEDS_REVIEW"
    assert triage_repo.cases[CASE_ID]["needs_human_review"] is True


def test_composing_twice_does_not_pay_for_a_second_call(
    client, triage_repo, kb_repo, compose
):
    # Arrange
    seed_composable_case(triage_repo)
    seed_index(kb_repo)
    fake = compose(FakeLlmClient([valid_payload()]))

    # Act
    first = client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)
    second = client.post(f"/cases/{CASE_ID}/recommendation", json={}, headers=PETANI)

    # Assert
    assert len(fake.prompts) == 1
    assert (
        first.json()["data"]["recommendationId"]
        == second.json()["data"]["recommendationId"]
    )


def test_recommendation_is_404_before_it_is_composed(client, triage_repo):
    # Arrange
    seed_composable_case(triage_repo)

    # Act
    response = client.get(f"/cases/{CASE_ID}/recommendation", headers=PETANI)

    # Assert
    assert response.status_code == 404
