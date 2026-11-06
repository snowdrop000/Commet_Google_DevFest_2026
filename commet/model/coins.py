from typing import Literal, Optional
from uuid import UUID

from .analysis import DataModel


class SettlementRequest(DataModel):
    session_id: UUID
    event_id: UUID
    outcome: Literal["closed", "posted", "unverified"]
    analysis_id: Optional[UUID] = None


class ExplorationBalance(DataModel):
    pending: int
    confirmed: int
    picked_up: bool = False


class SettlementResult(DataModel):
    status: Literal["settled", "held"]
    multiplier: Optional[float]
    awarded: int
    pending: int = 0
    confirmed: int
