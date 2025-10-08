import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

// Add a property to a specific property owner
export async function POST(req: Request, { params }: { params: Promise<{ ownerName: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    // For now, allow property owners to add their own properties
    // Later you can add more sophisticated auth checks
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const ownerName = decodeURIComponent(resolvedParams.ownerName);
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
      address
    } = propertyData;

    if (!name || !type || !sqft || !description || !rent || !amenities || !address) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Add property to the specified property owner's embedded properties array
    const result = await PropertyOwnerModel.findOneAndUpdate(
      { name: ownerName },
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
        { message: `Property owner '${ownerName}' not found` },
        { status: 404 }
      );
    }

    // Return the newly added property
    const newProperty = result.properties[result.properties.length - 1];
    
    return NextResponse.json({
      message: `Property added to ${ownerName}`,
      property: {
        ...newProperty.toObject(),
        ownerName: result.name,
        ownerId: result._id,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding property to owner:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all properties for a specific owner
export async function GET(req: Request, { params }: { params: Promise<{ ownerName: string }> }) {
  try {
    const resolvedParams = await params;
    const ownerName = decodeURIComponent(resolvedParams.ownerName);
    
    await connectToDatabase();
    
    const owner = await PropertyOwnerModel.findOne({ name: ownerName })
      .lean()
      .exec();

    if (!owner) {
      return NextResponse.json(
        { message: `Property owner '${ownerName}' not found` },
        { status: 404 }
      );
    }

    // Return owner info with their properties
    return NextResponse.json({
      owner: {
        name: (owner as any).name,
        email: (owner as any).email,
        phone: (owner as any).phone,
        _id: (owner as any)._id,
      },
      properties: (owner as any).properties || [],
      propertyCount: (owner as any).properties?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching owner properties:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}