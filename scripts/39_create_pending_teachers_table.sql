-- Create pending_teachers table (similar to pending_students)
CREATE TABLE IF NOT EXISTS pending_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for pending_teachers
ALTER TABLE pending_teachers ENABLE ROW LEVEL SECURITY;

-- Allow main teachers to insert pending teachers
CREATE POLICY "Main teachers can insert pending teachers" ON pending_teachers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Allow main teachers to view pending teachers
CREATE POLICY "Main teachers can view pending teachers" ON pending_teachers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Allow main teachers to delete pending teachers
CREATE POLICY "Main teachers can delete pending teachers" ON pending_teachers
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'main_teacher')
);

-- Allow service role full access
CREATE POLICY "Service role has full access to pending_teachers" ON pending_teachers
FOR ALL USING (true) WITH CHECK (true);







