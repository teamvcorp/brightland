import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  try {
    console.log('Debug endpoint called');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('MongoDB URI length:', process.env.MONGODB_URI?.length || 0);
    
    await connectToDatabase();
    console.log('Database connected successfully');

    // Get database name and collection info
    const connection = await connectToDatabase();
    const dbName = connection.connection.db?.databaseName;
    console.log('Connected to database:', dbName);

    // Get all collections in the database
    const collections = await connection.connection.db?.listCollections().toArray();
    console.log('Available collections:', collections?.map(c => c.name));

    // Try to get property owners
    const propertyOwners = await PropertyOwnerModel.find({})
      .lean()
      .exec();

    console.log('Debug - Property Owners found:', propertyOwners.length);
    console.log('Debug - Property Owners data:', propertyOwners);

    // Also check if there are any documents in the propertyowners collection directly
    const rawCount = await connection.connection.db?.collection('propertyowners').countDocuments();
    console.log('Raw collection count:', rawCount);

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      databaseName: dbName,
      collections: collections?.map(c => c.name) || [],
      propertyOwnersFound: propertyOwners.length,
      propertyOwners: propertyOwners,
      rawCollectionCount: rawCount,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
      mongoUriFirst10: process.env.MONGODB_URI?.substring(0, 10) || 'Not available',
    });
  } catch (error: any) {
    console.error('Debug - Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      environment: process.env.NODE_ENV,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    }, { status: 500 });
  }
}