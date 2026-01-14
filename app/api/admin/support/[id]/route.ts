import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supportRequest = await prisma.supportRequest.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });

        if (!supportRequest) {
            return NextResponse.json(
                { error: 'Support request not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(supportRequest);
    } catch (error) {
        console.error('Error fetching support request:', error);
        return NextResponse.json(
            { error: 'Failed to fetch support request' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { status, priority, adminResponse } = body;

        const supportRequest = await prisma.supportRequest.update({
            where: { id: params.id },
            data: {
                status,
                priority,
                adminResponse,
            },
            include: {
                user: {
                    select: {
                        role: true,
                        status: true,
                    },
                },
            },
        });

        return NextResponse.json(supportRequest);
    } catch (error) {
        console.error('Error updating support request:', error);
        return NextResponse.json(
            { error: 'Failed to update support request' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.supportRequest.delete({ where: { id: params.id } });

        return NextResponse.json({ message: 'Support request deleted successfully' });
    } catch (error) {
        console.error('Error deleting support request:', error);
        return NextResponse.json(
            { error: 'Failed to delete support request' },
            { status: 500 }
        );
    }
} 