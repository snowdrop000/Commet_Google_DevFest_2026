from contextlib import contextmanager
from pathlib import Path
import sqlite3


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, pending INTEGER NOT NULL DEFAULT 0,
    last_tick REAL NOT NULL, credit REAL NOT NULL DEFAULT 0,
    settlement TEXT
);
CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, category TEXT NOT NULL,
    confidence INTEGER NOT NULL, expires REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS daily (
    day TEXT PRIMARY KEY, picked INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wallet (
    id INTEGER PRIMARY KEY CHECK (id = 1), confirmed INTEGER NOT NULL,
    last_pickup REAL NOT NULL, active_session TEXT
);
INSERT OR IGNORE INTO wallet VALUES (1, 0, 0, NULL);
CREATE TABLE IF NOT EXISTS settlement_events (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL
);
"""


class SQLiteRepository:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.transaction() as tx:
            tx.executescript(SCHEMA)

    @contextmanager
    def transaction(self):
        connection = sqlite3.connect(self.path, timeout=5)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                connection.execute("BEGIN IMMEDIATE")
                yield connection
        finally:
            connection.close()

    @staticmethod
    def session(tx, session_id):
        return tx.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()

    @staticmethod
    def start_session(tx, session_id, now):
        tx.execute("INSERT INTO sessions (id, last_tick) VALUES (?, ?)", (session_id, now))

    @staticmethod
    def update_progress(tx, session_id, now, credit, picked):
        tx.execute(
            "UPDATE sessions SET last_tick = ?, credit = ?, pending = pending + ? WHERE id = ?",
            (now, credit, picked, session_id),
        )

    @staticmethod
    def wallet(tx):
        return tx.execute("SELECT * FROM wallet WHERE id = 1").fetchone()

    @staticmethod
    def set_active_session(tx, session_id):
        tx.execute("UPDATE wallet SET active_session = ? WHERE id = 1", (session_id,))

    @staticmethod
    def record_pickup(tx, day, now):
        tx.execute("UPDATE wallet SET last_pickup = ? WHERE id = 1", (now,))
        tx.execute(
            "INSERT INTO daily VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET picked = picked + 1",
            (day,),
        )

    @staticmethod
    def picked_today(tx, day):
        row = tx.execute("SELECT picked FROM daily WHERE day = ?", (day,)).fetchone()
        return row["picked"] if row else 0

    @staticmethod
    def record_settlement(tx, session_id, event_id, result):
        tx.execute("INSERT INTO settlement_events VALUES (?, ?)", (event_id, session_id))
        tx.execute("UPDATE sessions SET settlement = ?, pending = ? WHERE id = ?",
                   (result.model_dump_json(), result.pending, session_id))
        tx.execute("UPDATE wallet SET confirmed = ? WHERE id = 1", (result.confirmed,))
        tx.execute("DELETE FROM receipts WHERE session_id = ?", (session_id,))

    @staticmethod
    def event(tx, event_id):
        return tx.execute(
            "SELECT session_id FROM settlement_events WHERE id = ?", (event_id,),
        ).fetchone()

    def save_receipt(self, receipt_id, session_id, analysis, now):
        with self.transaction() as tx:
            tx.execute("DELETE FROM receipts WHERE expires <= ?", (now,))
            tx.execute("INSERT INTO receipts VALUES (?, ?, ?, ?, ?)",
                       (receipt_id, session_id, analysis.category, analysis.confidence, now + 300))

    @staticmethod
    def receipt(tx, receipt_id, session_id, now):
        return tx.execute(
            "SELECT * FROM receipts WHERE id = ? AND session_id = ? AND expires > ?",
            (receipt_id, session_id, now),
        ).fetchone()
