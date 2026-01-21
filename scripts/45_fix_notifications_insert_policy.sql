-- Fix notifications INSERT policy so users can create notifications for others
-- This is needed for the message notification system

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

-- Allow authenticated users to insert notifications for any user_id
-- This is needed for system notifications (like when someone sends a message)
CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Alternative: More restrictive policy that only allows inserting notifications for yourself
-- Uncomment this and comment the above if you want more restrictive access
-- CREATE POLICY "Users can insert notifications"
--   ON notifications FOR INSERT
--   WITH CHECK (user_id = auth.uid() OR auth.role() = 'authenticated');

