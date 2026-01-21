export const mockGroups = [
  {
    id: "1",
    name: "Advanced English A1",
    description: "Advanced level English course for adults",
    teacher_id: "teacher-1",
    teacher: { id: "teacher-1", full_name: "John Smith", email: "john@example.com" },
  },
  {
    id: "2",
    name: "Beginner English B1",
    description: "Beginner level English fundamentals",
    teacher_id: "teacher-2",
    teacher: { id: "teacher-2", full_name: "Sarah Johnson", email: "sarah@example.com" },
  },
]

export const mockStudents = [
  { id: "student-1", full_name: "Alice Williams", email: "alice@example.com", role: "student" as const },
  { id: "student-2", full_name: "Bob Davis", email: "bob@example.com", role: "student" as const },
  { id: "student-3", full_name: "Charlie Brown", email: "charlie@example.com", role: "student" as const },
]

export const mockTeachers = [
  { id: "teacher-1", full_name: "John Smith", email: "john@example.com", role: "teacher" as const },
  { id: "teacher-2", full_name: "Sarah Johnson", email: "sarah@example.com", role: "teacher" as const },
]

export const mockSchedules = [
  {
    id: "schedule-1",
    group_id: "1",
    subject: "Grammar & Writing",
    date: new Date().toISOString(),
    description: "Present perfect tense and essay writing",
    homework: "Write a 500-word essay using present perfect",
  },
  {
    id: "schedule-2",
    group_id: "1",
    subject: "Speaking & Listening",
    date: new Date(Date.now() + 86400000).toISOString(),
    description: "Conversation practice and pronunciation",
    homework: "Record a 3-minute audio about your daily routine",
  },
]

export const mockAssignments = [
  {
    id: "assignment-1",
    group_id: "1",
    title: "Essay on Modern Technology",
    description: "Write about how technology has changed education",
    due_date: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "assignment-2",
    group_id: "1",
    title: "Vocabulary Quiz Preparation",
    description: "Study units 5-7 vocabulary list",
    due_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 604800000).toISOString(),
  },
]

export const mockGrades = [
  { id: "grade-1", student_id: "student-1", category: "Midterm Exam", score: 85, created_at: new Date().toISOString() },
  { id: "grade-2", student_id: "student-1", category: "Essay", score: 92, created_at: new Date().toISOString() },
  { id: "grade-3", student_id: "student-1", category: "Quiz", score: 78, created_at: new Date().toISOString() },
]

export const mockAttendance = [
  { id: "att-1", student_id: "student-1", status: "present" as const, date: new Date().toISOString() },
  {
    id: "att-2",
    student_id: "student-1",
    status: "present" as const,
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "att-3",
    student_id: "student-1",
    status: "absent" as const,
    date: new Date(Date.now() - 172800000).toISOString(),
  },
]

export const mockMessages = [
  {
    id: "msg-1",
    sender_id: "teacher-1",
    sender: { full_name: "John Smith", role: "teacher" },
    recipient_id: "student-1",
    subject: "Great progress!",
    body: "You're doing excellent work in class. Keep it up!",
    created_at: new Date().toISOString(),
    read: false,
  },
]

export const mockNotifications = [
  {
    id: "notif-1",
    user_id: "student-1",
    type: "assignment" as const,
    title: "New Assignment Posted",
    message: "Essay on Modern Technology is due in 2 days",
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-2",
    user_id: "student-1",
    type: "grade" as const,
    title: "New Grade Added",
    message: "You received 92/100 on your essay",
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]
