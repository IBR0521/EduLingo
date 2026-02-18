-- Learning Paths and Course Structure

-- Course modules/units
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons within modules
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT, -- Rich content/instructions
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER DEFAULT 60,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student progress through learning path
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'locked')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- Course materials/resources
CREATE TABLE IF NOT EXISTS course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('document', 'video', 'audio', 'link', 'image', 'presentation', 'other')),
  file_url TEXT,
  external_url TEXT,
  file_size INTEGER,
  duration_minutes INTEGER, -- For video/audio
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning objectives/skills
CREATE TABLE IF NOT EXISTS learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  skill_category VARCHAR(100), -- e.g., 'grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student skill mastery tracking
CREATE TABLE IF NOT EXISTS skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, objective_id)
);

-- Prerequisites (for unlocking content)
CREATE TABLE IF NOT EXISTS lesson_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  required_lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, required_lesson_id)
);

-- Indexes for performance
CREATE INDEX idx_course_modules_group ON course_modules(group_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_module ON student_progress(module_id);
CREATE INDEX idx_student_progress_lesson ON student_progress(lesson_id);
CREATE INDEX idx_course_materials_group ON course_materials(group_id);
CREATE INDEX idx_course_materials_module ON course_materials(module_id);
CREATE INDEX idx_course_materials_lesson ON course_materials(lesson_id);
CREATE INDEX idx_learning_objectives_group ON learning_objectives(group_id);
CREATE INDEX idx_skill_mastery_student ON skill_mastery(student_id);
CREATE INDEX idx_skill_mastery_objective ON skill_mastery(objective_id);







