// Client-safe Cloudinary URL generation functions
// These functions can be used in client-side components without server-side dependencies

// Generate optimized profile image URL (client-safe)
export function getProfileImageUrl(
  publicId: string, 
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set');
    return '';
  }

  const sizes = {
    small: { width: 100, height: 100 },
    medium: { width: 200, height: 200 },
    large: { width: 400, height: 400 }
  };
  
  const { width, height } = sizes[size];
  
  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    'c_fill',
    'q_85',
    'f_auto'
  ].join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

// Generate optimized image URL (client-safe)
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
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set');
    return '';
  }

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
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
}

// Generate document download URL (client-safe)
export function getDocumentDownloadUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set');
    return '';
  }

  return `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}`;
}

// Generate thumbnail URL for documents (client-safe)
export function getDocumentThumbnailUrl(publicId: string, fileType: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set');
    return '';
  }

  // For images, generate a thumbnail
  if (fileType.startsWith('image/')) {
    return getOptimizedImageUrl(publicId, { width: 150, height: 150, crop: 'thumb' });
  }
  
  // For other file types, return a placeholder or icon
  // You can customize this based on file type
  return `/api/documents/thumbnail/${publicId}`;
} 