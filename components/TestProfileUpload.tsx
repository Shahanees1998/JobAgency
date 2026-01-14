import React, { useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import ProfileImageUpload from './ProfileImageUpload';

export default function TestProfileUpload() {
    const [testUserId] = useState('test-user-123');
    const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>();
    const [currentImagePublicId, setCurrentImagePublicId] = useState<string | undefined>();
    const toast = useRef<Toast>(null);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleImageUploaded = (imageUrl: string, publicId?: string) => {
        setCurrentImageUrl(imageUrl);
        setCurrentImagePublicId(publicId);
        showToast("success", "Success", `Image uploaded! URL: ${imageUrl}, Public ID: ${publicId || 'N/A'}`);
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card title="Profile Image Upload Test" className="p-4">
                    <div className="flex flex-column gap-4">
                        <div className="text-center">
                            <h3>Test Profile Image Upload with Cloudinary</h3>
                            <p className="text-600">
                                This component tests the profile image upload functionality with Cloudinary integration.
                            </p>
                        </div>

                        <div className="flex justify-content-center">
                            <ProfileImageUpload
                                currentImageUrl={currentImageUrl}
                                currentImagePublicId={currentImagePublicId}
                                userId={testUserId}
                                onImageUploaded={handleImageUploaded}
                                size="medium"
                            />
                        </div>

                        <div className="flex flex-column gap-2">
                            <h4>Current State:</h4>
                            <div className="p-3 surface-100 border-round">
                                <p><strong>Image URL:</strong> {currentImageUrl || 'None'}</p>
                                <p><strong>Public ID:</strong> {currentImagePublicId || 'None'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-content-center">
                            <Button
                                label="Clear Image"
                                icon="pi pi-trash"
                                severity="secondary"
                                onClick={() => {
                                    setCurrentImageUrl(undefined);
                                    setCurrentImagePublicId(undefined);
                                    showToast("info", "Cleared", "Image state cleared");
                                }}
                            />
                        </div>
                    </div>
                </Card>
            </div>
            <Toast ref={toast} />
        </div>
    );
} 