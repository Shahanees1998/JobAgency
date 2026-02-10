import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, validateFile, deleteFromCloudinary } from '@/lib/cloudinary';

/**
 * POST /api/employers/logo
 * Upload company logo for current employer
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      if (authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json({ success: false, error: 'Only employers can upload logo' }, { status: 403 });
      }

      const employer = await prisma.employer.findUnique({
        where: { userId },
        select: { id: true, companyLogoPublicId: true },
      });

      if (!employer) {
        return NextResponse.json({ success: false, error: 'Employer profile not found' }, { status: 404 });
      }

      const formData = await request.formData();
      let file = formData.get('image') as File | Blob | null;
      if (!file) file = formData.get('file') as File | Blob | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Logo image is required. Send with field name "image".' },
          { status: 400 }
        );
      }

      let fileToUpload: File;
      if (file instanceof File) fileToUpload = file;
      else if (file instanceof Blob) fileToUpload = new File([file], 'logo.png', { type: file.type || 'image/png' });
      else {
        return NextResponse.json({ success: false, error: 'Invalid file format' }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validation = validateFile(fileToUpload, { allowedTypes, maxSize: 5 * 1024 * 1024 });
      if (!validation.isValid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }

      // Upload to Cloudinary (square logo)
      const cloudinaryResult = await uploadToCloudinary(fileToUpload, {
        folder: `jobportal/employers/${employer.id}/logo`,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'center' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        max_bytes: 5 * 1024 * 1024,
      });

      // Delete old logo if exists (best effort)
      if (employer.companyLogoPublicId) {
        try {
          await deleteFromCloudinary(employer.companyLogoPublicId);
        } catch (e) {
          console.warn('Failed to delete old logo:', e);
        }
      }

      const updated = await prisma.employer.update({
        where: { userId },
        data: {
          companyLogo: cloudinaryResult.secure_url,
          companyLogoPublicId: cloudinaryResult.public_id,
        },
        select: { companyLogo: true },
      });

      return NextResponse.json({
        success: true,
        data: { companyLogo: updated.companyLogo },
        message: 'Company logo uploaded successfully',
      });
    } catch (error) {
      console.error('Employer logo upload error:', error);
      return NextResponse.json({ success: false, error: 'Failed to upload company logo' }, { status: 500 });
    }
  });
}

