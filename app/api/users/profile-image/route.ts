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

      const formData = await request.formData();
      const file = formData.get('image') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Image file is required' },
          { status: 400 }
        );
      }

      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validation = validateFile(file, {
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
      const cloudinaryResult = await uploadToCloudinary(file, {
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
