# Supabase Storage Setup Guide

## Overview

The platform now uses Supabase Storage for file uploads. This provides secure, scalable file storage for assignments and other course materials.

## Setup Instructions

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New bucket**
4. Create a bucket named `assignments`
5. Set bucket to **Private** (recommended) or **Public** (if you want public access)
6. Click **Create bucket**

### 2. Configure Storage Policies (RLS)

Run this SQL in your Supabase SQL Editor to set up Row Level Security policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Allow users to read their own files or files from their groups
CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignments' AND
  (
    -- Users can read files they uploaded
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Teachers can read files from their groups
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN groups g ON a.group_id = g.id
      WHERE a.id::text = (storage.foldername(name))[1]
      AND (g.teacher_id = auth.uid() OR g.created_by = auth.uid())
    ) OR
    -- Students can read files from their assignments
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN group_students gs ON a.group_id = gs.group_id
      WHERE a.id::text = (storage.foldername(name))[1]
      AND gs.student_id = auth.uid()
    )
  )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Alternative: Simpler Public Bucket (For Testing)

If you want to test quickly, you can:
1. Create bucket as **Public**
2. Skip RLS policies (public buckets don't need them)
3. Note: This is less secure, only use for testing

### 4. File Size Limits

- Default max file size: **10MB** (configured in code)
- Supabase free tier: 1GB storage, 2GB bandwidth
- To change limit, edit `lib/storage.ts` and component validation

### 5. Storage Structure

Files are organized as:
```
assignments/
  assignment-{assignmentId}/
    {timestamp}-{random}.{ext}
```

Example:
```
assignments/
  assignment-123e4567-e89b-12d3-a456-426614174000/
    1704067200000-abc123def456.pdf
```

## Features Implemented

✅ **File Upload**
- Upload files to Supabase Storage
- Automatic unique filename generation
- File size validation (10MB max)
- Progress feedback

✅ **File Download**
- Public URLs for public buckets
- Signed URLs for private buckets (if needed)

✅ **File Deletion**
- Delete from both database and storage
- Automatic cleanup on delete

✅ **Error Handling**
- Comprehensive error messages
- Automatic rollback on failures
- User-friendly toast notifications

## Usage

### For Students
- Upload assignment submissions
- View uploaded files
- Delete own submissions
- Download files

### For Teachers
- Upload assignment materials
- View all submissions
- Download student files
- Manage assignment files

## Troubleshooting

### "Failed to upload file"
- Check bucket exists and is named `assignments`
- Verify RLS policies are set up correctly
- Check file size is under 10MB
- Ensure user is authenticated

### "Permission denied"
- Verify storage policies allow the operation
- Check user role and group membership
- Ensure bucket is accessible

### Files not appearing
- Check database records were created
- Verify file_url is correct
- Check browser console for errors

## Next Steps

1. ✅ Create `assignments` bucket in Supabase
2. ✅ Run RLS policies SQL
3. ✅ Test file upload
4. ✅ Verify file download works
5. ✅ Test file deletion

## Notes

- Files are stored permanently until explicitly deleted
- Consider implementing file cleanup for deleted assignments
- Monitor storage usage in Supabase dashboard
- Consider adding file versioning in the future




