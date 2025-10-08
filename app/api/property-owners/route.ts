import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('Property owners API called at:', new Date().toISOString());
    
    const connection = await connectToDatabase();
    console.log('Database connected in:', Date.now() - startTime, 'ms');
    
    let propertyOwners: any[] = [];
    
    try {
      // Use a more efficient query with projection to reduce data transfer
      propertyOwners = await PropertyOwnerModel.find({}, { name: 1, email: 1, _id: 1 })
        .sort({ name: 1 })
        .lean()
        .limit(50) // Add reasonable limit to prevent huge queries
        .exec();
      
      console.log('Mongoose query completed in:', Date.now() - startTime, 'ms, found:', propertyOwners?.length || 0, 'property owners');
      
    } catch (modelError) {
      console.error('Mongoose error, using direct query:', modelError);
      // Simplified direct query with projection
      const db = connection.connection.db;
      const directResult = await db?.collection('propertyowners')
        .find({}, { projection: { name: 1, email: 1, _id: 1 } })
        .sort({ name: 1 })
        .limit(50)
        .toArray();
      
      propertyOwners = directResult || [];
      console.log('Direct query completed in:', Date.now() - startTime, 'ms, found:', propertyOwners?.length || 0, 'property owners');
    }

    console.log('Total API time:', Date.now() - startTime, 'ms');
    
    // Return just the array
    return NextResponse.json(propertyOwners);
    
  } catch (error: any) {
    console.error('API Error after', Date.now() - startTime, 'ms:', error.message);
    
    // Always return an empty array to prevent frontend crashes
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