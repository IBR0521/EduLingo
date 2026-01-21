-- RLS Policies for Discussion Forums
-- Run this AFTER running 28_create_forums.sql

-- Enable RLS on all forum tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
    ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
    ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') THEN
    ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_reactions') THEN
    ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_subscriptions') THEN
    ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
    DROP POLICY IF EXISTS "Authenticated users can read forums" ON forums;
    DROP POLICY IF EXISTS "Teachers can manage forums" ON forums;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
    DROP POLICY IF EXISTS "Authenticated users can read topics" ON forum_topics;
    DROP POLICY IF EXISTS "Authenticated users can create topics" ON forum_topics;
    DROP POLICY IF EXISTS "Users can update own topics" ON forum_topics;
    DROP POLICY IF EXISTS "Teachers can manage topics" ON forum_topics;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') THEN
    DROP POLICY IF EXISTS "Authenticated users can read posts" ON forum_posts;
    DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
    DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
    DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;
    DROP POLICY IF EXISTS "Teachers can manage posts" ON forum_posts;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_reactions') THEN
    DROP POLICY IF EXISTS "Authenticated users can manage reactions" ON forum_reactions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_subscriptions') THEN
    DROP POLICY IF EXISTS "Users can manage own subscriptions" ON forum_subscriptions;
  END IF;
END $$;

-- Forums policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
    -- Authenticated users can read forums for their groups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_students') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read forums"
        ON forums FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND (
            is_public = TRUE OR
            group_id IN (
              SELECT group_id FROM group_students WHERE student_id = auth.uid()
            ) OR
            group_id IN (
              SELECT id FROM groups WHERE
                teacher_id = auth.uid() OR
                created_by = auth.uid() OR
                auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
            )
          )
        )';
    END IF;

    -- Teachers can manage forums
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage forums"
        ON forums FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          group_id IN (
            SELECT id FROM groups WHERE
              teacher_id = auth.uid() OR
              created_by = auth.uid() OR
              auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
          )
        )';
    END IF;
  END IF;
END $$;

-- Forum Topics policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'forum_topics' AND column_name = 'forum_id') THEN
    -- Authenticated users can read topics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
      EXECUTE 'CREATE POLICY "Authenticated users can read topics"
        ON forum_topics FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND
          forum_id IN (SELECT id FROM forums)
        )';
    END IF;

    -- Authenticated users can create topics
    CREATE POLICY "Authenticated users can create topics"
      ON forum_topics FOR INSERT
      WITH CHECK (author_id = auth.uid());

    -- Users can update their own topics
    CREATE POLICY "Users can update own topics"
      ON forum_topics FOR UPDATE
      USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());

    -- Teachers can manage all topics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage topics"
        ON forum_topics FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          forum_id IN (
            SELECT id FROM forums WHERE
              group_id IN (
                SELECT id FROM groups WHERE
                  teacher_id = auth.uid() OR
                  created_by = auth.uid() OR
                  auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
              )
          )
        )';
    END IF;
  END IF;
END $$;

-- Forum Posts policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'forum_posts' AND column_name = 'author_id') THEN
    -- Authenticated users can read posts
    CREATE POLICY "Authenticated users can read posts"
      ON forum_posts FOR SELECT
      USING (auth.role() = 'authenticated');

    -- Authenticated users can create posts
    CREATE POLICY "Authenticated users can create posts"
      ON forum_posts FOR INSERT
      WITH CHECK (author_id = auth.uid());

    -- Users can update their own posts
    CREATE POLICY "Users can update own posts"
      ON forum_posts FOR UPDATE
      USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());

    -- Users can delete their own posts
    CREATE POLICY "Users can delete own posts"
      ON forum_posts FOR DELETE
      USING (author_id = auth.uid());

    -- Teachers can manage all posts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
      EXECUTE 'CREATE POLICY "Teachers can manage posts"
        ON forum_posts FOR ALL
        USING (
          auth.uid() IN (SELECT id FROM users WHERE role IN (''main_teacher'', ''teacher'')) AND
          topic_id IN (
            SELECT id FROM forum_topics WHERE
              forum_id IN (
                SELECT id FROM forums WHERE
                  group_id IN (
                    SELECT id FROM groups WHERE
                      teacher_id = auth.uid() OR
                      created_by = auth.uid() OR
                      auth.uid() IN (SELECT id FROM users WHERE role = ''main_teacher'')
                  )
              )
          )
        )';
    END IF;
  END IF;
END $$;

-- Forum Reactions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_reactions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'forum_reactions' AND column_name = 'user_id') THEN
    -- Authenticated users can manage reactions
    CREATE POLICY "Authenticated users can manage reactions"
      ON forum_reactions FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Forum Subscriptions policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_subscriptions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'forum_subscriptions' AND column_name = 'user_id') THEN
    -- Users can manage their own subscriptions
    CREATE POLICY "Users can manage own subscriptions"
      ON forum_subscriptions FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;



