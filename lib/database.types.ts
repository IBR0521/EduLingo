export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "main_teacher" | "teacher" | "student" | "parent"
          created_at: string
          updated_at: string
          age?: number | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: "main_teacher" | "teacher" | "student" | "parent"
          created_at?: string
          updated_at?: string
          age?: number | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: "main_teacher" | "teacher" | "student" | "parent"
          created_at?: string
          updated_at?: string
          age?: number | null
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          teacher_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          teacher_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          teacher_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      group_students: {
        Row: {
          id: string
          group_id: string
          student_id: string
          enrolled_at: string
          monthly_payment_amount?: number | null
          payment_due_date?: string | null
          last_payment_date?: string | null
          payment_status?: string | null
          course_start_date?: string | null
        }
        Insert: {
          id?: string
          group_id: string
          student_id: string
          enrolled_at?: string
          monthly_payment_amount?: number | null
          payment_due_date?: string | null
          last_payment_date?: string | null
          payment_status?: string | null
          course_start_date?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          student_id?: string
          enrolled_at?: string
          monthly_payment_amount?: number | null
          payment_due_date?: string | null
          last_payment_date?: string | null
          payment_status?: string | null
          course_start_date?: string | null
        }
      }
      parent_student: {
        Row: {
          id: string
          parent_id: string | null
          student_id: string
          access_code: string
          is_linked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          student_id: string
          access_code: string
          is_linked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          student_id?: string
          access_code?: string
          is_linked?: boolean
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          group_id: string
          title: string
          description: string | null
          due_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          title: string
          description?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule: {
        Row: {
          id: string
          group_id: string
          subject: string
          date: string
          duration_minutes: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          subject: string
          date: string
          duration_minutes?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          subject?: string
          date?: string
          duration_minutes?: number
          notes?: string | null
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          schedule_id: string
          student_id: string
          status: "present" | "absent" | "late" | "excused"
          notes: string | null
          marked_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          student_id: string
          status: "present" | "absent" | "late" | "excused"
          notes?: string | null
          marked_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          student_id?: string
          status?: "present" | "absent" | "late" | "excused"
          notes?: string | null
          marked_by?: string | null
          created_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          student_id: string
          group_id: string
          assignment_id: string | null
          score: number
          category: string
          notes: string | null
          graded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          group_id: string
          assignment_id?: string | null
          score: number
          category: string
          notes?: string | null
          graded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          group_id?: string
          assignment_id?: string | null
          score?: number
          category?: string
          notes?: string | null
          graded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participation: {
        Row: {
          id: string
          student_id: string
          group_id: string
          schedule_id: string | null
          score: number
          notes: string | null
          marked_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          group_id: string
          schedule_id?: string | null
          score: number
          notes?: string | null
          marked_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          group_id?: string
          schedule_id?: string | null
          score?: number
          notes?: string | null
          marked_by?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          subject: string | null
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          subject?: string | null
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          subject?: string | null
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          uploaded_by: string
          assignment_id: string
          file_name: string
          file_url: string
          file_type: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          uploaded_by: string
          assignment_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          uploaded_by?: string
          assignment_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
      }
    }
  }
}
