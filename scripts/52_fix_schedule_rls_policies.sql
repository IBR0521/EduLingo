    -- ============================================================================
    -- FIX SCHEDULE RLS POLICIES - Add INSERT, UPDATE, DELETE policies
    -- ============================================================================
    -- The platform previously only allowed SELECT on schedule, which breaks
    -- creating/editing/removing weekly recurring schedules.
    -- Run this in Supabase SQL Editor.
    -- ============================================================================

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Teachers can insert schedule" ON schedule;
    DROP POLICY IF EXISTS "Teachers can update schedule" ON schedule;
    DROP POLICY IF EXISTS "Teachers can delete schedule" ON schedule;
    DROP POLICY IF EXISTS "Teachers can manage schedule" ON schedule;

    -- INSERT: main_teacher can insert any schedule; teacher can insert for their groups
    CREATE POLICY "Teachers can insert schedule"
    ON schedule FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        OR (
            auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
            AND group_id IN (
            SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
            )
        )
        )
    );

    -- UPDATE: main_teacher can update any schedule; teacher can update schedules for their groups
    CREATE POLICY "Teachers can update schedule"
    ON schedule FOR UPDATE
    USING (
        auth.role() = 'authenticated'
        AND (
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        OR (
            auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
            AND group_id IN (
            SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
            )
        )
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND (
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        OR (
            auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
            AND group_id IN (
            SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
            )
        )
        )
    );

    -- DELETE: main_teacher can delete any schedule; teacher can delete schedules for their groups
    CREATE POLICY "Teachers can delete schedule"
    ON schedule FOR DELETE
    USING (
        auth.role() = 'authenticated'
        AND (
        auth.uid() IN (SELECT id FROM users WHERE role = 'main_teacher')
        OR (
            auth.uid() IN (SELECT id FROM users WHERE role = 'teacher')
            AND group_id IN (
            SELECT id FROM groups WHERE teacher_id = auth.uid() OR created_by = auth.uid()
            )
        )
        )
    );

    -- Verify policies
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schedule'
    ORDER BY cmd, policyname;


