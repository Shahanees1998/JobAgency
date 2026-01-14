import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, validateFile } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and user ID are required' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validation = validateFile(file, {
      allowedTypes,
      maxSize: 5 * 1024 * 1024 // 5MB
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Upload image to Cloudinary with optimization
    const cloudinaryResult = await uploadToCloudinary(file, {
      folder: 'primochat/profile-images',
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      max_bytes: 5 * 1024 * 1024 // 5MB
    });

    // Update user's profile image in database
    await prisma.user.update({
      where: { id: userId },
      data: { 
        profileImage: cloudinaryResult.secure_url,
        profileImagePublicId: cloudinaryResult.public_id
      },
    });

    return NextResponse.json({ 
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image' },
      { status: 500 }
    );
  }
} 