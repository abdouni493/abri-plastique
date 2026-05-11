import { supabase } from './supabase';

/**
 * Get file extension from filename
 */
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Download an image from URL as a file
 * @param url - URL of the image to download
 * @param filename - Name of the file to save
 */
export const downloadImage = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Error downloading image:', err);
    throw err;
  }
};

/**
 * Upload justificatif (proof document) to Supabase Storage
 * @param file - File to upload
 * @param folder - Optional folder name (default: 'transactions')
 * @returns Public URL of uploaded file or null on error
 */
export const uploadJustificatif = async (
  file: File,
  folder?: string
): Promise<string | null> => {
  try {
    const folderName = folder || 'transactions';
    const path = `${folderName}/${Date.now()}-${file.name}`;

    // Check file size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      console.error('Error uploading justificatif: File size exceeds 3MB limit');
      return null;
    }

    const { error } = await supabase.storage
      .from('justificatifs')
      .upload(path, file);

    if (error) {
      console.error('Error uploading justificatif:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('justificatifs')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading justificatif:', err);
    return null;
  }
};

/**
 * Upload logo to Supabase Storage
 * @param file - File to upload
 * @returns Public URL of uploaded file or null on error
 */
export const uploadLogo = async (file: File): Promise<string | null> => {
  try {
    const extension = getFileExtension(file.name);
    const path = `logo-${Date.now()}.${extension}`;

    // Check file size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      console.error('Error uploading logo: File size exceeds 3MB limit');
      return null;
    }

    const { error } = await supabase.storage
      .from('logos')
      .upload(path, file);

    if (error) {
      console.error('Error uploading logo:', error);
      return null;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading logo:', err);
    return null;
  }
};

/**
 * Upload product image to Supabase Storage
 * @param file - File to upload
 * @returns Public URL of uploaded file or null on error
 */
export const uploadProductImage = async (
  file: File
): Promise<string | null> => {
  try {
    const extension = getFileExtension(file.name);
    const path = `product-${Date.now()}.${extension}`;

    // Check file size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    if (file.size > MAX_SIZE) {
      console.error('Error uploading product image: File size exceeds 3MB limit');
      return null;
    }

    const { error } = await supabase.storage
      .from('products')
      .upload(path, file);

    if (error) {
      console.error('Error uploading product image:', error);
      return null;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading product image:', err);
    return null;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param url - Public URL of the file to delete
 */
export const deleteStorageFile = async (url: string): Promise<void> => {
  try {
    if (!url) return;

    // Extract bucket and path from the public URL
    // Format: https://{project-id}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const urlParts = url.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      console.warn('Invalid Supabase Storage URL format:', url);
      return;
    }

    const [bucketAndPath] = urlParts[1].split('/');
    const bucket = bucketAndPath;
    const path = urlParts[1].substring(bucket.length + 1);

    if (!bucket || !path) {
      console.warn('Could not extract bucket and path from URL:', url);
      return;
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting storage file:', error);
    }
  } catch (err) {
    console.error('Error deleting storage file:', err);
  }
};
