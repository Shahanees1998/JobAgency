import React, { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { getProfileImageUrl } from '@/lib/cloudinary-client';

interface ProfileImageUploadProps {
    currentImageUrl?: string;
    currentImagePublicId?: string;
    userId: string;
    onImageUploaded: (imageUrl: string, publicId?: string) => void;
    size?: 'small' | 'medium' | 'large';
}

export default function ProfileImageUpload({ 
    currentImageUrl, 
    currentImagePublicId,
    userId, 
    onImageUploaded,
    size = 'medium' 
}: ProfileImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useRef<Toast>(null);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'w-6rem h-6rem';
            case 'large':
                return 'w-10rem h-10rem';
            default:
                return 'w-8rem h-8rem';
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 'text-xl';
            case 'large':
                return 'text-3xl';
            default:
                return 'text-2xl';
        }
    };

    const getCameraIconSize = () => {
        switch (size) {
            case 'small':
                return 'text-lg';
            case 'large':
                return 'text-2xl';
            default:
                return 'text-xl';
        }
    };

    // Use optimized URL if public_id is available, otherwise fall back to original URL
    const getDisplayImage = () => {
        if (previewUrl) return previewUrl;
        if (currentImagePublicId) {
            return getProfileImageUrl(currentImagePublicId, size);
        }
        return currentImageUrl;
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast("error", "Error", "Please select a valid image file");
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast("error", "Error", "Image size must be less than 5MB");
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Auto-upload the file
        await uploadImage(file);
    };

    const uploadImage = async (file: File) => {
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const response = await fetch('/api/users/profile-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload image');
            }

            const data = await response.json();
            onImageUploaded(data.imageUrl, data.publicId);
            setPreviewUrl(null);
            showToast("success", "Success", "Profile image updated successfully!");
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to upload image");
            setPreviewUrl(null);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleImageClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    const displayImage = getDisplayImage();

    return (
        <div className="profile-image-upload">
            <div className="flex flex-column align-items-center gap-2">
                {/* Profile Image Container */}
                <div 
                    className="relative cursor-pointer"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleImageClick}
                >
                    <div className={`${getSizeClasses()} border-round overflow-hidden border-2 border-gray-200 relative transition-all duration-200`}>
                        {displayImage ? (
                            <img 
                                src={displayImage} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex align-items-center justify-content-center bg-gray-100">
                                <i className={`pi pi-user ${getIconSize()} text-gray-400`}></i>
                            </div>
                        )}
                        
                        {/* Hover overlay with camera icon */}
                        {isHovered && !uploading && (
                            <div className="absolute inset-0 bg-black-alpha-50 flex align-items-center justify-content-center transition-all duration-200">
                                <div className="bg-white border-round-full p-2 shadow-2">
                                    <i className={`pi pi-camera ${getCameraIconSize()} text-primary`}></i>
                                </div>
                            </div>
                        )}
                        
                        {/* Upload overlay with spinner */}
                        {uploading && (
                            <div className="absolute inset-0 bg-black-alpha-50 flex align-items-center justify-content-center">
                                <div className="bg-white border-round-full p-3 shadow-2">
                                    <i className="pi pi-spin pi-spinner text-primary text-xl"></i>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Upload status */}
                {uploading && (
                    <small className="text-primary font-medium">
                        Uploading...
                    </small>
                )}

                {/* Help text */}
                <small className="text-600 text-center text-xs">
                    Hover and click to change photo
                </small>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 