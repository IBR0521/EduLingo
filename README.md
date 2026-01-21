# English Course Platform

A comprehensive learning management system for English courses with role-based access control for Main Teachers, Teachers, Students, and Parents.

## Features

### Main Teacher
- Full control over all groups, teachers, and students
- Create and manage groups
- Assign teachers to groups
- View system-wide statistics and overview
- Manage all teachers and their assignments

### Teacher
- Manage assigned groups (only groups assigned by main teacher)
- Mark student attendance
- Grade assignments and track student performance
- Record participation scores
- Create assignments and schedule classes
- View upcoming classes and pending assignments

### Student
- View grades, attendance, and participation scores
- See upcoming classes and subjects
- View homework and assignments
- Track academic progress with statistics
- Access parent linking code
- View enrolled groups

### Parent
- Link to student account using access code
- Monitor child's progress (grades, attendance, participation)
- View upcoming classes and assignments
- Track academic performance over time

## Tech Stack

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI + Tailwind CSS
- **Language**: TypeScript

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- A Supabase account and project

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Set Up Database

Run the SQL scripts in the `scripts/` directory in your Supabase SQL Editor:

1. Run `01_create_tables.sql` to create all necessary tables
2. Run `02_fix_users_table.sql` if needed (for any table fixes)

### 6. Configure Supabase Authentication

In your Supabase dashboard:
1. Go to Authentication > URL Configuration
2. Add your site URL (e.g., `http://localhost:3000` for development)
3. Add redirect URLs for email confirmation

### 7. Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Creating Accounts

1. Navigate to `/register`
2. Fill in your details (name, email, password)
3. Select your role:
   - **Main Teacher**: Full administrative access
   - **Teacher**: Can manage assigned groups
   - **Student**: Can view their progress and assignments
   - **Parent**: Can link to student accounts
4. Complete email verification (if enabled)

### Main Teacher Workflow

1. **Create Groups**: Go to Dashboard > Groups > Create New Group
2. **Assign Teachers**: When creating/editing a group, select a teacher from the dropdown
3. **Manage Students**: Add students to groups via the Students tab
4. **Monitor System**: View overview statistics and system health

### Teacher Workflow

1. **View Assigned Groups**: See all groups assigned by the main teacher
2. **Manage Group**: Click on a group to access:
   - Students tab: Add/remove students
   - Schedule tab: Create upcoming classes
   - Assignments tab: Create homework
   - Attendance tab: Mark student attendance
   - Grades tab: Record grades and participation
3. **Track Progress**: View statistics for your groups

### Student Workflow

1. **View Dashboard**: See your grades, attendance, and upcoming classes
2. **Check Assignments**: View homework and due dates
3. **Track Progress**: Monitor your academic performance
4. **Share Access Code**: Copy your parent access code to share with parents

### Parent Workflow

1. **Link Student**: Click "Link Student" and enter the access code from your child
2. **Monitor Progress**: View grades, attendance, and assignments
3. **Track Performance**: See academic statistics and trends

## Database Schema

Key tables:
- `users`: User accounts with roles
- `groups`: Classes/groups
- `group_students`: Student enrollment in groups
- `assignments`: Homework and assignments
- `schedule`: Upcoming classes
- `attendance`: Attendance records
- `grades`: Student grades
- `participation`: Participation scores
- `parent_student`: Parent-student linking with access codes
- `messages`: Communication between users
- `notifications`: System notifications

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages by role
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── auth/             # Authentication forms
│   ├── dashboard/        # Dashboard components
│   └── ui/               # UI components
├── lib/                  # Utilities and types
│   ├── supabase/         # Supabase client setup
│   └── types.ts          # TypeScript types
└── scripts/              # SQL setup scripts
```

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Security Notes

- All authentication is handled by Supabase
- Row Level Security (RLS) should be configured in Supabase for production
- Environment variables should never be committed to version control
- Use Supabase policies to restrict data access based on user roles

## Support

For issues or questions, please check:
- Supabase documentation: https://supabase.com/docs
- Next.js documentation: https://nextjs.org/docs

## License

This project is private and proprietary.





