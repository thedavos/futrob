CREATE TABLE IF NOT EXISTS organization_operation_audit (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competition_id TEXT REFERENCES competitions(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES actors(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  request_id TEXT,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  object_label TEXT
);
CREATE INDEX IF NOT EXISTS organization_operation_audit_page_index
  ON organization_operation_audit (organization_id, occurred_at DESC, id DESC);
CREATE OR REPLACE FUNCTION organization_operation_audit_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'organization_operation_audit is append-only' USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER organization_operation_audit_append_only
  BEFORE UPDATE OR DELETE ON organization_operation_audit
  FOR EACH ROW EXECUTE FUNCTION organization_operation_audit_append_only();
