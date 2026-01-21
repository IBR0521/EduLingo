-- Add phone number field to users table for SMS notifications
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Add comment for Uzbekistan format
COMMENT ON COLUMN users.phone_number IS 'Phone number for SMS notifications (Uzbekistan format: +998XXXXXXXXX or local: 9XXXXXXXXX)';

