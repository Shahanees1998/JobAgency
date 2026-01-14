import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, validateFile } from '@/lib/cloudinary';

/**
 * POST /api/users/profile-image
 * Upload profile image for current user
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const contentType = request.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);
      
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (error) {
        console.error('Error parsing formData:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to parse form data' },
          { status: 400 }
        );
      }

      console.log('FormData keys:', Array.from(formData.keys()));
      
      // Get the file - try 'image' first, then 'file'
      let file = formData.get('image') as File | Blob | string | null;
      if (!file) {
        file = formData.get('file') as File | Blob | string | null;
      }

      // Log what we received
      if (file) {
        console.log('File received:', {
          type: typeof file,
          isFile: file instanceof File,
          isBlob: file instanceof Blob,
          isString: typeof file === 'string',
          name: file instanceof File ? file.name : 'N/A',
          size: file instanceof File || file instanceof Blob ? file.size : 'N/A',
        });
      } else {
        // Log all entries for debugging
        const entries = Array.from(formData.entries());
        console.log('FormData entries:', entries.map(([key, value]) => [
          key, 
          typeof value, 
          value instanceof File ? 'File' : value instanceof Blob ? 'Blob' : typeof value === 'string' ? 'String' : 'Other',
          value instanceof File ? value.name : value instanceof Blob ? value.type : String(value).substring(0, 50)
        ]));
        return NextResponse.json(
          { success: false, error: 'Image file is required. Please ensure the file is sent with field name "image". Received fields: ' + Array.from(formData.keys()).join(', ') },
          { status: 400 }
        );
      }

      // Handle different file types
      let fileToUpload: File;
      if (file instanceof File) {
        fileToUpload = file;
      } else if (file instanceof Blob) {
        fileToUpload = new File([file], 'profile.png', { type: file.type || 'image/png' });
      } else if (typeof file === 'string') {
        // If it's a string (base64 or URI), we need to handle it differently
        // This shouldn't happen with proper FormData, but handle it just in case
        return NextResponse.json(
          { success: false, error: 'Invalid file format received' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid file type' },
          { status: 400 }
        );
      }

      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validation = validateFile(fileToUpload, {
        allowedTypes,
        maxSize: 5 * 1024 * 1024, // 5MB
      });

      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }

      // Get existing user to delete old image if exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileImagePublicId: true },
      });

      // Upload image to Cloudinary with optimization
      const cloudinaryResult = await uploadToCloudinary(fileToUpload, {
        folder: 'jobportal/profile-images',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        max_bytes: 5 * 1024 * 1024, // 5MB
      });

      // Update user's profile image in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profileImage: cloudinaryResult.secure_url,
          profileImagePublicId: cloudinaryResult.public_id,
        },
        select: {
          id: true,
          profileImage: true,
          profileImagePublicId: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          profileImage: updatedUser.profileImage,
        },
        message: 'Profile image uploaded successfully',
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload profile image' },
        { status: 500 }
      );
    }
  });
}
