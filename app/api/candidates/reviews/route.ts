import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/** GET /api/candidates/reviews - List my reviews */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
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
        return NextResponse.json({ success: true, data: { reviews: [] } });
      }

      const reviews = await prisma.companyReview.findMany({
        where: { candidateId: candidate.id },
        include: { employer: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const data = reviews.map((r) => ({
        id: r.id,
        companyName: r.employer.companyName,
        employerId: r.employerId,
        rating: r.rating,
        title: r.title ?? '',
        description: r.description ?? '',
        date: r.createdAt.toISOString().split('T')[0],
        createdAt: r.createdAt.toISOString(),
      }));

      return NextResponse.json({ success: true, data: { reviews: data } });
    } catch (error) {
      console.error('Get candidate reviews error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }
  });
}

/** POST /api/candidates/reviews - Create a company review */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
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

      const body = await request.json();
      const { employerId, rating, title, description } = body;
      if (!employerId || rating == null) {
        return NextResponse.json(
          { success: false, error: 'employerId and rating are required' },
          { status: 400 }
        );
      }

      const review = await prisma.companyReview.upsert({
        where: {
          candidateId_employerId: { candidateId: candidate.id, employerId },
        },
        create: {
          candidateId: candidate.id,
          employerId,
          rating: Math.min(5, Math.max(1, Number(rating))),
          title: title ?? null,
          description: description ?? null,
        },
        update: {
          rating: Math.min(5, Math.max(1, Number(rating))),
          title: title ?? null,
          description: description ?? null,
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
      console.error('Create review error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create review' },
        { status: 500 }
      );
    }
  });
}
