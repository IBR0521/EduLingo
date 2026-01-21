-- Gamification system tables

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges/achievements
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(100) NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Points history (for tracking and analytics)
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL, -- 'assignment_complete', 'attendance', 'grade', etc.
  source_id UUID, -- ID of the related record (assignment_id, attendance_id, etc.)
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard view (for class/group rankings)
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER,
  total_points INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_points_history_user ON points_history(user_id);
CREATE INDEX idx_points_history_created ON points_history(created_at);
CREATE INDEX idx_leaderboard_group ON leaderboard(group_id);
CREATE INDEX idx_leaderboard_points ON leaderboard(total_points DESC);

-- Function to update user progress
CREATE OR REPLACE FUNCTION update_user_progress(
  p_user_id UUID,
  p_points INTEGER,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  v_current_points INTEGER;
  v_current_level INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_activity DATE;
BEGIN
  -- Get or create user progress
  INSERT INTO user_progress (user_id, total_points, current_level, last_activity_date)
  VALUES (p_user_id, p_points, 1, p_activity_date)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_points = user_progress.total_points + p_points,
    last_activity_date = p_activity_date,
    updated_at = NOW()
  RETURNING total_points, current_streak, longest_streak, last_activity_date
  INTO v_current_points, v_current_streak, v_longest_streak, v_last_activity;

  -- Calculate streak
  IF v_last_activity IS NULL OR v_last_activity < p_activity_date THEN
    IF v_last_activity IS NULL OR v_last_activity = p_activity_date - INTERVAL '1 day' THEN
      v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSE
      v_current_streak := 1;
    END IF;
    
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  END IF;

  -- Calculate level based on points
  v_current_level := CASE
    WHEN v_current_points >= 5000 THEN 8
    WHEN v_current_points >= 3500 THEN 7
    WHEN v_current_points >= 2000 THEN 6
    WHEN v_current_points >= 1000 THEN 5
    WHEN v_current_points >= 500 THEN 4
    WHEN v_current_points >= 250 THEN 3
    WHEN v_current_points >= 100 THEN 2
    ELSE 1
  END;

  -- Update user progress
  UPDATE user_progress
  SET 
    current_level = v_current_level,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

