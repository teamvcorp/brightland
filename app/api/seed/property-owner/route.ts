import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function POST() {
  try {
    await connectToDatabase();
    
    // Check if property owner already exists
    const existingOwner = await PropertyOwnerModel.findOne({ name: 'Brightland Properties' });
    
    if (existingOwner) {
      return NextResponse.json({
        success: true,
        message: 'Property owner already exists',
        propertyOwner: existingOwner,
        propertiesCount: existingOwner.properties.length,
      });
    }

    // Create the main property owner with properties (if it doesn't exist)
    const propertyOwner = await PropertyOwnerModel.create({
      name: 'Brightland Properties',
      email: 'admin@brightlandrentals.com',
      phone: '(555) 123-4567',
      properties: [], // Will be populated separately
      users: []
    });

    return NextResponse.json({
      success: true,
      message: 'Property owner created successfully',
      propertyOwner: propertyOwner,
      propertiesCount: propertyOwner.properties.length,
    });
  } catch (error: any) {
    console.error('Error creating property owner:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create/check property owner seed data',
    instructions: 'This endpoint will create the main property owner if it doesn\'t exist'
  });
}