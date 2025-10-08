import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/authOptions';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get all property owners with their embedded properties
    const propertyOwners = await PropertyOwnerModel.find({})
      .lean()
      .exec();

    // Flatten all properties from all owners into a single array
    const allProperties: any[] = [];
    
    propertyOwners.forEach(owner => {
      if (owner.properties && owner.properties.length > 0) {
        owner.properties.forEach((property: any) => {
          allProperties.push({
            ...property,
            ownerName: owner.name, // Add owner name for reference
            ownerId: owner._id,
          });
        });
      }
    });

    // Sort properties by name
    allProperties.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(allProperties);
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const propertyData = await req.json();
    const {
      name,
      type,
      sqft,
      description,
      rent,
      extraAdult,
      amenities,
      status,
      picture,
      propertyOwnerName, // Changed from propertyOwner to propertyOwnerName
      address
    } = propertyData;

    if (!name || !type || !sqft || !description || !rent || !amenities || !propertyOwnerName || !address) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Add property to the specified property owner's embedded properties array
    const result = await PropertyOwnerModel.findOneAndUpdate(
      { name: propertyOwnerName },
      {
        $push: {
          properties: {
            name,
            type,
            sqft,
            description,
            rent,
            extraAdult: extraAdult || 0,
            amenities,
            status: status || 'available',
            picture,
            address,
          }
        }
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { message: `Property owner '${propertyOwnerName}' not found` },
        { status: 404 }
      );
    }

    // Return the newly added property
    const newProperty = result.properties[result.properties.length - 1];
    
    return NextResponse.json({
      ...newProperty.toObject(),
      ownerName: result.name,
      ownerId: result._id,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}