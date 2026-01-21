export type UserRole = "main_teacher" | "teacher" | "student" | "parent"

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone_number?: string
  has_phone?: boolean
  age?: number
  english_level?: string
  certificate_type?: "IELTS" | "CEFR"
  // Teacher-specific fields
  ielts_score?: number
  etk?: string // ETK (English Teaching Knowledge)
  salary_amount?: number
  salary_due_date?: string
  last_salary_date?: string
  salary_status?: "paid" | "pending" | "overdue"
  employment_start_date?: string
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  teacher_id?: string
  teacher?: User
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  group_id: string
  course_id?: string
  lesson_id?: string
  title: string
  description?: string
  due_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Auto-grading fields
  is_auto_graded?: boolean
  assessment_type?: "quiz" | "test" | "homework" | "project"
  time_limit_minutes?: number
  max_attempts?: number
  show_results_immediately?: boolean
  randomize_questions?: boolean
  randomize_options?: boolean
  questions?: AssessmentQuestion[]
}

export interface AssessmentQuestion {
  id: string
  assignment_id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "fill_blank" | "matching" | "ordering" | "short_answer" | "essay"
  options?: string[]
  correct_answer: string
  correct_answers?: any // JSONB for complex answers
  points: number
  order_index: number
  explanation?: string
  case_sensitive?: boolean
  partial_credit?: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  attempt_number: number
  score: number
  total_points: number
  earned_points: number
  time_taken_seconds?: number
  started_at: string
  submitted_at?: string
  is_completed: boolean
  auto_graded: boolean
  graded_at?: string
  feedback?: string
  created_at: string
  updated_at: string
  answers?: AssessmentAnswer[]
}

export interface AssessmentAnswer {
  id: string
  submission_id: string
  question_id: string
  student_answer?: string
  student_answers?: any // JSONB for complex answers
  is_correct?: boolean
  points_earned: number
  points_possible: number
  auto_feedback?: string
  answered_at: string
  question?: AssessmentQuestion
}

export interface Schedule {
  id: string
  group_id: string
  course_id?: string
  lesson_id?: string
  subject: string
  date: string
  duration_minutes: number
  notes?: string
  created_at: string
  // Recurring schedule fields
  is_recurring?: boolean
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "custom"
  recurrence_end_date?: string
  recurrence_interval?: number
  recurrence_days_of_week?: number[] // [1,3,5] for Mon, Wed, Fri (1=Monday)
  recurrence_day_of_month?: number
  parent_schedule_id?: string
  // Calendar sync fields
  calendar_sync_id?: string
  calendar_provider?: "google" | "outlook" | "apple" | "ics"
  is_cancelled?: boolean
  location?: string
  meeting_url?: string
}

export interface CalendarSyncSettings {
  id: string
  user_id: string
  group_id: string
  provider: "google" | "outlook" | "apple" | "ics"
  access_token?: string
  refresh_token?: string
  calendar_id?: string
  is_active: boolean
  last_sync_at?: string
  sync_direction: "import" | "export" | "bidirectional"
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  schedule_id: string
  student_id: string
  status: "present" | "absent" | "late" | "excused"
  notes?: string
  marked_by?: string
  created_at: string
}

export interface Grade {
  id: string
  student_id: string
  group_id: string
  assignment_id?: string
  score: number
  category: string
  notes?: string
  graded_by?: string
  created_at: string
  updated_at: string
}

export interface Participation {
  id: string
  student_id: string
  group_id: string
  schedule_id?: string
  score: number
  notes?: string
  marked_by?: string
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  sender?: User
  recipient?: User
  subject?: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

// Course Hierarchy Types
export interface Course {
  id: string
  name: string
  description?: string
  level?: string
  category?: string
  duration_hours?: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  modules?: CourseModule[]
  homeworks?: CourseHomework[] // Homeworks assigned when creating course
}

export interface CourseHomework {
  title: string
  description?: string
  due_date?: string // Optional due date for homework
}

export interface CourseGroupAssignment {
  id: string
  course_id: string
  group_id: string
  course_date: string // Date when course will be held
  course_time: string // Time (HH:MM format) when course will be held
  created_by?: string
  created_at: string
  updated_at: string
  course?: Course
  group?: Group
}

export interface CourseModule {
  id: string
  course_id: string
  name: string
  description?: string
  order_index: number
  estimated_hours?: number
  created_at: string
  updated_at: string
  lessons?: CourseLesson[]
}

export interface CourseLesson {
  id: string
  module_id: string
  name: string
  description?: string
  order_index: number
  estimated_minutes: number
  lesson_type?: string
  content?: string
  created_at: string
  updated_at: string
  topics?: CourseTopic[]
}

export interface CourseTopic {
  id: string
  lesson_id: string
  name: string
  description?: string
  order_index: number
  content?: string
  created_at: string
  updated_at: string
}

export interface GroupCourse {
  id: string
  group_id: string
  course_id: string
  started_at: string
  completed_at?: string
  progress_percentage: number
  created_at: string
  course?: Course
}

export interface CourseTemplate {
  id: string
  name: string
  description?: string
  level?: string
  category?: string
  template_data?: any
  created_by?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface StudentCourseProgress {
  id: string
  student_id: string
  course_id: string
  module_id: string
  lesson_id: string
  topic_id?: string
  status: "not_started" | "in_progress" | "completed" | "skipped"
  progress_percentage: number
  started_at?: string
  completed_at?: string
  time_spent_minutes: number
  created_at: string
  updated_at: string
}

// Rubric-Based Grading Types
export interface Rubric {
  id: string
  name: string
  description?: string
  assignment_id?: string
  course_id?: string
  created_by?: string
  is_template: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  criteria?: RubricCriterion[]
}

export interface RubricCriterion {
  id: string
  rubric_id: string
  name: string
  description?: string
  max_points: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface RubricGrade {
  id: string
  rubric_id: string
  student_id: string
  assignment_id: string
  criterion_id: string
  points_awarded: number
  feedback?: string
  graded_by?: string
  created_at: string
  updated_at: string
  criterion?: RubricCriterion
}

// Analytics Types
export interface StudentPerformanceMetrics {
  id: string
  student_id: string
  group_id: string
  course_id?: string
  metric_date: string
  average_grade?: number
  assignment_completion_rate?: number
  attendance_rate?: number
  participation_score?: number
  time_on_task_minutes?: number
  assignments_submitted?: number
  assignments_total?: number
  classes_attended?: number
  classes_total?: number
  created_at: string
  updated_at: string
}

export interface StudentEngagementScore {
  id: string
  student_id: string
  group_id: string
  score_date: string
  overall_score: number
  login_frequency?: number
  assignment_engagement?: number
  participation_engagement?: number
  communication_engagement?: number
  created_at: string
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  snapshot_type: "daily" | "weekly" | "monthly"
  snapshot_date: string
  group_id: string
  teacher_id?: string
  metrics?: any // JSONB
  created_at: string
}

export interface AtRiskStudent {
  id: string
  student_id: string
  group_id: string
  risk_level: "low" | "medium" | "high" | "critical"
  risk_factors?: any // JSONB array
  predicted_outcome?: string
  confidence_score?: number
  flagged_at: string
  resolved_at?: string
  notes?: string
  flagged_by?: string
  created_at: string
  updated_at: string
  student?: User
}

// Placement Testing Types
export interface PlacementTest {
  id: string
  name: string
  description?: string
  level?: string
  category?: string
  duration_minutes?: number
  passing_score?: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  questions?: PlacementTestQuestion[]
}

export interface PlacementTestQuestion {
  id: string
  test_id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "fill_blank" | "essay"
  options?: string[] // JSONB array
  correct_answer: string
  points: number
  order_index: number
  explanation?: string
  created_at: string
  updated_at: string
}

export interface PlacementTestResult {
  id: string
  test_id: string
  student_id: string
  score: number
  total_points: number
  earned_points: number
  recommended_level?: string
  time_taken_minutes?: number
  started_at: string
  completed_at?: string
  is_completed: boolean
  created_at: string
  updated_at: string
  test?: PlacementTest
}

export interface PlacementTestAnswer {
  id: string
  result_id: string
  question_id: string
  student_answer?: string
  is_correct?: boolean
  points_earned: number
  answered_at: string
  question?: PlacementTestQuestion
}

// Discussion Forum Types
export interface Forum {
  id: string
  name: string
  description?: string
  group_id: string
  course_id?: string
  is_public: boolean
  is_locked: boolean
  created_by?: string
  created_at: string
  updated_at: string
  topics?: ForumTopic[]
}

export interface ForumTopic {
  id: string
  forum_id: string
  title: string
  content: string
  author_id: string
  is_pinned: boolean
  is_locked: boolean
  view_count: number
  reply_count: number
  last_reply_at?: string
  last_reply_by?: string
  created_at: string
  updated_at: string
  author?: User
  posts?: ForumPost[]
}

export interface ForumPost {
  id: string
  topic_id: string
  content: string
  author_id: string
  parent_post_id?: string
  is_edited: boolean
  edited_at?: string
  created_at: string
  updated_at: string
  author?: User
  parent_post?: ForumPost
  reactions?: ForumReaction[]
}

export interface ForumReaction {
  id: string
  post_id: string
  user_id: string
  reaction_type: "like" | "helpful" | "thanks"
  created_at: string
}

export interface ForumSubscription {
  id: string
  forum_id?: string
  topic_id: string
  user_id: string
  notification_preference: "all" | "mentions" | "none"
  created_at: string
}

// Enhanced File Management Types
export interface FileRecord {
  id: string
  uploaded_by: string
  assignment_id?: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: number
  created_at: string
  // Enhanced fields
  storage_provider?: "supabase" | "google_drive" | "dropbox" | "onedrive" | "s3" | "local"
  storage_path?: string
  storage_file_id?: string
  folder_id?: string
  is_public?: boolean
  download_count?: number
  thumbnail_url?: string
  mime_type?: string
  checksum?: string
  folder?: FileFolder
  tags?: FileTag[]
  versions?: FileVersion[]
}

export interface FileFolder {
  id: string
  name: string
  description?: string
  parent_folder_id?: string
  group_id: string
  course_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  parent_folder?: FileFolder
  files?: FileRecord[]
}

export interface FileVersion {
  id: string
  file_id: string
  version_number: number
  file_url: string
  storage_path?: string
  file_size?: number
  checksum?: string
  uploaded_by?: string
  change_notes?: string
  created_at: string
}

export interface FileTag {
  id: string
  name: string
  color?: string
  created_by?: string
  created_at: string
}

export interface FileShare {
  id: string
  file_id: string
  shared_with_user_id: string
  permission: "view" | "download" | "edit"
  expires_at?: string
  shared_by?: string
  created_at: string
}

export interface StorageQuota {
  id: string
  user_id: string
  group_id: string
  quota_bytes: number
  used_bytes: number
  created_at: string
  updated_at: string
}

// Video Conferencing Types
export interface VideoConference {
  id: string
  schedule_id?: string
  group_id: string
  title: string
  description?: string
  provider: "zoom" | "google_meet" | "microsoft_teams" | "jitsi" | "custom"
  meeting_id: string
  meeting_url: string
  meeting_password?: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  is_recording_enabled: boolean
  is_waiting_room_enabled: boolean
  created_by: string
  created_at: string
  updated_at: string
  participants?: VideoConferenceParticipant[]
}

export interface VideoConferenceParticipant {
  id: string
  conference_id: string
  user_id: string
  joined_at?: string
  left_at?: string
  duration_seconds?: number
  role: "host" | "co-host" | "participant"
  created_at: string
  user?: User
}
