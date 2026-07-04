"""
GyaanSetu AI — SQLite Database Connection
Extended schema with 4 new tables for health, interviews, career, and learning
"""

import sqlite3, os, logging
from pathlib import Path
from dotenv import load_dotenv
from contextvars import ContextVar

load_dotenv()
logger = logging.getLogger("gyaansetu.db")

# Dynamic request-bound ContextVar for multi-database partitioning
current_user_id: ContextVar[str] = ContextVar("current_user_id", default="default")


def get_connection() -> sqlite3.Connection:
    user_id = current_user_id.get()
    
    # Sanitize user_id to prevent directory traversal
    safe_user_id = "".join(c for c in user_id if c.isalnum() or c in "-_").strip()
    if not safe_user_id:
        safe_user_id = "default"
        
    db_dir = Path("./db_users")
    db_dir.mkdir(exist_ok=True)
    
    db_path = db_dir / f"user_{safe_user_id}.db"
    db_exists = db_path.exists()
    
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    
    try:
        _run_schema(conn)
        try:
            conn.execute("ALTER TABLE ai_projects ADD COLUMN tag TEXT DEFAULT ''")
            conn.commit()
        except Exception:
            pass # already exists
        # Ensure user row exists to prevent foreign key errors
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            cursor.execute(
                """INSERT INTO users (id, email, name, password_hash, salt)
                   VALUES (?, ?, ?, '', '')""",
                (user_id, f"{safe_user_id}@gyaansetu.ai", safe_user_id.capitalize())
            )
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to ensure schema tables for user '{safe_user_id}': {e}")
        
    return conn


def init_db():
    """Initialize default/system database."""
    conn = get_connection()
    conn.close()
    logger.info("Default/lifespan database initialized")


def _run_schema(conn: sqlite3.Connection):
    conn.executescript("""
        -- ── Core User Tables ────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            email       TEXT UNIQUE NOT NULL,
            name        TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt        TEXT NOT NULL,
            education_level TEXT DEFAULT '',
            learning_goal   TEXT DEFAULT '',
            preferred_lang  TEXT DEFAULT 'English',
            career_target   TEXT DEFAULT '',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_stats (
            user_id       TEXT PRIMARY KEY,
            study_hours   REAL    DEFAULT 0,
            courses_done  INTEGER DEFAULT 0,
            ai_sessions   INTEGER DEFAULT 0,
            global_rank   INTEGER DEFAULT 999,
            mastery_score INTEGER DEFAULT 0,
            streak_days   INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            text       TEXT NOT NULL,
            completed  INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mistakes (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            topic           TEXT NOT NULL,
            frequency       INTEGER NOT NULL DEFAULT 1,
            type            TEXT NOT NULL,
            explanation     TEXT NOT NULL,
            correction      TEXT NOT NULL,
            sample_question TEXT NOT NULL,
            options_json    TEXT NOT NULL,
            correct_idx     INTEGER NOT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS certificates (
            id        TEXT PRIMARY KEY,
            user_id   TEXT NOT NULL,
            title     TEXT NOT NULL,
            event     TEXT NOT NULL,
            date      TEXT NOT NULL,
            issuer    TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            grade     TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS courses (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL,
            title        TEXT NOT NULL,
            desc         TEXT NOT NULL,
            tag          TEXT NOT NULL,
            progress     INTEGER NOT NULL DEFAULT 0,
            hours        TEXT NOT NULL,
            syllabus_json TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- ── New Tables ───────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS health_metrics (
            id            TEXT PRIMARY KEY,
            user_id       TEXT NOT NULL,
            date          TEXT NOT NULL,
            screen_hours  REAL    DEFAULT 0,
            water_cups    INTEGER DEFAULT 0,
            sleep_hours   REAL    DEFAULT 0,
            stress_level  TEXT    DEFAULT 'Low',
            focus_index   INTEGER DEFAULT 100,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS interview_reports (
            id                TEXT PRIMARY KEY,
            user_id           TEXT NOT NULL,
            interview_type    TEXT NOT NULL,
            technical_score   INTEGER DEFAULT 0,
            comm_score        INTEGER DEFAULT 0,
            confidence_score  INTEGER DEFAULT 0,
            overall_score     INTEGER DEFAULT 0,
            areas_json        TEXT    DEFAULT '[]',
            transcript_json   TEXT    DEFAULT '[]',
            duration_seconds  INTEGER DEFAULT 0,
            created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS career_roadmaps (
            id            TEXT PRIMARY KEY,
            user_id       TEXT NOT NULL,
            target_title  TEXT NOT NULL,
            match_score   INTEGER DEFAULT 0,
            roadmap_json  TEXT NOT NULL DEFAULT '[]',
            skills_json   TEXT NOT NULL DEFAULT '[]',
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS learning_progress (
            id           TEXT PRIMARY KEY,
            user_id      TEXT NOT NULL,
            course_id    TEXT NOT NULL,
            module_name  TEXT NOT NULL,
            completed    INTEGER DEFAULT 0,
            completed_at DATETIME,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS rag_documents (
            id          TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            filename    TEXT NOT NULL,
            chunk_count INTEGER DEFAULT 0,
            ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_projects (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            title           TEXT NOT NULL,
            category        TEXT NOT NULL,
            tag             TEXT DEFAULT '',
            inputs_json     TEXT NOT NULL,
            output_markdown TEXT NOT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
