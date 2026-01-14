import React from 'react';
import { Card } from 'primereact/card';
import { getProfileImageUrl, getOptimizedImageUrl } from '@/lib/cloudinary-client';

export default function TestCloudinaryClient() {
    const testPublicId = 'primochat/profile-images/test-image';
    
    const testUrls = {
        small: getProfileImageUrl(testPublicId, 'small'),
        medium: getProfileImageUrl(testPublicId, 'medium'),
        large: getProfileImageUrl(testPublicId, 'large'),
        optimized: getOptimizedImageUrl(testPublicId, { width: 300, height: 200, quality: 90 })
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card title="Cloudinary Client Test" className="p-4">
                    <div className="flex flex-column gap-4">
                        <div className="text-center">
                            <h3>Testing Client-Safe Cloudinary URL Generation</h3>
                            <p className="text-600">
                                This component tests the client-safe Cloudinary URL generation functions.
                            </p>
                        </div>

                        <div className="flex flex-column gap-2">
                            <h4>Generated URLs:</h4>
                            <div className="p-3 surface-100 border-round">
                                <p><strong>Small Profile:</strong> {testUrls.small}</p>
                                <p><strong>Medium Profile:</strong> {testUrls.medium}</p>
                                <p><strong>Large Profile:</strong> {testUrls.large}</p>
                                <p><strong>Optimized:</strong> {testUrls.optimized}</p>
                            </div>
                        </div>

                        <div className="flex flex-column gap-2">
                            <h4>Environment Variables:</h4>
                            <div className="p-3 surface-100 border-round">
                                <p><strong>Cloud Name:</strong> {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'Not set'}</p>
                            </div>
                        </div>

                        <div className="flex flex-column gap-2">
                            <h4>Test Images:</h4>
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <h5>Small (100x100)</h5>
                                    <img 
                                        src={testUrls.small} 
                                        alt="Small test" 
                                        className="w-full border-round"
                                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <h5>Medium (200x200)</h5>
                                    <img 
                                        src={testUrls.medium} 
                                        alt="Medium test" 
                                        className="w-full border-round"
                                        style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <h5>Large (400x400)</h5>
                                    <img 
                                        src={testUrls.large} 
                                        alt="Large test" 
                                        className="w-full border-round"
                                        style={{ width: '400px', height: '400px', objectFit: 'cover' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
} 