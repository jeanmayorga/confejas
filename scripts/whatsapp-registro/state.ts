import { Database } from "bun:sqlite";
import type { Incoming } from "./core";
export class State {
  db: Database;
  constructor(path: string) {
    this.db = new Database(path, { create: true });
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS conversation (id TEXT PRIMARY KEY,chat_jid TEXT,sender TEXT,sender_name TEXT,content TEXT,timestamp TEXT,is_from_me INTEGER,media_type TEXT,reply_to TEXT); CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY,sender TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY,request_id TEXT,stage TEXT,detail TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`,
    );
  }
  startTime() {
    const row = this.db
      .query("SELECT value FROM meta WHERE key='start'")
      .get() as { value: string } | null;
    if (row) return Number(row.value);
    const now = Date.now();
    this.db.query("INSERT INTO meta VALUES ('start',?)").run(String(now));
    return now;
  }
  has(id: string) {
    return !!this.db.query("SELECT 1 FROM requests WHERE id=?").get(id);
  }
  claim(m: Incoming) {
    return (
      this.db
        .query("INSERT OR IGNORE INTO requests VALUES (?,?,'processing',?,?)")
        .run(m.id, m.sender, new Date().toISOString(), new Date().toISOString())
        .changes === 1
    );
  }
  status(id: string, status: string) {
    this.db
      .query("UPDATE requests SET status=?,updated_at=? WHERE id=?")
      .run(status, new Date().toISOString(), id);
  }
  audit(id: string, stage: string, detail = "") {
    this.db
      .query("INSERT INTO audit(request_id,stage,detail) VALUES (?,?,?)")
      .run(id, stage, detail);
  }
  recover() {
    return this.db
      .query(
        "UPDATE requests SET status='interrupted' WHERE status='processing'",
      )
      .run().changes;
  }
  recent(sender: string) {
    return (
      this.db
        .query(
          "SELECT count(*) AS n FROM requests WHERE sender=? AND created_at>?",
        )
        .get(sender, new Date(Date.now() - 60_000).toISOString()) as {
        n: number;
      }
    ).n;
  }
}
