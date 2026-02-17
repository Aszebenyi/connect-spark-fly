
CREATE TABLE lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  note_type text DEFAULT 'note',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes" ON lead_notes FOR ALL USING (user_id = auth.uid());
