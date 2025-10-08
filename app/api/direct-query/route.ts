import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const connection = await connectToDatabase();
    
    // Query the collection directly without using the model
    const db = connection.connection.db;
    const directResult = await db?.collection('propertyowners').find({}).toArray();
    
    console.log('Direct collection query result:', directResult);
    console.log('Direct result length:', directResult?.length);
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      directQuery: directResult,
      count: directResult?.length || 0,
      database: db?.databaseName,
    });
  } catch (error: any) {
    console.error('Direct query error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}