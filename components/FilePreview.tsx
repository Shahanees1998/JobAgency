import React from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

interface FilePreviewProps {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    onDownload: () => void;
    showPreview?: boolean;
}

export default function FilePreview({ 
    fileUrl, 
    fileName, 
    fileType, 
    fileSize, 
    onDownload,
    showPreview = true 
}: FilePreviewProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.includes('pdf')) return 'pi pi-file-pdf';
        if (fileType.includes('doc')) return 'pi pi-file-word';
        if (fileType.includes('xls')) return 'pi pi-file-excel';
        if (fileType.includes('ppt')) return 'pi pi-file-powerpoint';
        if (fileType.includes('image')) return 'pi pi-image';
        if (fileType.includes('text')) return 'pi pi-file-text';
        return 'pi pi-file';
    };

    const getFileTypeLabel = (fileType: string) => {
        if (fileType.includes('pdf')) return 'PDF Document';
        if (fileType.includes('doc')) return 'Word Document';
        if (fileType.includes('xls')) return 'Excel Spreadsheet';
        if (fileType.includes('ppt')) return 'PowerPoint Presentation';
        if (fileType.includes('image')) return 'Image File';
        if (fileType.includes('text')) return 'Text File';
        return 'Document';
    };

    const canPreview = fileType.startsWith('image/') || fileType === 'application/pdf';

    return (
        <div className="file-preview">
            <div className="text-center p-4 border-2 border-dashed border-gray-300 border-round">
                <i className={`${getFileIcon(fileType)} text-6xl text-gray-400 mb-3`}></i>
                <div className="font-semibold text-lg mb-2">{fileName}</div>
                <div className="text-600 mb-1">{formatFileSize(fileSize)}</div>
                <div className="text-sm text-500 mb-3">{getFileTypeLabel(fileType)}</div>
                
                <div className="flex gap-2 justify-content-center">
                    <Button
                        label="Download"
                        icon="pi pi-download"
                        onClick={onDownload}
                        severity="info"
                        size="small"
                    />
                    {showPreview && canPreview && (
                        <Button
                            label="Preview"
                            icon="pi pi-eye"
                            onClick={() => window.open(fileUrl, '_blank')}
                            severity="secondary"
                            size="small"
                        />
                    )}
                </div>

                {fileType.startsWith('image/') && showPreview && (
                    <div className="mt-4">
                        <img 
                            src={fileUrl} 
                            alt={fileName}
                            className="max-w-full max-h-64 border-round"
                            style={{ maxWidth: '100%', height: 'auto' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
} 