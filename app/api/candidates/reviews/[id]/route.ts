import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/candidates/reviews/[id]
 * Update a review
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can access this endpoint' },
          { status: 403 }
        );
      }

      const candidate = await prisma.candidate.findUnique({
        where: { userId: authenticatedReq.user!.userId },
        select: { id: true },
      });
      if (!candidate) {
        return NextResponse.json(
          { success: false, error: 'Candidate profile not found' },
          { status: 404 }
        );
      }

      const existing = await prisma.companyReview.findFirst({
        where: { id, candidateId: candidate.id },
        include: { employer: { select: { companyName: true } } },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Review not found' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const rating = body.rating != null ? Math.min(5, Math.max(1, Number(body.rating))) : undefined;
      const title = body.title !== undefined ? body.title : undefined;
      const description = body.description !== undefined ? body.description : undefined;

      const review = await prisma.companyReview.update({
        where: { id },
        data: {
          ...(rating != null && { rating }),
          ...(title !== undefined && { title: title ?? null }),
          ...(description !== undefined && { description: description ?? null }),
        },
        include: { employer: { select: { companyName: true } } },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: review.id,
          companyName: review.employer.companyName,
          employerId: review.employerId,
          rating: review.rating,
          title: review.title ?? '',
          description: review.description ?? '',
          date: review.createdAt.toISOString().split('T')[0],
          createdAt: review.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Update review error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update review' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/candidates/reviews/[id]
 * Delete a review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can access this endpoint' },
          { status: 403 }
        );
      }

      const candidate = await prisma.candidate.findUnique({
        where: { userId: authenticatedReq.user!.userId },
        select: { id: true },
      });
      if (!candidate) {
        return NextResponse.json(
          { success: false, error: 'Candidate profile not found' },
          { status: 404 }
        );
      }

      const existing = await prisma.companyReview.findFirst({
        where: { id, candidateId: candidate.id },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Review not found' },
          { status: 404 }
        );
      }

      await prisma.companyReview.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Review deleted' });
    } catch (error) {
      console.error('Delete review error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete review' },
        { status: 500 }
      );
    }
  });
}
