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

    // If no property owners found, return empty array
    if (!propertyOwners || propertyOwners.length === 0) {
      console.log('No property owners found');
      return NextResponse.json([]);
    }

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

    console.log(`Returning ${allProperties.length} properties`);
    return NextResponse.json(allProperties);
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    // Always return an empty array instead of error object to prevent frontend crashes
    return NextResponse.json([]);
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

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, propertyOwnerName, ...propertyData } = await req.json();
    
    if (!propertyId || !propertyOwnerName) {
      return NextResponse.json(
        { message: 'Property ID and Property Owner Name are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update the specific property within the property owner's embedded properties array
    const result = await PropertyOwnerModel.findOneAndUpdate(
      { 
        name: propertyOwnerName,
        'properties._id': propertyId 
      },
      {
        $set: {
          'properties.$': {
            _id: propertyId,
            name: propertyData.name,
            type: propertyData.type,
            sqft: propertyData.sqft,
            description: propertyData.description,
            rent: propertyData.rent,
            extraAdult: propertyData.extraAdult || 0,
            amenities: propertyData.amenities,
            status: propertyData.status || 'available',
            picture: propertyData.picture,
            address: propertyData.address,
          }
        }
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { message: `Property not found or property owner '${propertyOwnerName}' not found` },
        { status: 404 }
      );
    }

    // Find and return the updated property
    const updatedProperty = result.properties.find((p: any) => p._id.toString() === propertyId);
    
    return NextResponse.json({
      ...updatedProperty.toObject(),
      ownerName: result.name,
      ownerId: result._id,
    });
  } catch (error: any) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, propertyOwnerName } = await req.json();
    
    if (!propertyId || !propertyOwnerName) {
      return NextResponse.json(
        { message: 'Property ID and Property Owner Name are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Remove the property from the property owner's embedded properties array
    const result = await PropertyOwnerModel.findOneAndUpdate(
      { name: propertyOwnerName },
      {
        $pull: {
          properties: { _id: propertyId }
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

    return NextResponse.json({
      message: 'Property deleted successfully',
      propertyId,
      ownerName: result.name,
      remainingPropertiesCount: result.properties.length
    });
  } catch (error: any) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}