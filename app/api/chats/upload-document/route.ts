import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// Keep under typical serverless body limits (~4.5–6MB); base64 adds ~33% size
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
];

/** Allow CORS preflight (OPTIONS) so mobile app can POST */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'OPTIONS, POST' } });
}

/**
 * POST /api/chats/upload-document
 * Upload a document for chat (PDF, Word, etc.). Returns base64 data URL to use in message content.
 * Accepts: multipart/form-data with "file" or "document".
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (formError) {
        console.error('Chat document upload formData error:', formError);
        return NextResponse.json(
          { success: false, error: 'Request too large or invalid. Try a file under 4MB.' },
          { status: 413 }
        );
      }

      let file = formData.get('file') as File | Blob | null;
      if (!file) file = formData.get('document') as File | Blob | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Document file is required. Send "file" or "document" in FormData.' },
          { status: 400 }
        );
      }

      const fileObj = file instanceof File ? file : new File([file], 'document', { type: (file as Blob).type || 'application/octet-stream' });
      const type = fileObj.type?.toLowerCase().split(';')[0] || 'application/octet-stream';
      const allowed = ALLOWED_MIMES.some((m) => type === m || type.startsWith(m));
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'File type not allowed. Use PDF, Word (.doc/.docx), Excel (.xls/.xlsx), or plain text.' },
          { status: 400 }
        );
      }

      if (fileObj.size > MAX_DOCUMENT_BYTES) {
        return NextResponse.json(
          { success: false, error: `File too large. Maximum size is ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await (fileObj as Blob).arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        data: { url: dataUrl, mimeType: type, name: fileObj.name || 'document' },
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      console.error('Chat document upload error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload document. Try a smaller file (under 4MB).' },
        { status: 500 }
      );
    }
  });
}
