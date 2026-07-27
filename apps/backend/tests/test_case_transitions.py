"""Unit tests for the single-source case state machine (FRD §6.5–6.6).

The SQL trigger in migration 0010 mirrors `LEGAL_TRANSITIONS`; these tests pin
the Python side to the FRD tables so any drift is caught in review.
"""
from models.siaga_case import (
    ACTIVE_STATUSES,
    CASE_STATUSES,
    DISPLAY_STAGE_MAP,
    LEGAL_TRANSITIONS,
    STATUS_ARCHIVED,
    STATUS_CANCELLED,
    STATUS_CAPTURED,
    STATUS_CLOSED,
    STATUS_DRAFT,
    STATUS_FAILED,
    STATUS_NEEDS_CONTEXT,
    STATUS_QUEUED,
    STATUS_REVIEWED,
    STATUS_REVISION_REQUIRED,
    display_stage_for,
    is_legal_transition,
)


def test_every_status_has_a_transition_entry():
    assert set(LEGAL_TRANSITIONS.keys()) == set(CASE_STATUSES)


def test_frd_65_next_transitions_are_legal():
    # Spot-check the §6.5 "Transisi Berikutnya" column.
    assert is_legal_transition(STATUS_DRAFT, STATUS_CAPTURED)
    assert is_legal_transition(STATUS_CAPTURED, STATUS_QUEUED)
    assert is_legal_transition(STATUS_FAILED, STATUS_QUEUED)  # STR-009 retry
    assert is_legal_transition(STATUS_REVISION_REQUIRED, STATUS_CAPTURED)
    assert is_legal_transition(STATUS_REVISION_REQUIRED, STATUS_NEEDS_CONTEXT)
    assert is_legal_transition(STATUS_REVIEWED, STATUS_CLOSED)  # STR-008
    assert is_legal_transition(STATUS_CLOSED, STATUS_ARCHIVED)


def test_status_skipping_is_illegal():
    assert not is_legal_transition(STATUS_DRAFT, STATUS_QUEUED)
    assert not is_legal_transition(STATUS_DRAFT, STATUS_REVIEWED)
    assert not is_legal_transition(STATUS_CAPTURED, STATUS_REVIEWED)
    assert not is_legal_transition(STATUS_QUEUED, STATUS_NEEDS_CONTEXT)


def test_str_010_any_active_state_may_cancel():
    for status in ACTIVE_STATUSES:
        assert is_legal_transition(status, STATUS_CANCELLED), status


def test_closed_and_terminal_states_cannot_cancel():
    # CLOSED is not active — its only legal exit is ARCHIVED (§6.5 table).
    assert not is_legal_transition(STATUS_CLOSED, STATUS_CANCELLED)
    assert not is_legal_transition(STATUS_ARCHIVED, STATUS_CANCELLED)
    assert not is_legal_transition(STATUS_CANCELLED, STATUS_CANCELLED)


def test_terminal_states_have_no_exits():
    assert LEGAL_TRANSITIONS[STATUS_ARCHIVED] == ()
    assert LEGAL_TRANSITIONS[STATUS_CANCELLED] == ()


def test_unknown_status_is_never_legal():
    assert not is_legal_transition("NOT_A_STATUS", STATUS_DRAFT)
    assert not is_legal_transition(STATUS_DRAFT, "NOT_A_STATUS")


def test_display_stage_covers_every_status():
    assert set(DISPLAY_STAGE_MAP.keys()) == set(CASE_STATUSES)
    assert display_stage_for(STATUS_DRAFT) == "draf"
    assert display_stage_for(STATUS_CLOSED) == "selesai"
    # Unknown statuses degrade to the safe in-progress stage.
    assert display_stage_for("SOMETHING_NEW") == "diproses"
