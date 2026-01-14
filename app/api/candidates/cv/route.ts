import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';

/**
 * POST /api/candidates/cv
 * Upload CV/Resume for candidate
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

      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can upload CV' },
          { status: 403 }
        );
      }

      const formData = await request.formData();
      const file = formData.get('cv') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'CV file is required' },
          { status: 400 }
        );
      }

      // Check file type
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'Only PDF files are allowed' },
          { status: 400 }
        );
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, {
        folder: `jobportal/candidates/cv/${userId}`,
        resource_type: 'raw',
        allowed_formats: ['pdf'],
        max_bytes: 5 * 1024 * 1024, // 5MB
      });

      // Get existing candidate to delete old CV if exists
      const existingCandidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { cvPublicId: true },
      });

      // Update candidate with new CV
      const candidate = await prisma.candidate.update({
        where: { userId },
        data: {
          cvUrl: uploadResult.secure_url,
          cvPublicId: uploadResult.public_id,
          // Update profile complete status
          isProfileComplete: !!(uploadResult.secure_url && existingCandidate),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          cvUrl: candidate.cvUrl,
        },
        message: 'CV uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading CV:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload CV' },
        { status: 500 }
      );
    }
  });
}

