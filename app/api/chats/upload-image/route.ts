import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { fileToDataUrl, validateBase64Image } from '@/lib/imageBase64';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/chats/upload-image
 * Upload an image for chat. Returns base64 data URL to use in message content.
 * Accepts: multipart/form-data with "image" / "file", or application/json { imageBase64: "data:image/...;base64,..." }.
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

      let dataUrl: string;
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await request.json();
        const imageBase64 = body.imageBase64 ?? body.image ?? body.dataUrl;
        if (!imageBase64) {
          return NextResponse.json(
            { success: false, error: 'imageBase64 is required in JSON body' },
            { status: 400 }
          );
        }
        const result = validateBase64Image(imageBase64, MAX_IMAGE_BYTES);
        if (!result.valid) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        dataUrl = result.dataUrl!;
      } else {
        const formData = await request.formData();
        let file = formData.get('image') as File | Blob | null;
        if (!file) file = formData.get('file') as File | Blob | null;
        if (!file) {
          return NextResponse.json(
            { success: false, error: 'Image file is required. Send "imageBase64" in JSON or "image"/"file" in FormData.' },
            { status: 400 }
          );
        }
        const fileObj = file instanceof File ? file : new File([file], 'chat-image.png', { type: file.type || 'image/png' });
        const result = await fileToDataUrl(fileObj, MAX_IMAGE_BYTES);
        if (!result.valid) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        dataUrl = result.dataUrl!;
      }

      return NextResponse.json({
        success: true,
        data: { url: dataUrl },
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
