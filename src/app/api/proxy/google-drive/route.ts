import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  
  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }
  
  try {
    // Fetch the audio file from Google Drive
    const response = await fetch(`https://docs.google.com/uc?export=download&id=${fileId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    // Get the file content as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a response with the appropriate content type
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000', // Cache for a year
      },
    });
  } catch (error) {
    console.error('Error proxying Google Drive file:', error);
    return NextResponse.json({ error: 'Failed to proxy file' }, { status: 500 });
  }
} 