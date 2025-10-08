import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  try {
    console.log('Property owners API called');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    await connectToDatabase();
    console.log('Database connected successfully');
    
    const propertyOwners = await PropertyOwnerModel.find({})
      .sort({ name: 1 })
      .lean()
      .exec();

    console.log('Query executed, found:', propertyOwners?.length || 0, 'property owners');

    // If no property owners found, return empty array
    if (!propertyOwners) {
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