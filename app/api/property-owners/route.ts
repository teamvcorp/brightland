import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  try {
    console.log('Property owners API called');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    const connection = await connectToDatabase();
    console.log('Database connected successfully');
    
    let propertyOwners;
    
    try {
      // First try using the Mongoose model
      propertyOwners = await PropertyOwnerModel.find({})
        .sort({ name: 1 })
        .lean()
        .exec();
      
      console.log('Mongoose query executed, found:', propertyOwners?.length || 0, 'property owners');
      
      // If Mongoose returns empty but we suspect data exists, try direct query
      if (!propertyOwners || propertyOwners.length === 0) {
        console.log('Mongoose returned empty, trying direct database query...');
        const db = connection.connection.db;
        const directResult = await db?.collection('propertyowners').find({}).sort({ name: 1 }).toArray();
        console.log('Direct query found:', directResult?.length || 0, 'property owners');
        
        if (directResult && directResult.length > 0) {
          propertyOwners = directResult;
          console.log('Using direct query results');
        }
      }
    } catch (modelError) {
      console.error('Mongoose model error, falling back to direct query:', modelError);
      // Fallback to direct database query
      const db = connection.connection.db;
      propertyOwners = await db?.collection('propertyowners').find({}).sort({ name: 1 }).toArray();
      console.log('Fallback direct query found:', propertyOwners?.length || 0, 'property owners');
    }

    // If no property owners found, return empty array
    if (!propertyOwners || propertyOwners.length === 0) {
      console.log('No property owners found in database');
      return NextResponse.json([]);
    }

    console.log(`Returning ${propertyOwners.length} property owners`);
    console.log('Property owners data:', propertyOwners.map(po => ({ name: po.name, id: po._id })));
    
    // Return just the array, not wrapped in an object
    return NextResponse.json(propertyOwners);
  } catch (error: any) {
    console.error('Error fetching property owners:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Always return an empty array instead of error object to prevent frontend crashes
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, phone } = await req.json();

    if (!name) {
      return NextResponse.json(
        { message: 'Property owner name is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if property owner already exists
    const existingOwner = await PropertyOwnerModel.findOne({ name }).exec();
    if (existingOwner) {
      return NextResponse.json(
        { message: 'Property owner with this name already exists' },
        { status: 409 }
      );
    }

    const propertyOwner = await PropertyOwnerModel.create({
      name,
      email,
      phone,
    });

    return NextResponse.json(propertyOwner, { status: 201 });
  } catch (error: any) {
    console.error('Error creating property owner:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}