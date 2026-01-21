-- Create Discussion Forums System
-- This script creates tables for discussion forums, topics, posts, and replies
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Uncomment if you need to drop and recreate tables
-- ============================================================================
-- DROP TABLE IF EXISTS forum_replies CASCADE;
-- DROP TABLE IF EXISTS forum_posts CASCADE;
-- DROP TABLE IF EXISTS forum_topics CASCADE;
-- DROP TABLE IF EXISTS forums CASCADE;

-- ============================================================================
-- STEP 1: Forums Table (one per group or course)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  course_id UUID, -- REFERENCES courses(id) ON DELETE SET NULL, -- Add FK later if courses table exists
  is_public BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Forum Topics (discussion threads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Forum Posts (replies to topics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE, -- For nested replies
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Forum Replies (reactions/likes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'helpful', 'thanks')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- ============================================================================
-- STEP 5: Forum Subscriptions (notifications for new posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_preference VARCHAR(20) DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, user_id)
);

-- ============================================================================
-- STEP 6: Add Foreign Key Constraints (if courses table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forums_course_id_fkey') THEN
        ALTER TABLE forums ADD CONSTRAINT forums_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Create Indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forums') THEN
    CREATE INDEX IF NOT EXISTS idx_forums_group ON forums(group_id);
    CREATE INDEX IF NOT EXISTS idx_forums_course ON forums(course_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_topics_forum ON forum_topics(forum_id);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON forum_topics(author_id);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned ON forum_topics(is_pinned, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_updated ON forum_topics(last_reply_at DESC NULLS LAST);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_posts_topic ON forum_posts(topic_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_post_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_reactions') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_reactions_post ON forum_reactions(post_id);
    CREATE INDEX IF NOT EXISTS idx_forum_reactions_user ON forum_reactions(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_subscriptions') THEN
    CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_forum ON forum_subscriptions(forum_id);
    CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_topic ON forum_subscriptions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_forum_subscriptions_user ON forum_subscriptions(user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Create Trigger to Update Topic Reply Count
-- ============================================================================

-- Drop existing function if it exists (outside DO block)
DROP FUNCTION IF EXISTS update_forum_topic_stats() CASCADE;

-- Create function to update topic stats (outside DO block)
CREATE OR REPLACE FUNCTION update_forum_topic_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_topics
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        last_reply_by = NEW.author_id
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_topics
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_posts') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'forum_topics') THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS trigger_update_forum_topic_stats ON forum_posts;
    
    -- Create trigger
    EXECUTE 'CREATE TRIGGER trigger_update_forum_topic_stats
      AFTER INSERT OR DELETE ON forum_posts
      FOR EACH ROW
      EXECUTE FUNCTION update_forum_topic_stats()';
  END IF;
END $$;

