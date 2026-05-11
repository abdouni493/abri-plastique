-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('verser', 'percevoir')),
  amount DECIMAL NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  hour TIME NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  CONSTRAINT appointment_target_check CHECK (
    (client_id IS NOT NULL AND supplier_id IS NULL) OR
    (client_id IS NULL AND supplier_id IS NOT NULL)
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_supplier_id ON appointments(supplier_id);

-- Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create new
DROP POLICY IF EXISTS "Enable all for authenticated users" ON appointments;
CREATE POLICY "Enable all for authenticated users" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
