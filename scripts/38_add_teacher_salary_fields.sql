-- Add teacher-specific fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ielts_score NUMERIC(3, 1),
ADD COLUMN IF NOT EXISTS etk VARCHAR(255),
ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS salary_due_date DATE,
ADD COLUMN IF NOT EXISTS last_salary_date DATE,
ADD COLUMN IF NOT EXISTS salary_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS employment_start_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN users.ielts_score IS 'IELTS score for teachers (0-9)';
COMMENT ON COLUMN users.etk IS 'English Teaching Knowledge certification (e.g., TEFL, TESOL, CELTA)';
COMMENT ON COLUMN users.salary_amount IS 'Monthly salary amount in UZS';
COMMENT ON COLUMN users.salary_due_date IS 'Next salary payment due date';
COMMENT ON COLUMN users.last_salary_date IS 'Date of last salary payment';
COMMENT ON COLUMN users.salary_status IS 'Salary payment status: paid, pending, overdue';
COMMENT ON COLUMN users.employment_start_date IS 'Date when teacher started employment';





