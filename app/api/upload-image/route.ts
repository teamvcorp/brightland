import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'problem', 'finished', or 'verification-document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['problem', 'finished', 'verification-document'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid file type. Must be: problem, finished, or verification-document' }, { status: 400 });
    }

    // Check file size (max 10MB for verification documents, 4.5MB for images)
    const maxSize = type === 'verification-document' ? 10 * 1024 * 1024 : 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = type === 'verification-document' ? '10MB' : '4.5MB';
      return NextResponse.json({ error: `File too large. Max size is ${maxSizeMB}.` }, { status: 400 });
    }

    // Check file type - allow all file types for verification documents
    if (type !== 'verification-document' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `${type}-${timestamp}-${sanitizedFileName}`;

    console.log('Uploading to Vercel Blob:', {
      type,
      filename,
      fileSize: file.size,
      fileType: file.type
    });

    // Upload to Vercel blob
    const blob = await put(filename, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('Upload successful:', {
      url: blob.url,
      filename
    });

    return NextResponse.json({ 
      url: blob.url,
      message: 'Image uploaded successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}