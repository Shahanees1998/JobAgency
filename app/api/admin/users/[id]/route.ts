import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: params.id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    profileImage: true,
                    profileImagePublicId: true,
                    lastLogin: true,
                    isPasswordChanged: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            if (!user) {
                return NextResponse.json(
                    { error: 'Member not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(user);
        } catch (error) {
            console.error('Error fetching member:', error);
            return NextResponse.json(
                { error: 'Failed to fetch member' },
                { status: 500 }
            );
        }
    });
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const body = await request.json();
            const { firstName, lastName, email, phone, status } = body;

        // Only require firstName, lastName, and email if any of them are present in the body
        if (("firstName" in body || "lastName" in body || "email" in body) && (!firstName || !lastName || !email)) {
            return NextResponse.json(
                { error: 'First name, last name, and email are required' },
                { status: 400 }
            );
        }

        // If email is being updated, check if it already exists for other users
        if (email) {
            const existingUserByEmail = await prisma.user.findFirst({
                where: {
                    email,
                    id: { not: params.id },
                },
            });
            if (existingUserByEmail) {
                return NextResponse.json(
                    { error: 'Email already exists' },
                    { status: 400 }
                );
            }
        }


        // Build update data object with only provided fields
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined) updateData.status = status;

        // Update user
        const user = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                profileImage: true,
                profileImagePublicId: true,
                lastLogin: true,
                isPasswordChanged: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error updating member:', error);
        return NextResponse.json(
            { error: 'Failed to update member' },
            { status: 500 }
        );
    }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { id: params.id },
            });

            if (!existingUser) {
                return NextResponse.json(
                    { error: 'Member not found' },
                    { status: 404 }
                );
            }

            // Soft delete: mark isDeleted true and set status to DEACTIVATED
            await prisma.user.update({
                where: { id: params.id },
                // Cast to any until Prisma types are regenerated with `isDeleted`
                data: ({ isDeleted: true, status: 'DEACTIVATED' } as any),
            });

            return NextResponse.json(
                { message: 'Member soft-deleted successfully' },
                { status: 200 }
            );
        } catch (error) {
            console.error('Error deleting member:', error);
            return NextResponse.json(
                { error: 'Failed to delete member' },
                { status: 500 }
            );
        }
    });
} 