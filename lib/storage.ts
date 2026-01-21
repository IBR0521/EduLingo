import { createClient } from "@/lib/supabase/client"

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name (default: 'assignments')
 * @param path - Optional path within the bucket (e.g., 'assignment-123/')
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToStorage(
  file: File,
  bucket: string = "assignments",
  path?: string
): Promise<{ url: string; path: string; error?: string }> {
  const supabase = createClient()

  // Generate unique filename to avoid conflicts
  const fileExt = file.name.split(".").pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
  const filePath = path ? `${path}${fileName}` : fileName

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Error uploading file to storage:", error)
      return {
        url: "",
        path: filePath,
        error: error.message || "Failed to upload file",
      }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error("Unexpected error uploading file:", error)
    return {
      url: "",
      path: filePath,
      error: error instanceof Error ? error.message : "Unexpected error occurred",
    }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path to the file in storage
 */
export async function deleteFileFromStorage(
  bucket: string = "assignments",
  path: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error("Error deleting file from storage:", error)
      return {
        success: false,
        error: error.message || "Failed to delete file",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting file:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error occurred",
    }
  }
}

/**
 * Get a signed URL for a file (for private files)
 * @param bucket - The storage bucket name
 * @param path - The path to the file in storage
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 */
export async function getSignedUrl(
  bucket: string = "assignments",
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string; error?: string }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

    if (error) {
      console.error("Error creating signed URL:", error)
      return {
        url: "",
        error: error.message || "Failed to create signed URL",
      }
    }

    return {
      url: data.signedUrl,
    }
  } catch (error) {
    console.error("Unexpected error creating signed URL:", error)
    return {
      url: "",
      error: error instanceof Error ? error.message : "Unexpected error occurred",
    }
  }
}

