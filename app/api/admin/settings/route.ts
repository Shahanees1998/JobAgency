import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let settings = await prisma.systemSettings.findFirst();

      // If no settings exist, create default ones
      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: {
            siteName: 'Guest Feedback Platform',
            siteDescription: 'SaaS Guest Feedback & Review Management Platform',
            contactEmail: 'admin@example.com',
            enableNotifications: true,
          },
        });
      }

      return NextResponse.json({ data: settings });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();

      let settings = await prisma.systemSettings.findFirst();

      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: {
            siteName: 'Guest Feedback Platform',
            siteDescription: 'SaaS Guest Feedback & Review Management Platform',
            contactEmail: 'admin@example.com',
            enableNotifications: true,
            ...body,
          },
        });
      } else {
        settings = await prisma.systemSettings.update({
          where: { id: settings.id },
          data: body,
        });
      }

      return NextResponse.json({ data: settings });
    } catch (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }
  });
}