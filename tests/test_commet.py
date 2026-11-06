from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError

from commet.api import create_app
from commet.model.analysis import GeminiAnalysis, VideoSummary
from commet.repository.gemini import GeminiUnavailable
from commet.service.analysis import demo_candidate


HEADERS = {"X-Commet-Client": "extension"}


class FakeGemini:
    def __init__(self, fail_video=False):
        self.fail_video = fail_video
        self.video_urls = []
        self.contexts = []

    def generate(self, model, parts, **_kwargs):
        if model is VideoSummary:
            self.video_urls.append(parts[0]["fileData"]["fileUri"])
            if self.fail_video:
                raise GeminiUnavailable()
            return VideoSummary(summary="映像・音声の要約", topics=[], keyClaims=[], sensitiveTopics=[])
        payload = json.loads(parts[0]["text"])
        self.contexts.append(payload["content_context"])
        return demo_candidate(payload["draft"])


class CommetApiTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / "test.sqlite3"
        self.now = 1767225600
        self.client = self.make_client()

    def make_client(self, gemini=None):
        return TestClient(create_app(self.db, gemini, clock=lambda: self.now),
                          base_url="http://localhost", headers=HEADERS)

    def tick(self, session, *, active=True):
        return self.client.put(f"/v1/coins/sessions/{session}/tick", params={"active": active}).json()

    def collect(self, session, count):
        self.tick(session)
        for _ in range(count * 4):
            self.now += 4
            balance = self.tick(session)
        self.assertEqual(balance["pending"], count)

    def settle(self, session, outcome, analysis_id=None, event_id=None):
        return self.client.post("/v1/coins/settle", json={
            "session_id": session, "event_id": event_id or str(uuid4()),
            "outcome": outcome, "analysis_id": analysis_id,
        }).json()

    def analyze(self, text, session=None, **options):
        return self.client.post("/v1/analyze", json={"text": text, "session_id": session, **options})

    def test_preview_is_read_only_and_context_is_required_for_replies(self):
        result = self.analyze("応援しています！").json()
        self.assertEqual(result["analysis"]["category"], "supportive")
        self.assertIsNone(result["analysis_id"])
        self.assertEqual(self.client.get("/v1/coins/balance").json()["confirmed"], 0)
        result = self.analyze("頭が悪い", context={"reply": {"isReply": True}}).json()
        self.assertEqual(result["analysis"]["category"], "context_required")
        self.assertEqual(result["analysis"]["suggestion"], "")

    def test_harmful_post_cannot_be_resettled_at_closure(self):
        session = str(uuid4())
        self.collect(session, 20)
        result = self.analyze("頭が悪い。動画を出すな。", session).json()
        self.assertTrue(result["analysis"]["suggestion"])
        settled = self.settle(session, "posted", result["analysis_id"])
        self.assertEqual((settled["multiplier"], settled["awarded"], settled["pending"]), (0, 0, 0))
        self.client = self.make_client()
        self.assertEqual(self.settle(session, "closed"), settled)

    def test_non_harmful_criticism_and_tab_closure(self):
        first, second = str(uuid4()), str(uuid4())
        self.collect(first, 20)
        analysis = self.analyze("説明が分かりにくいです。", first).json()
        self.assertEqual(analysis["analysis"]["category"], "unconstructive_criticism")
        result = self.settle(first, "posted", analysis["analysis_id"])
        self.assertEqual((result["multiplier"], result["awarded"]), (1.5, 30))
        self.collect(second, 20)
        self.client = self.make_client()
        result = self.settle(second, "closed")
        self.assertEqual((result["multiplier"], result["awarded"], result["confirmed"]), (1, 20, 50))

    def test_unverified_and_wrong_session_receipts_are_held(self):
        first, second = str(uuid4()), str(uuid4())
        self.collect(first, 2)
        self.collect(second, 2)
        receipt = self.analyze("応援しています！", first).json()["analysis_id"]
        held = self.settle(second, "posted", receipt)
        self.assertEqual((held["status"], held["pending"], held["awarded"]), ("held", 2, 0))
        self.assertEqual(self.settle(second, "closed"), held)
        self.assertEqual(self.settle(first, "unverified")["status"], "held")

    def test_concurrent_settlement_only_credits_once(self):
        session = str(uuid4())
        self.collect(session, 4)
        with ThreadPoolExecutor(max_workers=4) as threads:
            results = list(threads.map(lambda _: self.settle(session, "closed"), range(8)))
        self.assertTrue(all(result == results[0] for result in results))
        self.assertEqual(self.client.get("/v1/coins/balance").json()["confirmed"], 4)

    def test_alternating_tabs_and_inactive_gaps_do_not_earn_coins(self):
        first, second = str(uuid4()), str(uuid4())
        for _ in range(12):
            self.now += 4
            self.assertEqual(self.tick(first)["pending"], 0)
            self.assertEqual(self.tick(second)["pending"], 0)
        self.now += 300
        self.assertEqual(self.tick(second)["pending"], 0)
        self.tick(second, active=False)
        self.now += 4
        self.assertEqual(self.tick(second)["pending"], 0)

    def test_daily_pickup_cap_and_rounding(self):
        session = str(uuid4())
        self.collect(session, 60)
        for _ in range(8):
            self.now += 4
            self.assertEqual(self.tick(session)["pending"], 60)
        self.now += 86400
        odd_session = str(uuid4())
        self.collect(odd_session, 3)
        receipt = self.analyze("応援しています！", odd_session).json()["analysis_id"]
        self.assertEqual(self.settle(odd_session, "posted", receipt)["awarded"], 4)

    def test_video_summary_is_cached_and_failure_uses_metadata(self):
        context = {"platform": "youtube", "content": {"videoId": "9hE5-98ZeCg", "title": "動画の題名"}}
        gemini = FakeGemini()
        self.client = self.make_client(gemini)
        for _ in range(2):
            result = self.analyze("応援しています！", context=context).json()
            self.assertEqual(result["contextUsed"]["video"], "gemini_video")
        self.assertEqual(gemini.video_urls, ["https://www.youtube.com/watch?v=9hE5-98ZeCg"])
        self.assertEqual(gemini.contexts[0]["videoSummary"]["summary"], "映像・音声の要約")
        gemini = FakeGemini(fail_video=True)
        self.client = self.make_client(gemini)
        result = self.analyze("応援しています！", context=context).json()
        self.assertEqual(result["contextUsed"]["video"], "page_metadata")
        self.assertEqual(gemini.contexts[0]["title"], "動画の題名")

    def test_invalid_input_and_ai_scores(self):
        self.assertEqual(self.analyze("x").status_code, 422)
        self.assertEqual(self.analyze("応援しています！", allowDemo=False).status_code, 503)
        data = demo_candidate("応援しています！").model_dump()
        data["harm"]["severity"] = 11
        with self.assertRaises(ValidationError):
            GeminiAnalysis.model_validate(data)


if __name__ == "__main__":
    unittest.main()
