import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware'
import { prisma } from '@/lib/prisma'

// PUT /api/users/edit-profile - Update user profile
export async function PUT(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId
      if (!userId) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        )
      }

      const body = await request.json()
      const { 
        firstName, 
        lastName, 
        phone, 
        profileImage, 
        profileImagePublicId,
        isPasswordChanged 
      } = body

      // Validate required fields
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: 'First name and last name are required' },
          { status: 400 }
        )
      }

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(profileImage !== undefined && { profileImage }),
          ...(profileImagePublicId !== undefined && { profileImagePublicId }),
          ...(isPasswordChanged !== undefined && { isPasswordChanged }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profileImage: true,
          profileImagePublicId: true,
          isPasswordChanged: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({
        message: 'Profile updated successfully',
        user: updatedUser
      })
    } catch (error) {
      console.error('Edit profile error:', error)
      const err = error as any
      
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }
  })
}
