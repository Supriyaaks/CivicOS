import { supabase } from '../lib/supabase';

export interface StorageUploadMetadata {
  filename: string;
  fileSize: number;
  mimeType: string;
  provider: 'supabase_cloud' | 'fallback_resilient_store';
  uploadedAt: string;
  reason?: string;
  bucket?: string;
}

export interface StorageUploadResult {
  url: string;
  path: string;
  isLocalFallback: boolean;
  storageProvider: 'supabase_cloud' | 'fallback_resilient_store';
  error?: string;
  metadata?: StorageUploadMetadata;
}

const BUCKET_NAME = 'incident-evidence';
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/**
 * Validates file size and format before upload
 */
export function validateEvidenceFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided for upload.' };
  }

  // Type validation
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase();
  const isValidMime = ALLOWED_MIME_TYPES.includes(mime) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

  if (!isValidMime) {
    return {
      valid: false,
      error: `Invalid file format (${file.type || ext}). Only JPG, PNG, and WEBP images are supported.`,
    };
  }

  // Size validation
  if (file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Converts a browser File object to a safe URL for resilient local fallback.
 * Uses blob object URLs for files > 200KB to prevent localStorage quota exhaustion.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    try {
      if (file.size < 200 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      } else {
        resolve(URL.createObjectURL(file));
      }
    } catch {
      resolve(URL.createObjectURL(file));
    }
  });
};

/**
 * Uploads citizen complaint evidence image to Supabase Storage bucket 'incident-evidence'.
 * Gracefully falls back to local data URL if the bucket is not yet provisioned or network is offline.
 */
export async function uploadEvidenceImage(
  file: File,
  complaintId: string
): Promise<StorageUploadResult> {
  const validation = validateEvidenceFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `complaints/${complaintId}/${Date.now()}_${sanitizedName}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`[StorageService] Upload to Supabase bucket '${BUCKET_NAME}' failed (${error.message}). Falling back to resilient local store.`);
      const fallbackUrl = await fileToDataUrl(file);
      return {
        url: fallbackUrl,
        path: filePath,
        isLocalFallback: true,
        storageProvider: 'fallback_resilient_store',
        error: error.message,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          provider: 'fallback_resilient_store',
          uploadedAt: new Date().toISOString(),
          reason: error.message,
        },
      };
    }

    // Private bucket: Attempt to generate secure signed URL (1 hour validity)
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data?.path || filePath, 3600);

    let resolvedUrl = signedData?.signedUrl;
    if (!resolvedUrl) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data?.path || filePath);
      resolvedUrl = publicData.publicUrl;
    }

    return {
      url: resolvedUrl,
      path: data?.path || filePath,
      isLocalFallback: false,
      storageProvider: 'supabase_cloud',
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        provider: 'supabase_cloud',
        bucket: BUCKET_NAME,
        uploadedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.warn('[StorageService] Unexpected upload error, using resilient local store fallback:', err?.message || err);
    try {
      const fallbackUrl = await fileToDataUrl(file);
      return {
        url: fallbackUrl,
        path: filePath,
        isLocalFallback: true,
        storageProvider: 'fallback_resilient_store',
        error: err?.message || 'Storage upload error',
        metadata: {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          provider: 'fallback_resilient_store',
          uploadedAt: new Date().toISOString(),
          reason: err?.message || 'Network exception during storage upload',
        },
      };
    } catch {
      return {
        url: URL.createObjectURL(file),
        path: filePath,
        isLocalFallback: true,
        storageProvider: 'fallback_resilient_store',
        error: 'FileReader fallback used',
        metadata: {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          provider: 'fallback_resilient_store',
          uploadedAt: new Date().toISOString(),
          reason: 'FileReader memory fallback',
        },
      };
    }
  }
}

/**
 * Uploads resolution verification evidence (before / after image) to Supabase Storage.
 */
export async function uploadResolutionEvidence(
  file: File,
  complaintId: string,
  type: 'before' | 'after' = 'after'
): Promise<StorageUploadResult> {
  const validation = validateEvidenceFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `resolutions/${complaintId}/${type}_${Date.now()}_${sanitizedName}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`[StorageService] Resolution upload failed (${error.message}). Using resilient local store fallback.`);
      const fallbackUrl = await fileToDataUrl(file);
      return {
        url: fallbackUrl,
        path: filePath,
        isLocalFallback: true,
        storageProvider: 'fallback_resilient_store',
        error: error.message,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          provider: 'fallback_resilient_store',
          uploadedAt: new Date().toISOString(),
          reason: error.message,
        },
      };
    }

    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data?.path || filePath, 3600);

    let resolvedUrl = signedData?.signedUrl;
    if (!resolvedUrl) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data?.path || filePath);
      resolvedUrl = publicData.publicUrl;
    }

    return {
      url: resolvedUrl,
      path: data?.path || filePath,
      isLocalFallback: false,
      storageProvider: 'supabase_cloud',
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        provider: 'supabase_cloud',
        bucket: BUCKET_NAME,
        uploadedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    const fallbackUrl = await fileToDataUrl(file);
    return {
      url: fallbackUrl,
      path: filePath,
      isLocalFallback: true,
      storageProvider: 'fallback_resilient_store',
      error: err?.message,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        provider: 'fallback_resilient_store',
        uploadedAt: new Date().toISOString(),
        reason: err?.message,
      },
    };
  }
}

/**
 * Generates a signed URL for an existing storage path
 */
export async function getEvidenceSignedUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Persists evidence record and metadata to PostgreSQL backend
 */
export async function persistEvidenceToBackend(
  incidentId: string,
  evidenceResult: StorageUploadResult,
  type: 'INITIAL' | 'PROGRESS' | 'RESOLUTION' = 'INITIAL'
): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/incidents/${incidentId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: evidenceResult.url,
        type,
        note: JSON.stringify(evidenceResult.metadata || {
          provider: evidenceResult.storageProvider,
          path: evidenceResult.path,
          isLocalFallback: evidenceResult.isLocalFallback,
        }),
      }),
    });
    return response.ok;
  } catch (err) {
    console.warn('[StorageService] Failed to persist evidence metadata to backend:', err);
    return false;
  }
}

/**
 * Checks whether the Supabase Storage bucket 'incident-evidence' exists and is accessible
 */
export async function checkSupabaseStorageStatus(): Promise<{
  connected: boolean;
  bucketExists: boolean;
  bucketName: string;
  provider: string;
  details?: string;
}> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      return {
        connected: false,
        bucketExists: false,
        bucketName: BUCKET_NAME,
        provider: 'Supabase Storage API',
        details: error.message,
      };
    }

    const exists = Array.isArray(data) && data.some((b) => b.id === BUCKET_NAME || b.name === BUCKET_NAME);
    return {
      connected: true,
      bucketExists: exists,
      bucketName: BUCKET_NAME,
      provider: exists ? 'Supabase Cloud Storage (Private Bucket Active)' : 'Supabase Cloud (Bucket Pending Creation - Resilient Fallback Active)',
      details: exists ? 'Private bucket provisioned' : 'Bucket not found on project; SQL setup migration available',
    };
  } catch (err: any) {
    return {
      connected: false,
      bucketExists: false,
      bucketName: BUCKET_NAME,
      provider: 'Offline / Fallback Store',
      details: err?.message,
    };
  }
}
