from datetime import datetime, timedelta, timezone
from time import time
from uuid import UUID

from commet.model.coins import ExplorationBalance, SettlementRequest, SettlementResult


class SettlementConflict(Exception):
    pass


class CoinService:
    def __init__(self, repository, clock=time, interval=15, daily_limit=60):
        self.repository = repository
        self.clock = clock
        self.interval = interval
        self.daily_limit = daily_limit

    def balance(self) -> ExplorationBalance:
        with self.repository.transaction() as tx:
            return ExplorationBalance(pending=0, confirmed=self.repository.wallet(tx)["confirmed"])

    def tick(self, session_id: UUID, active: bool) -> ExplorationBalance:
        session_id = str(session_id)
        now = self.clock()
        day = datetime.fromtimestamp(now, timezone(timedelta(hours=9))).date().isoformat()
        repo = self.repository
        with repo.transaction() as tx:
            session = repo.session(tx, session_id)
            wallet = repo.wallet(tx)
            if not session:
                repo.start_session(tx, session_id, now)
                session = repo.session(tx, session_id)
            if session["settlement"]:
                return ExplorationBalance(pending=0, confirmed=wallet["confirmed"])

            elapsed = now - session["last_tick"]
            same_active_session = wallet["active_session"] == session_id
            # Missed heartbeats (sleep, hidden tab, disconnected browser) earn no time.
            continuous = active and same_active_session and 0 <= elapsed <= 8
            credit = session["credit"] + elapsed if continuous else 0
            if active:
                repo.set_active_session(tx, session_id)
            elif same_active_session:
                repo.set_active_session(tx, None)
            picked = (
                credit >= self.interval and now - wallet["last_pickup"] >= self.interval
                and repo.picked_today(tx, day) < self.daily_limit
            )
            if picked:
                credit -= self.interval
                repo.record_pickup(tx, day, now)
            repo.update_progress(tx, session_id, now, min(credit, self.interval), int(picked))
            return ExplorationBalance(
                pending=session["pending"] + int(picked), confirmed=wallet["confirmed"], picked_up=picked,
            )

    def settle(self, request: SettlementRequest) -> SettlementResult:
        repo = self.repository
        session_id, event_id = str(request.session_id), str(request.event_id)
        now = self.clock()
        with repo.transaction() as tx:
            event = repo.event(tx, event_id)
            if event and event["session_id"] != session_id:
                raise SettlementConflict("精算IDはすでに使用されています。")
            session = repo.session(tx, session_id)
            if not session:
                repo.start_session(tx, session_id, now)
                session = repo.session(tx, session_id)
            if session["settlement"]:
                return SettlementResult.model_validate_json(session["settlement"])

            receipt = repo.receipt(tx, str(request.analysis_id), session_id, now)
            numerator = self.multiplier_numerator(request.outcome, receipt)
            pending = session["pending"]
            confirmed = repo.wallet(tx)["confirmed"]
            awarded = pending * numerator // 2 if numerator is not None else 0
            result = SettlementResult(
                status="held" if numerator is None else "settled",
                multiplier=None if numerator is None else numerator / 2,
                awarded=awarded, pending=pending if numerator is None else 0,
                confirmed=confirmed + awarded,
            )
            repo.record_settlement(tx, session_id, event_id, result)
            return result

    @staticmethod
    def multiplier_numerator(outcome, receipt):
        # Integer arithmetic floors half coins without floating-point rounding.
        if outcome == "closed":
            return 2
        if outcome != "posted" or not receipt:
            return None
        if receipt["category"] == "context_required" or receipt["confidence"] <= 4:
            return None
        return 0 if receipt["category"] == "abusive" else 3
