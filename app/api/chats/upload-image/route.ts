import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { uploadToCloudinary, validateFile } from '@/lib/cloudinary';

/**
 * POST /api/chats/upload-image
 * Upload an image for chat (attachment or camera). Returns URL to use in message content.
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
      let file = formData.get('image') as File | Blob | null;
      if (!file) {
        file = formData.get('file') as File | Blob | null;
      }

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Image file is required. Send with field name "image".' },
          { status: 400 }
        );
      }

      let fileToUpload: File;
      if (file instanceof File) {
        fileToUpload = file;
      } else if (file instanceof Blob) {
        fileToUpload = new File([file], 'chat-image.png', { type: file.type || 'image/png' });
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid file format' },
          { status: 400 }
        );
      }

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

      const result = await uploadToCloudinary(fileToUpload, {
        folder: `jobportal/chat/${userId}`,
        resource_type: 'image',
        max_bytes: 5 * 1024 * 1024,
      });

      return NextResponse.json({
        success: true,
        data: { url: result.secure_url },
        message: 'Image uploaded successfully',
      });
    } catch (error) {
      console.error('Chat image upload error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image' },
        { status: 500 }
      );
    }
  });
}
