import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employers/[id]/reviews
 * Public list of reviews for this employer (company)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employerId } = await params;
    if (!employerId) {
      return NextResponse.json(
        { success: false, error: 'Employer ID required' },
        { status: 400 }
      );
    }

    const employer = await prisma.employer.findUnique({
      where: { id: employerId },
      select: {
        companyName: true,
        companyDescription: true,
        companyWebsite: true,
        companyLogo: true,
        companyBanner: true,
        industry: true,
        companySize: true,
        city: true,
        country: true,
        address: true,
      },
    });
    if (!employer) {
      return NextResponse.json(
        { success: false, error: 'Employer not found' },
        { status: 404 }
      );
    }

    const reviews = await prisma.companyReview.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
    });

    const data = reviews.map((r) => ({
      id: r.id,
      companyName: employer.companyName,
      rating: r.rating,
      title: r.title ?? '',
      description: r.description ?? '',
      date: r.createdAt.toISOString().split('T')[0],
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        companyName: employer.companyName,
        companyDescription: employer.companyDescription ?? undefined,
        companyWebsite: employer.companyWebsite ?? undefined,
        companyLogo: employer.companyLogo ?? undefined,
        companyBanner: employer.companyBanner ?? undefined,
        industry: employer.industry ?? undefined,
        companySize: employer.companySize ?? undefined,
        city: employer.city ?? undefined,
        country: employer.country ?? undefined,
        address: employer.address ?? undefined,
        reviews: data,
      },
    });
  } catch (error) {
    console.error('Get employer reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
