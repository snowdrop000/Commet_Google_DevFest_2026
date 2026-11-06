from collections import OrderedDict
from threading import Lock
from time import monotonic


class VideoCache:
    def __init__(self, limit=20, ttl=7 * 24 * 60 * 60):
        self.limit = limit
        self.ttl = ttl
        self.entries = OrderedDict()
        self.lock = Lock()

    def get_or_load(self, video_id, load):
        # A single lock also avoids duplicate Gemini calls for concurrent checks.
        with self.lock:
            cached = self.entries.pop(video_id, None)
            if cached and monotonic() - cached[0] < self.ttl:
                self.entries[video_id] = cached
                return cached[1]
            summary = load()
            self.entries[video_id] = (monotonic(), summary)
            if len(self.entries) > self.limit:
                self.entries.popitem(last=False)
            return summary
