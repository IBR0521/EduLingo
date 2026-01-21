# Database Setup Guide

## Issue: 406 Error on Login

The "Failed to log in" error is caused by missing or incorrectly configured Row Level Security (RLS) policies in your Supabase database.

## Solution: Run RLS Verification and Fix Script

You need to run the RLS verification and fix script in your Supabase SQL Editor:

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the RLS Verification and Fix Script** (RECOMMENDED)
   - Open the file: `scripts/08_verify_and_fix_rls.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** to execute
   - This script will:
     - Check if RLS is enabled
     - List existing policies
     - Drop all existing policies (clean slate)
     - Create new, working policies
     - Verify the policies were created

3. **Alternative: Run Full RLS Setup Script**
   - If you prefer the full setup, use `scripts/06_setup_rls_policies.sql`
   - This sets up RLS for all tables in the database

4. **Verify Tables Exist**
   - If you haven't created the tables yet, run `scripts/01_create_tables.sql` first
   - Or run `scripts/02_fix_users_table.sql` if you need to recreate tables

### What These Scripts Do:

**`scripts/08_verify_and_fix_rls.sql` (Recommended):**
- Verifies RLS status on users table
- Lists existing policies
- Drops all existing policies (clean slate)
- Creates simple, working policies for users table:
  - Users can read their own profile
  - Authenticated users can read all users (for basic info)
  - Users can update their own profile
  - Users can insert their own profile (for registration)

**`scripts/06_setup_rls_policies.sql` (Full Setup):**
- Enables Row Level Security on all tables
- Creates comprehensive policies for all tables:
  - Users to read their own profile
  - Users to read all users (for basic info)
  - Teachers to manage groups and assignments
  - Students to read their own data
  - Parents to read their linked students' data
  - Proper access control for all features

### After Running the Script:

1. Try logging in again
2. The 406 error should be resolved
3. Users should be able to access their profiles

## Troubleshooting

If you still see errors:
- Check that all tables exist (run table creation scripts first)
- Verify your Supabase project URL and anon key in `.env.local`
- Check the Supabase dashboard logs for any policy errors

