import os
from time import time
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from commet.model.analysis import AnalyzeRequest, AnalyzeResponse
from commet.model.coins import ExplorationBalance, SettlementRequest, SettlementResult
from commet.repository.gemini import GeminiRepository, GeminiUnavailable
from commet.repository.sqlite import SQLiteRepository
from commet.repository.video_cache import VideoCache
from commet.service.analysis import AnalysisService
from commet.service.coins import CoinService, SettlementConflict


def require_client_header(x_commet_client: str = Header("")):
    # The local API uses no CORS allowlist. Websites cannot send this custom header.
    if x_commet_client != "extension":
        raise HTTPException(403, "Commetのクライアントヘッダーが必要です。")


def create_app(database=None, gemini=None, clock=time):
    repo = SQLiteRepository(database or os.environ.get("COMMET_DB_PATH", ".commet/commet.sqlite3"))
    analysis = AnalysisService(gemini, repo, VideoCache(), clock)
    coins = CoinService(repo, clock)
    app = FastAPI(title="Commet", dependencies=[Depends(require_client_header)])
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, _error):
        return JSONResponse(status_code=422, content={"detail": "入力形式または文字数を確認してください。"})

    @app.exception_handler(GeminiUnavailable)
    async def gemini_error(_request, error):
        return JSONResponse(status_code=503, content={"detail": str(error)})

    @app.exception_handler(SettlementConflict)
    async def settlement_conflict(_request, error):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    @app.get("/health")
    def health():
        return {"ok": True, "gemini": gemini is not None}

    @app.post("/v1/analyze", response_model=AnalyzeResponse)
    def analyze(request: AnalyzeRequest):
        return analysis.analyze(request)

    @app.get("/v1/coins/balance", response_model=ExplorationBalance)
    def balance():
        return coins.balance()

    @app.put("/v1/coins/sessions/{session_id}/tick", response_model=ExplorationBalance)
    def tick(session_id: UUID, active: bool = True):
        return coins.tick(session_id, active)

    @app.post("/v1/coins/settle", response_model=SettlementResult)
    def settle(request: SettlementRequest):
        return coins.settle(request)

    return app


def create_local_app():
    key = os.environ.get("GEMINI_API_KEY")
    model = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
    return create_app(gemini=GeminiRepository(key, model) if key else None)
