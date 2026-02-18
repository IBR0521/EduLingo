-- Fix course_modules table schema
-- This script ensures course_modules has the correct structure for the course hierarchy

-- Check if course_modules exists with wrong schema (has group_id instead of course_id)
DO $$
BEGIN
  -- If course_modules exists but doesn't have course_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'course_modules'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_modules' 
    AND column_name = 'course_id'
  ) THEN
    -- Drop the old table and recreate with correct schema
    DROP TABLE IF EXISTS course_modules CASCADE;
    
    -- Recreate with correct schema
    CREATE TABLE course_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      estimated_hours INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(course_id, order_index)
    );
    
    RAISE NOTICE 'course_modules table recreated with course_id column';
  END IF;
  
  -- If course_modules doesn't exist at all, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'course_modules'
  ) THEN
    CREATE TABLE course_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      estimated_hours INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(course_id, order_index)
    );
    
    RAISE NOTICE 'course_modules table created';
  END IF;
END $$;

-- Ensure courses table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'courses'
  ) THEN
    CREATE TABLE courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      level VARCHAR(50),
      category VARCHAR(100),
      duration_hours INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'courses table created';
  END IF;
END $$;




