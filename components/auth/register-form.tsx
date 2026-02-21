"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Loader2 } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<UserRole>("student")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [hasPhone, setHasPhone] = useState(true) // For students: true = has phone, false = no phone
  const [age, setAge] = useState("")
  const [englishLevel, setEnglishLevel] = useState("")
  const [certificateType, setCertificateType] = useState<"IELTS" | "CEFR" | "">("")
  // Teacher-specific fields
  const [ieltsScore, setIeltsScore] = useState("")
  const [etk, setEtk] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const validateForm = (): boolean => {
    // Validate full name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters long")
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return false
    }

    // Validate password
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }

    if (!/(?=.*[a-z])/.test(password)) {
      setError("Password must contain at least one lowercase letter")
      return false
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      setError("Password must contain at least one uppercase letter")
      return false
    }

    if (!/(?=.*\d)/.test(password)) {
      setError("Password must contain at least one number")
      return false
    }

    // Validate phone number based on role
    if (role === "parent") {
      // Parents MUST have phone number
      if (!phoneNumber.trim()) {
        setError("Phone number is required for parents")
        return false
      }
      // Validate Uzbekistan phone format
      // Accept: +998XXXXXXXXX (13 chars), 998XXXXXXXXX (12 chars), or 9XXXXXXXXX (9-10 chars)
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "")
      let isValid = false
      
      if (cleanPhone.startsWith("+998") && cleanPhone.length === 13 && /^\+998\d{9}$/.test(cleanPhone)) {
        // Format: +998XXXXXXXXX (13 characters)
        isValid = true
      } else if (cleanPhone.startsWith("998") && cleanPhone.length === 12 && /^998\d{9}$/.test(cleanPhone)) {
        // Format: 998XXXXXXXXX (12 characters)
        isValid = true
      } else if (cleanPhone.length >= 9 && cleanPhone.length <= 10 && /^\d{9,10}$/.test(cleanPhone)) {
        // Format: 9XXXXXXXXX or 9XXXXXXXXXX (9-10 digits, local format)
        // Accept any 9-10 digit number starting with any digit
        isValid = true
      }
      
      if (!isValid) {
        setError("Please enter a valid Uzbekistan phone number (format: +998XXXXXXXXX or 9XXXXXXXXX)")
        return false
      }
    } else if (role === "student") {
      // Students can choose "no phone"
      if (hasPhone && !phoneNumber.trim()) {
        setError("Please enter your phone number or select 'No Phone'")
        return false
      }
      if (hasPhone) {
        // Validate Uzbekistan phone format if they have a phone
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "")
        let isValid = false
        
        if (cleanPhone.startsWith("+998") && cleanPhone.length === 13 && /^\+998\d{9}$/.test(cleanPhone)) {
          // Format: +998XXXXXXXXX (13 characters)
          isValid = true
        } else if (cleanPhone.startsWith("998") && cleanPhone.length === 12 && /^998\d{9}$/.test(cleanPhone)) {
          // Format: 998XXXXXXXXX (12 characters)
          isValid = true
        } else if (cleanPhone.length >= 9 && cleanPhone.length <= 10 && /^\d{9,10}$/.test(cleanPhone)) {
          // Format: 9XXXXXXXXX or 9XXXXXXXXXX (9-10 digits, local format)
          // Accept any 9-10 digit number starting with any digit
          isValid = true
        }
        
        if (!isValid) {
          setError("Please enter a valid Uzbekistan phone number (format: +998XXXXXXXXX or 9XXXXXXXXX)")
          return false
        }
      }
      
      // Validate student-specific fields
      if (!age || parseInt(age) < 5 || parseInt(age) > 100) {
        setError("Please enter a valid age (5-100)")
        return false
      }
      if (!englishLevel.trim()) {
        setError("Please enter your English level")
        return false
      }
      if (!certificateType) {
        setError("Please select your certificate type (IELTS or CEFR)")
        return false
      }
    }

    // Validate teacher-specific fields
    if (role === "teacher" || role === "main_teacher") {
      if (!age || isNaN(parseInt(age)) || parseInt(age) <= 0) {
        setError("Please enter a valid age")
        return false
      }
      if (!phoneNumber.trim()) {
        setError("Phone number is required for teachers")
        return false
      }
      // Validate Uzbekistan phone format for teachers
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "")
      let isValid = false
      
      if (cleanPhone.startsWith("+998") && cleanPhone.length === 13 && /^\+998\d{9}$/.test(cleanPhone)) {
        isValid = true
      } else if (cleanPhone.startsWith("998") && cleanPhone.length === 12 && /^998\d{9}$/.test(cleanPhone)) {
        isValid = true
      } else if (cleanPhone.length >= 9 && cleanPhone.length <= 10 && /^\d{9,10}$/.test(cleanPhone)) {
        // Accept any 9-10 digit number (local format)
        isValid = true
      }
      
      if (!isValid) {
        setError("Please enter a valid Uzbekistan phone number (format: +998XXXXXXXXX or 9XXXXXXXXX)")
        return false
      }
      if (!ieltsScore || isNaN(parseFloat(ieltsScore)) || parseFloat(ieltsScore) < 0 || parseFloat(ieltsScore) > 9) {
        setError("Please enter a valid IELTS score (0-9)")
        return false
      }
      if (!etk.trim()) {
        setError("ETK (English Teaching Knowledge) is required")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Log the role being used BEFORE validation
    console.log("Registration form submitted with role:", role, "email:", email)

    // Validate form
    if (!validateForm()) {
      setLoading(false)
      return
    }
    
    // Log the role again after validation to ensure it's still correct
    console.log("After validation - role:", role, "fullName:", fullName)

    try {
      console.log("Starting registration process...", { email, role, fullName: fullName.substring(0, 10) + "..." })
      const supabase = createClient()

      // Check if email exists in pending_students or pending_teachers table (created by main teacher)
      let existingPendingStudent = null
      let existingPendingTeacher = null
      if (role === "student") {
        const { data: pendingStudent } = await supabase
          .from("pending_students")
          .select("*")
          .eq("email", email)
          .single()
        
        if (pendingStudent) {
          existingPendingStudent = pendingStudent
          console.log("Found pending student, will create user profile and link after signup")
        }
      } else if (role === "teacher") {
        const { data: pendingTeacher } = await supabase
          .from("pending_teachers")
          .select("*")
          .eq("email", email)
          .single()
        
        if (pendingTeacher) {
          existingPendingTeacher = pendingTeacher
          console.log("Found pending teacher, will create user profile and link after signup")
        }
      }

      // Check if email already exists in auth system before attempting registration
      // Note: Supabase doesn't provide a direct way to check, but we can catch the error
      
      // Track if user was created (even if there was an error)
      let userCreated = false

      // Sign up the user
      // Include all fields in metadata so the database trigger can use them
      const signupMetadata: any = {
        full_name: fullName,
        role: role,
      }
      
      // Add phone number and has_phone based on role
      if (role === "parent") {
        signupMetadata.phone_number = formattedPhone || null
        signupMetadata.has_phone = true
      } else if (role === "student") {
        signupMetadata.phone_number = hasPhone ? (formattedPhone || null) : null
        signupMetadata.has_phone = hasPhone
        // Add student-specific fields
        if (age) signupMetadata.age = parseInt(age)
        if (englishLevel) signupMetadata.english_level = englishLevel
        if (certificateType) signupMetadata.certificate_type = certificateType
      } else if (role === "teacher" || role === "main_teacher") {
        signupMetadata.phone_number = formattedPhone || null
        signupMetadata.has_phone = !!formattedPhone
        // Add teacher-specific fields
        if (age) signupMetadata.age = parseInt(age)
        if (ieltsScore) signupMetadata.ielts_score = parseFloat(ieltsScore)
        if (etk) signupMetadata.etk = etk
        signupMetadata.employment_start_date = new Date().toISOString().split('T')[0]
        signupMetadata.salary_status = "pending"
      } else {
        signupMetadata.phone_number = formattedPhone || null
        signupMetadata.has_phone = !!formattedPhone
      }
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: signupMetadata,
        },
      })

      if (signUpError) {
        // Log detailed signup error
        const signupErrorInfo = {
          message: signUpError.message,
          code: signUpError.code,
          status: (signUpError as any).status,
          name: (signUpError as any).name,
        }
        console.error("Signup error:", signupErrorInfo)
        
        // Check for "User already registered" error
        if (
          signUpError.message?.includes("User already registered") ||
          signUpError.message?.includes("already registered") ||
          signUpError.message?.includes("already exists") ||
          signUpError.message?.toLowerCase().includes("email address is already registered") ||
          signUpError.code === "user_already_registered"
        ) {
          setError("This email is already registered. Please sign in instead or use a different email address.")
          setLoading(false)
          return
        }
        
        // Check for "Database error" - this often means trigger failed but user might still be created
        if (signUpError.message?.includes("Database error") || signUpError.message?.includes("saving new user")) {
          console.warn("Trigger error detected. Checking if user was created anyway...")
          
          // Check if user exists in authData (sometimes Supabase returns user despite error)
          if (authData?.user) {
            userCreated = true
            console.log("User was created despite error:", (authData.user as any)?.id)
          } else {
            // Cannot verify without credentials - proceed optimistically
            // The profile creation logic will handle errors gracefully
            console.warn("Cannot verify if user was created. Proceeding optimistically...")
            // We'll check authData.user below - if it doesn't exist, we'll show error
          }
        } else {
          // Other errors - user likely wasn't created
          setError(signUpError.message || "Failed to create account. Please try again.")
          setLoading(false)
          return
        }
      } else {
        userCreated = true
      }

      // Proceed if user was created (either from successful signup or despite error)
      if (authData?.user || userCreated) {
        // Get user ID
        const actualUserId = authData?.user?.id
        
        if (!actualUserId) {
          setError("User account was not created. Please try again.")
          setLoading(false)
          return
        }
        // The database trigger should create the profile automatically
        // But if it failed (e.g., "Database error saving new user"), we'll create it manually
        // Wait a moment for the trigger to run (if it's going to run)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        // Check if profile was created by trigger
        // Note: This might fail if session isn't available, but that's OK
        // The trigger creates the profile regardless of session
        let profileData = null
        let profileError = null
        
        // Get session - should be available immediately after signup
        let session = authData.session
        let attempts = 0
        const maxSessionAttempts = 5
        
        // Retry getting session if not immediately available
        while (!session && attempts < maxSessionAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200))
          const { data: { session: retrySession }, error: sessionError } = await supabase.auth.getSession()
          if (retrySession) {
            session = retrySession
            break
          }
          if (sessionError && sessionError.message !== "Auth session missing!") {
            console.error("Session error during registration:", sessionError)
          }
          attempts++
        }
        
        const hasSession = !!session
        
        // If no session, try to sign in with the credentials to get one
        if (!hasSession && authData.user) {
          console.log("No session after signup, attempting to sign in...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInData?.session) {
            session = signInData.session
            console.log("Successfully signed in after registration")
          } else if (signInError) {
            console.error("Failed to sign in after registration:", signInError)
          }
        }
        
        console.log("Registration status:", {
          userId: actualUserId,
          email: email,
          role: role,
          hasSession: hasSession,
          sessionFromSignup: !!authData?.session,
        })
        
        // Only try to check/update profile if we have a session
        // Otherwise, rely entirely on the trigger
        if (hasSession) {
          const { data: existingProfile, error: checkError } = await supabase
            .from("users")
            .select("*")
            .eq("id", actualUserId)
            .single()
          
          if (existingProfile && !checkError) {
            profileData = existingProfile
            console.log("Profile found (created by trigger):", existingProfile)
            
            // If role doesn't match, try to update (we have session)
            if (existingProfile && 'role' in existingProfile && existingProfile.role !== role) {
              console.log("Role mismatch. Updating from", (existingProfile as any).role, "to", role)
              const { data: updatedProfile, error: updateError } = await supabase
                .from("users")
                .update({ role: role as any })
                .eq("id", actualUserId)
                .select()
                .single()
              
              if (updatedProfile && !updateError) {
                profileData = updatedProfile
                console.log("Role updated successfully")
              } else if (updateError) {
                const updateErrorInfo = {
                  message: updateError.message,
                  code: updateError.code,
                  status: (updateError as any)?.status,
                }
                console.error("Failed to update role:", updateErrorInfo)
                // Continue with existing profile
              }
            }
          } else if (checkError) {
            console.warn("Could not check profile (this is OK if trigger will create it):", checkError.message)
            profileError = checkError
          }
        } else {
          // No session available - try to get one
          console.log("No session available. Attempting to sign in...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInData?.session) {
            session = signInData.session
            console.log("Successfully signed in, retrying profile check...")
            // Retry profile check with new session
            const { data: retryProfile, error: retryError } = await supabase
              .from("users")
              .select("*")
              .eq("id", actualUserId)
              .single()
            if (retryProfile && !retryError) {
              profileData = retryProfile
              console.log("Profile found after sign in:", retryProfile)
            }
          } else {
            console.error("Failed to sign in:", signInError)
          }
        }

        // Format phone number for Uzbekistan (needed for both update and insert)
        let formattedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, "")
        if (formattedPhone && !formattedPhone.startsWith("+")) {
          if (formattedPhone.startsWith("9") && formattedPhone.length === 9) {
            formattedPhone = `+998${formattedPhone}`
          } else if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
            formattedPhone = `+${formattedPhone}`
          } else if (!formattedPhone.startsWith("+998")) {
            formattedPhone = `+998${formattedPhone}`
          }
        }

        // Check if this is a pending student completing registration
        if (existingPendingStudent && role === "student" && hasSession) {
          console.log("Found pending student. Creating user profile and removing from pending...")
          
          // Create user profile with student details
          const insertData: any = {
            id: actualUserId,
            email: email,
            full_name: fullName,
            role: "student",
            phone_number: hasPhone ? (formattedPhone || (existingPendingStudent as any)?.phone_number || null) : null,
            has_phone: hasPhone,
            age: parseInt(age) || null,
            english_level: englishLevel || null,
            certificate_type: certificateType || null,
          }
          
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert(insertData)
            .select()
            .single()
          
          if (newProfile && !insertError) {
            profileData = newProfile
            console.log("Pending student profile created successfully:", newProfile)
            
            // Remove from pending_students table
            await supabase
              .from("pending_students")
              .delete()
              .eq("id", (existingPendingStudent as any)?.id)
          } else if (insertError) {
            console.error("Failed to create pending student profile:", insertError)
            // Continue with normal flow if insert fails
          }
        }

        // Check if this is a pending teacher completing registration
        if (existingPendingTeacher && role === "teacher" && hasSession) {
          console.log("Found pending teacher. Creating user profile and removing from pending...")
          
          // Create user profile with teacher details
          const insertData: any = {
            id: actualUserId,
            email: email,
            full_name: fullName,
            role: "teacher",
            phone_number: formattedPhone || (existingPendingTeacher as any)?.phone_number || null,
            has_phone: !!formattedPhone,
            age: parseInt(age) || null,
            ielts_score: parseFloat(ieltsScore) || null,
            etk: etk || null,
            employment_start_date: new Date().toISOString().split('T')[0],
            salary_status: "pending",
          }
          
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert(insertData)
            .select()
            .single()
          
          if (newProfile && !insertError) {
            profileData = newProfile
            console.log("Pending teacher profile created successfully:", newProfile)
            
            // Remove from pending_teachers table
            await supabase
              .from("pending_teachers")
              .delete()
              .eq("id", (existingPendingTeacher as any)?.id)
          } else if (insertError) {
            console.error("Failed to create pending teacher profile:", insertError)
            // Continue with normal flow if insert fails
          }
        }

        // If profile doesn't exist and we have a session, try to create it manually
        // This is a fallback if the trigger failed
        if (!profileData && hasSession) {
          console.log("Profile not found. Attempting to create it manually (trigger may have failed)...")
          
          const insertData: any = {
            id: actualUserId,
            email: email,
            full_name: fullName,
            role: role,
          }

          // Add phone number and has_phone based on role
          if (role === "parent") {
            // Parents must have phone
            insertData.phone_number = formattedPhone || null
            insertData.has_phone = true
          } else if (role === "student") {
            // Students can have no phone
            insertData.phone_number = hasPhone ? (formattedPhone || null) : null
            insertData.has_phone = hasPhone
            // Add student-specific fields
            insertData.age = parseInt(age) || null
            insertData.english_level = englishLevel || null
            insertData.certificate_type = certificateType || null
          } else if (role === "teacher" || role === "main_teacher") {
            // Teachers and main teachers - required phone
            insertData.phone_number = formattedPhone || null
            insertData.has_phone = !!formattedPhone
            // Add teacher-specific fields
            insertData.age = parseInt(age) || null
            insertData.ielts_score = parseFloat(ieltsScore) || null
            insertData.etk = etk || null
            insertData.employment_start_date = new Date().toISOString().split('T')[0] // Set employment start date to today
            insertData.salary_status = "pending" // Initial salary status
          } else {
            // Other roles
            insertData.phone_number = formattedPhone || null
            insertData.has_phone = !!formattedPhone
          }
          console.log("Creating profile with data:", insertData)
          
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert(insertData)
            .select()
            .single()
          
          if (newProfile && !insertError) {
            profileData = newProfile
            console.log("Profile created successfully (manual fallback):", newProfile)
          } else if (insertError) {
            const insertErrorInfo = {
              message: insertError.message,
              code: insertError.code,
              status: (insertError as any)?.status,
            }
            console.error("Manual profile creation failed:", insertErrorInfo)
            profileError = insertError
            
            // Check if it's an RLS policy issue
            const status = insertErrorInfo.status
            const message = insertErrorInfo.message || ""
            
            if (status === 406 || message.includes("permission denied") || message.includes("row-level security")) {
              setError(`Database security error: RLS policies blocking profile creation. Please run 'scripts/08_verify_and_fix_rls.sql' and 'scripts/13_auto_create_profile_trigger.sql' in Supabase SQL Editor.`)
            } else if (message.includes("duplicate") || message.includes("already exists") || insertErrorInfo.code === "23505") {
              // Profile might have been created by trigger after we checked
              // Try to fetch it again
              const { data: retryProfile } = await supabase
                .from("users")
                .select("*")
                .eq("id", actualUserId)
                .single()
              
              if (retryProfile) {
                profileData = retryProfile
                console.log("Profile found on retry (created by trigger):", retryProfile)
              } else {
                setError(`Profile creation failed. Please try logging in - your account was created and the profile may be created automatically.`)
              }
            } else {
              setError(`Profile creation failed: ${insertErrorInfo.message || "Unknown error"}. Your account was created - please try logging in.`)
            }
            
            if (!profileData) {
              setLoading(false)
              return
            }
          }
        } else if (!profileData && !hasSession) {
          // No session and no profile - try to sign in to get session
          console.log("No session and no profile - attempting to sign in...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInData?.session) {
            session = signInData.session
            // Retry profile creation with session
            const { data: newProfile, error: insertError } = await supabase
              .from("users")
              .insert({
                id: actualUserId,
                email: email,
                full_name: fullName,
                role: role,
              })
              .select()
              .single()
            if (newProfile && !insertError) {
              profileData = newProfile
              console.log("Profile created after sign in:", newProfile)
            }
          }
        }
        
        // If no session, try to sign in to get one
        if (!session && !hasSession) {
          console.log("No session available - attempting to sign in to get session...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInData?.session) {
            session = signInData.session
            console.log("Successfully signed in to get session")
          }
        }

        // If student, create parent_student entry with access code
        // Only do this if we have a session (RLS requires it)
        if (role === "student" && session) {
          // Generate unique access code using crypto.randomUUID() for better uniqueness
          let accessCode: string
          let isUnique = false
          let attempts = 0
          const maxAttempts = 10

          while (!isUnique && attempts < maxAttempts) {
            // Use crypto.randomUUID() for better uniqueness, then take first 8 chars and uppercase
            // Format: XXXXXXXX (8 uppercase alphanumeric characters)
            const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
            accessCode = uuid.substring(0, 8)
            
            // Check if code already exists
            const { data: existing } = await supabase
              .from("parent_student")
              .select("id")
              .eq("access_code", accessCode)
              .single()

            if (!existing) {
              isUnique = true
            } else {
              attempts++
            }
          }

          if (isUnique && accessCode!) {
            const { data: insertData, error: parentStudentError } = await supabase
              .from("parent_student")
              .insert({
                student_id: actualUserId,
                access_code: accessCode,
                is_linked: false,
              })
              .select()

            if (parentStudentError) {
              // Log detailed error information
              const errorInfo = {
                message: parentStudentError.message,
                code: parentStudentError.code,
                details: parentStudentError.details,
                hint: parentStudentError.hint,
                status: (parentStudentError as any).status || (parentStudentError as any).statusCode,
              }
              
              console.error("❌ Failed to create parent access code during registration:")
              console.error("Error Info:", errorInfo)
              console.error("Full Error:", JSON.stringify(parentStudentError, Object.getOwnPropertyNames(parentStudentError || {})))
              console.error("Student ID:", actualUserId)
              console.error("Access Code:", accessCode)
              console.error("Session available:", !!session)
              console.error("Role:", role)
              
              // Check if it's an RLS policy issue
              const status = errorInfo.status
              const message = errorInfo.message || ""
              
              if (status === 406 || message.includes("permission denied") || message.includes("row-level security")) {
                console.error("⚠️ RLS policy is blocking parent_student insert.")
                console.error("💡 Solution: Run 'scripts/16_add_parent_student_insert_policy.sql' in Supabase SQL Editor")
              } else if (message.includes("duplicate") || message.includes("already exists") || errorInfo.code === "23505") {
                console.warn("ℹ️ Access code or student_id already exists - this is OK, access code was already created")
              } else {
                console.error("❌ Unknown error creating parent access code:", errorInfo.message || "Unknown error")
              }
            } else {
              console.log("✅ Parent access code created successfully during registration:", { accessCode, insertData })
            }
          } else {
            console.error("Failed to generate unique access code after", maxAttempts, "attempts")
          }
        } else if (role === "student" && !session) {
          console.log("No session available - parent access code will be created on next login")
          console.log("Session status:", { hasSession, session: !!session, authDataSession: !!authData?.session })
        }

        // Redirect to dashboard if we have a session
        if (session || authData?.session) {
          // User is automatically signed in
          const roleRoute = {
            main_teacher: "/dashboard/main-teacher",
            teacher: "/dashboard/teacher",
            student: "/dashboard/student",
            parent: "/dashboard/parent",
          }[role]

          router.push(roleRoute || "/dashboard")
          router.refresh()
        } else {
          // No session - try one more time to sign in
          console.log("No session available, attempting final sign in...")
          const { data: finalSignIn, error: finalError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (finalSignIn?.session) {
            const roleRoute = {
              main_teacher: "/dashboard/main-teacher",
              teacher: "/dashboard/teacher",
              student: "/dashboard/student",
              parent: "/dashboard/parent",
            }[role]
            router.push(roleRoute || "/dashboard")
            router.refresh()
          } else {
            // If still no session, show success and redirect to login
            setError("")
            toast({
              title: "Account created successfully!",
              description: "You can now sign in with your credentials.",
              variant: "default",
            })
            setTimeout(() => {
              router.push("/login")
            }, 2000)
          }
        }
      }
    } catch (err) {
      // Log detailed error information
      console.error("Registration catch block error:", err)
      
      // Try to extract meaningful error information
      let errorMessage = "An unexpected error occurred. Please try again."
      
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        })
      } else if (typeof err === "object" && err !== null) {
        try {
          const errObj = err as any
          if (errObj.message) {
            errorMessage = errObj.message
          } else if (errObj.error?.message) {
            errorMessage = errObj.error.message
          }
          console.error("Error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)))
        } catch (stringifyError) {
          console.error("Could not stringify error:", stringifyError)
          console.error("Raw error:", err)
        }
      } else {
        console.error("Unknown error type:", typeof err, err)
      }
      
      // Check for specific error patterns
      if (errorMessage.includes("Database error") || errorMessage.includes("saving new user")) {
        errorMessage = "Registration encountered a database error. Your account may have been created. Please try logging in, or contact support if the issue persists."
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (errorMessage.includes("timeout")) {
        errorMessage = "Request timed out. Please try again."
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">Create an account</CardTitle>
        <CardDescription className="text-base">Enter your information to get started</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">I am a</Label>
            <Select 
              value={role} 
              onValueChange={(value) => {
                const newRole = value as UserRole
                console.log("Role selection changed:", { from: role, to: newRole, value })
                setRole(newRole)
                // Reset phone fields when role changes
                if (newRole !== "student") {
                  setHasPhone(true)
                }
                // Reset teacher-specific fields when role changes
                if (newRole !== "teacher" && newRole !== "main_teacher") {
                  setIeltsScore("")
                  setEtk("")
                }
              }} 
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="main_teacher">Main Teacher</SelectItem>
              </SelectContent>
            </Select>
            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-muted-foreground mt-1">Current role: <strong>{role}</strong></p>
            )}
          </div>

          {/* Phone Number Field */}
          {role === "parent" && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+998901234567 or 901234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Required for parents. Format: +998XXXXXXXXX or 9XXXXXXXXX
              </p>
            </div>
          )}

          {role === "student" && (
            <>
              <div className="space-y-2">
                <Label>Do you have a phone number?</Label>
                <Select 
                  value={hasPhone ? "yes" : "no"} 
                  onValueChange={(value) => {
                    setHasPhone(value === "yes")
                    if (value === "no") {
                      setPhoneNumber("")
                    }
                  }} 
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, I have a phone</SelectItem>
                    <SelectItem value="no">No, I don't have a phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasPhone && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+998901234567 or 901234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Format: +998XXXXXXXXX or 9XXXXXXXXX
                  </p>
                </div>
              )}
              {!hasPhone && (
                <p className="text-xs text-muted-foreground">
                  No problem! Your parent's phone number will be used for payment reminders.
                </p>
              )}
            </>
          )}

          {(role === "teacher" || role === "main_teacher") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+998901234567 or 901234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Required for teachers. Format: +998XXXXXXXXX or 9XXXXXXXXX
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="18"
                  max="100"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ieltsScore">
                  IELTS Score <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ieltsScore"
                  type="number"
                  placeholder="e.g., 7.5"
                  value={ieltsScore}
                  onChange={(e) => setIeltsScore(e.target.value)}
                  min="0"
                  max="9"
                  step="0.5"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your IELTS score (0-9, can include decimals like 7.5)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="etk">
                  ETK (English Teaching Knowledge) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="etk"
                  placeholder="e.g., TEFL, TESOL, CELTA, etc."
                  value={etk}
                  onChange={(e) => setEtk(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your English teaching certification or qualification
                </p>
              </div>
            </>
          )}

          {/* Student-specific fields */}
          {role === "student" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="5"
                  max="100"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="englishLevel">
                  English Level <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="englishLevel"
                  placeholder="e.g., Beginner, Intermediate, Advanced"
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="certificateType">
                  Certificate Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={certificateType}
                  onValueChange={(value) => setCertificateType(value as "IELTS" | "CEFR")}
                  disabled={loading}
                >
                  <SelectTrigger id="certificateType">
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IELTS">IELTS</SelectItem>
                    <SelectItem value="CEFR">CEFR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
