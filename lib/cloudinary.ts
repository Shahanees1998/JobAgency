import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const cloudName = 'denwqkach';
const apiKey = '555776591533351';
const apiSecret = 'sRofrQD3SmHowqDI5Ghp7n1u0aM';
const uploadPreset = 'ml_default';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: any[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  allowed_formats?: string[];
  max_bytes?: number;
}

// Upload file to Cloudinary
export async function uploadToCloudinary(
  file: File | Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const {
      folder = 'primochat',
      transformation = [],
      resource_type = 'auto',
      allowed_formats,
      max_bytes
    } = options;

    // Convert file to base64 if it's a File object
    let fileData: string;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileData = `data:${file.type};base64,${buffer.toString('base64')}`;
    } else {
      fileData = file.toString('base64');
    }

    const uploadOptions: any = {
      folder,
      resource_type,
      transformation,
      upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    };

    if (allowed_formats) {
      uploadOptions.allowed_formats = allowed_formats;
    }

    if (max_bytes) {
      uploadOptions.max_bytes = max_bytes;
    }
    const result = await cloudinary.uploader.upload(fileData, uploadOptions);
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
}

// Delete file from Cloudinary
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
}

// Generate optimized image URL
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  } = {}
): string {
  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    crop = 'fill'
  } = options;

  const transformations: string[] = [];

  if (width || height) {
    const cropParam = crop === 'fill' ? 'c_fill' : crop === 'fit' ? 'c_fit' : crop === 'scale' ? 'c_scale' : 'c_thumb';
    transformations.push(cropParam);
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
  }

  transformations.push(`q_${quality}`, `f_${format}`);

  const transformationString = transformations.join(',');
  
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
}

// Generate document download URL
export function getDocumentDownloadUrl(publicId: string): string {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload/fl_attachment/${publicId}`;
}

// Generate thumbnail URL for documents
export function getDocumentThumbnailUrl(publicId: string, fileType: string): string {
  // For images, generate a thumbnail
  if (fileType.startsWith('image/')) {
    return getOptimizedImageUrl(publicId, { width: 150, height: 150, crop: 'thumb' });
  }
  
  // For other file types, return a placeholder or icon
  // You can customize this based on file type
  return `/api/documents/thumbnail/${publicId}`;
}

// Generate optimized profile image URL
export function getProfileImageUrl(publicId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizes = {
    small: { width: 100, height: 100 },
    medium: { width: 200, height: 200 },
    large: { width: 400, height: 400 }
  };
  
  const { width, height } = sizes[size];
  
  return getOptimizedImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 85,
    format: 'auto'
  });
}

// Validate file type and size
export function validateFile(file: File, options: {
  allowedTypes?: string[];
  maxSize?: number;
} = {}): { isValid: boolean; error?: string } {
  const { allowedTypes, maxSize = 10 * 1024 * 1024 } = options; // Default 10MB

  if (maxSize && file.size > maxSize) {
    return { isValid: false, error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB` };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} is not allowed` };
  }

  return { isValid: true };
} 