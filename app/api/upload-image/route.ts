import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'problem' or 'finished'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['problem', 'finished'].includes(type)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    // Check file size (max 4.5MB to match Vercel's body size limit)
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max size is 4.5MB.' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `${type}-${timestamp}-${sanitizedFileName}`;

    // Upload to Vercel blob
    const blob = await put(filename, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
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