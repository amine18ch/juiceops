'use client';
import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PhotoCaptureResult {
  preview: string;
  file: File;
  storagePath?: string;
  publicUrl?: string;
}

export interface UsePhotoCaptureOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  onUploaded?: (result: PhotoCaptureResult) => void;
  onError?: (message: string) => void;
}

export interface UsePhotoCaptureReturn {
  photo: PhotoCaptureResult | null;
  isUploading: boolean;
  uploadError: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  openCamera: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
  uploadToStorage: (lotId: string) => Promise<string | null>;
}

export function usePhotoCapture(options: UsePhotoCaptureOptions = {}): UsePhotoCaptureReturn {
  const {
    bucket = 'reception-photos',
    folder = 'lots',
    maxSizeMB = 10,
    onUploaded,
    onError,
  } = options;

  const [photo, setPhoto] = useState<PhotoCaptureResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openCamera = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate type
      if (!file.type.startsWith('image/')) {
        const msg = 'Format invalide. Veuillez sélectionner une image (JPG, PNG, HEIC).';
        setUploadError(msg);
        onError?.(msg);
        return;
      }

      // Validate size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        const msg = `Image trop volumineuse (${sizeMB.toFixed(1)} Mo). Taille maximum: ${maxSizeMB} Mo.`;
        setUploadError(msg);
        onError?.(msg);
        return;
      }

      setUploadError(null);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        const result: PhotoCaptureResult = { preview, file };
        setPhoto(result);
        onUploaded?.(result);
      };
      reader.onerror = () => {
        const msg = 'Impossible de lire le fichier image. Réessayez.';
        setUploadError(msg);
        onError?.(msg);
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, onUploaded, onError]
  );

  const uploadToStorage = useCallback(
    async (lotId: string): Promise<string | null> => {
      if (!photo?.file) return null;

      setIsUploading(true);
      setUploadError(null);

      try {
        const supabase = createClient();
        const ext = photo.file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const path = `${folder}/${lotId}_${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, photo.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: photo.file.type,
          });

        if (uploadError) {
          // Fallback: keep local preview, log error but don't block form submission
          const msg = `Photo non persistée dans le stockage (${uploadError.message}). La réception sera enregistrée sans photo.`;
          setUploadError(msg);
          onError?.(msg);
          console.warn('[usePhotoCapture] Storage upload failed:', uploadError);
          setIsUploading(false);
          return null;
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        const publicUrl = urlData?.publicUrl || null;

        setPhoto((prev) =>
          prev ? { ...prev, storagePath: path, publicUrl: publicUrl || undefined } : prev
        );

        setIsUploading(false);
        return publicUrl;
      } catch (err) {
        const msg = 'Erreur lors de l\'upload de la photo. La réception sera enregistrée sans photo.';
        setUploadError(msg);
        onError?.(msg);
        console.error('[usePhotoCapture] Unexpected upload error:', err);
        setIsUploading(false);
        return null;
      }
    },
    [photo, bucket, folder, onError]
  );

  const removePhoto = useCallback(() => {
    setPhoto(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return {
    photo,
    isUploading,
    uploadError,
    inputRef,
    openCamera,
    handleFileChange,
    removePhoto,
    uploadToStorage,
  };
}
