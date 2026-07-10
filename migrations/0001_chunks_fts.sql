-- FTS5 external-content mirror of `chunks.text` for the BM25 retrieval lane.
-- Hand-written (drizzle does not model FTS5 virtual tables). External-content keeps
-- the index storage-lean by pointing at `chunks` via its implicit integer rowid; the
-- BM25 lane joins matches back to `chunks` on rowid. Tokenizer: porter + unicode61
-- (stemming for recall on prose reports). Sync triggers keep the index consistent with
-- the (single-writer, out-of-band) ingest pipeline; ingest is the only writer of chunks.
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  text,
  content='chunks',
  content_rowid='rowid',
  tokenize='porter unicode61'
);
--> statement-breakpoint
CREATE TRIGGER chunks_fts_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, text) VALUES (new.rowid, new.text);
END;
--> statement-breakpoint
CREATE TRIGGER chunks_fts_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
END;
--> statement-breakpoint
CREATE TRIGGER chunks_fts_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
  INSERT INTO chunks_fts(rowid, text) VALUES (new.rowid, new.text);
END;
