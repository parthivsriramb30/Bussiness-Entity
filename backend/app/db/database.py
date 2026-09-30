import sqlite3
from typing import Generator
from contextlib import contextmanager
from app.config import settings

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(
        str(settings.SQLITE_PATH),
        timeout=30.0,
        check_same_thread=False
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

@contextmanager
def get_db_ctx() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_db():
    with get_db_ctx() as conn:
        yield conn

def init_db():
    with get_db_ctx() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            status TEXT NOT NULL, -- 'ready', 'incomplete', 'placeholder', 'error'
            checksum TEXT,
            train_records INTEGER DEFAULT 0,
            test_records INTEGER DEFAULT 0,
            record_counts_json TEXT,
            country_counts_json TEXT,
            validation_errors_json TEXT,
            is_active INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            path TEXT NOT NULL,
            file_hash TEXT,
            threshold REAL DEFAULT 0.40,
            feature_count INTEGER DEFAULT 21,
            feature_names_json TEXT,
            n_estimators INTEGER,
            is_active INTEGER DEFAULT 0,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL, -- 'inference', 'training', 'evaluation', 'import'
            mode TEXT DEFAULT 'sample', -- 'sample', 'full'
            sample_size INTEGER,
            status TEXT NOT NULL, -- 'queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted'
            stage TEXT DEFAULT 'initializing',
            progress REAL DEFAULT 0.0,
            processed_count INTEGER DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            dataset_id TEXT,
            model_id TEXT,
            run_dir TEXT,
            error_message TEXT,
            config_json TEXT,
            memory_mb REAL DEFAULT 0.0,
            cpu_percent REAL DEFAULT 0.0,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(dataset_id) REFERENCES datasets(id),
            FOREIGN KEY(model_id) REFERENCES models(id)
        );

        CREATE TABLE IF NOT EXISTS audit_reviews (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            source1_id TEXT NOT NULL,
            reviewer_name TEXT NOT NULL,
            decision TEXT NOT NULL, -- 'agreed', 'disagreed', 'flagged'
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(run_id) REFERENCES jobs(id)
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_audit_run_s1 ON audit_reviews(run_id, source1_id);
        """)
