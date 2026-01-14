import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Only admins can see all users
        // if (authenticatedReq.user?.role !== 'ADMIN') {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        // }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          profileImage: true,
          profileImagePublicId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      
      return NextResponse.json(users)
    } catch (error) {
      console.error('Get users error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
  });
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Only admins can create users
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      // }

      const body = await request.json()
      const { email, username, password, firstName, lastName } = body

      if (!email || !username || !password) {
        return NextResponse.json(
          { error: 'Email, username, and password are required' },
          { status: 400 }
        )
      }

      const user = await prisma.user.create({
        data: {
          email,
          password, 
          firstName,
          lastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return NextResponse.json(user, { status: 201 })
    } catch (error) {
      console.error('Create user error:', error);
      const err = error as any;
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
  });
} 