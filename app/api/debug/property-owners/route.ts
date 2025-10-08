import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  try {
    await connectToDatabase();
    
    const propertyOwners = await PropertyOwnerModel.find({})
      .lean()
      .exec();

    console.log('Debug - Property Owners found:', propertyOwners.length);
    console.log('Debug - Property Owners data:', propertyOwners);

    return NextResponse.json({
      success: true,
      count: propertyOwners.length,
      propertyOwners: propertyOwners,
      environment: process.env.NODE_ENV,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
      database: 'Connected successfully'
    });
  } catch (error: any) {
    console.error('Debug - Error fetching property owners:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      environment: process.env.NODE_ENV,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    }, { status: 500 });
  }
}