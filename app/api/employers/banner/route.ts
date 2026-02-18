import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { validateBase64Image, fileToDataUrl } from '@/lib/imageBase64';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB for base64 storage

/**
 * POST /api/employers/banner
 * Upload company banner. Stores as base64 in DB.
 * Accepts: application/json { imageBase64: "data:image/...;base64,..." }
 *          or multipart/form-data with "image" / "file".
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json({ success: false, error: 'Only employers can upload banner' }, { status: 403 });
      }

      const employer = await prisma.employer.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!employer) {
        return NextResponse.json({ success: false, error: 'Employer profile not found' }, { status: 404 });
      }

      let dataUrl: string | null = null;
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
            { success: false, error: 'Banner image is required. Send "imageBase64" in JSON or "image"/"file" in FormData.' },
            { status: 400 }
          );
        }
        const fileObj = file instanceof File ? file : new File([file], 'banner.png', { type: file.type || 'image/png' });
        const result = await fileToDataUrl(fileObj, MAX_IMAGE_BYTES);
        if (!result.valid) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        dataUrl = result.dataUrl!;
      }

      await prisma.employer.update({
        where: { userId },
        data: {
          companyBanner: dataUrl,
          companyBannerPublicId: null,
        },
        select: { companyBanner: true },
      });

      return NextResponse.json({
        success: true,
        data: { companyBanner: dataUrl },
        message: 'Company banner saved successfully',
      });
    } catch (error) {
      console.error('Employer banner upload error:', error);
      return NextResponse.json({ success: false, error: 'Failed to save company banner' }, { status: 500 });
    }
  });
}
