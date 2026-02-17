import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { AuthService } from '@/lib/auth';
import { NotificationService } from '@/lib/notificationService';
import { pusherServer } from '@/lib/realtime';
import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'app.thebuilders@gmail.com';
const APP_NAME = 'JobPortal';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const sortField = searchParams.get('sortField');
        const sortOrder = searchParams.get('sortOrder');

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = { isDeleted: false };
        
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        // Build orderBy clause
        let orderBy: any = { createdAt: 'desc' };
        if (sortField) {
            orderBy = {};
            // sortOrder: 1 = asc, -1 = desc
            orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
        }

        // Get users with pagination
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
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
                },
            }),
            prisma.user.count({ where }),
        ]);
        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
        const body = await request.json();
        const { firstName, lastName, email, phone, password, status, role } = body;

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return NextResponse.json(
                { error: 'First name, last name, and email are required' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUserByEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUserByEmail) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

                // Hash the password (admin can set, or use default)
                const plainPassword = password || 'defaultPassword123';
                const hashedPassword = await bcrypt.hash(plainPassword, 10);

                // Create new user with hashed password
                const user = await prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        password: hashedPassword,
                        phone,
                        role: role || 'CANDIDATE',
                        status: status || 'PENDING',
                    },
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
                    },
                });

                // Send notification to all admin users about the new user
                try {
                    // Get all admin users
                    const adminUsers = await prisma.user.findMany({
                        where: { role: 'ADMIN' },
                        select: { id: true, firstName: true, lastName: true },
                    });

                    // Create notifications for each admin user
                    const notificationPromises = adminUsers.map(adminUser => 
                        NotificationService.createUserJoinedNotification(
                            adminUser.id,
                            `${user.firstName} ${user.lastName}`
                        )
                    );

                    // Also send a specific notification to the admin who created the user
                    if (authenticatedReq.user?.userId) {
                        const creatorNotification = NotificationService.createUserJoinedNotification(
                            authenticatedReq.user.userId,
                            `${user.firstName} ${user.lastName}`
                        );

                        // Send all notifications in parallel
                        await Promise.all([...notificationPromises, creatorNotification]);
                    } else {
                        // Send notifications to other admins only
                        await Promise.all(notificationPromises);
                    }

                    console.log(`Sent notifications to ${adminUsers.length} admin users about new user: ${user.firstName} ${user.lastName}`);
                } catch (notificationError) {
                    console.error('Error sending notifications:', notificationError);
                    // Don't fail the user creation if notification fails
                }


                // Send welcome email to the new user (if SendGrid configured)
                try {
                    if (SENDGRID_API_KEY) {
                        const appBaseUrl = process.env.NEXTAUTH_URL || 'https://primoochat.vercel.app';
                        const loginUrl = `${appBaseUrl}/auth/login`;
                        const emailContent = createWelcomeEmail(user.firstName, loginUrl, user.email, plainPassword);

                        await sgMail.send({
                            to: email,
                            from: FROM_EMAIL,
                            subject: `Welcome to ${APP_NAME}`,
                            html: emailContent,
                        });

                        console.log(`Welcome email sent to ${user.email}`);
                    } else {
                        console.log('SendGrid not configured. Skipping welcome email.');
                    }
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                }

                return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
  });
} 

function createWelcomeEmail(firstName: string, loginUrl: string, email: string, password: string): string {
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${APP_NAME}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: #000000;
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #555;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                color: #666;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .primary-button {
                display: inline-block;
                background: #000000;
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .primary-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .info {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #1976d2;
            }
            .footer {
                background: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            .footer a:hover {
                text-decoration: underline;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .header, .content, .footer {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to ${APP_NAME}</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello ${firstName},</div>
                <div class="message">
                    Your account has been created. You can now sign in to start using ${APP_NAME}.
                </div>
                <div class="info">
                    <strong>Your Temporary Credentials are</strong>
                    <div>Email: ${email}</div>
                    <div>Password: ${password}</div>
                </div>
                <div class="button-container">
                    <a href="${loginUrl}" class="primary-button">Open ${APP_NAME}</a>
                </div>
                <div class="message">
                    If the button above doesn't work, copy and paste this link into your browser:
                    <br/><br/>
                    <a href="${loginUrl}" style="word-break: break-all; color: #667eea;">${loginUrl}</a>
                </div>
            </div>
            <div class="footer">
                <p>Keep this email safe. For security, consider changing your password after first login.</p>
                <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}