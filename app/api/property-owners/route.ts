import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('Property owners API called at:', new Date().toISOString());
    
    const connection = await connectToDatabase();
    console.log('Database connected in:', Date.now() - startTime, 'ms');
    
    // Try the simplest possible approach first - direct collection query
    const db = connection.connection.db;
    console.log('Database name:', db?.databaseName);
    
    // List all collections to debug
    const collections = await db?.listCollections().toArray();
    console.log('Available collections:', collections?.map(c => c.name));
    
    // Try multiple collection names that might exist
    const possibleCollectionNames = ['propertyowners', 'PropertyOwners', 'property_owners', 'propertyOwners'];
    let propertyOwners: any[] = [];
    
    for (const collectionName of possibleCollectionNames) {
      try {
        const count = await db?.collection(collectionName).countDocuments();
        console.log(`Collection "${collectionName}" has ${count} documents`);
        
        if (count && count > 0) {
          const result = await db?.collection(collectionName)
            .find({})
            .limit(50)
            .toArray();
          
          if (result && result.length > 0) {
            propertyOwners = result;
            console.log(`Found ${result.length} property owners in collection "${collectionName}"`);
            break;
          }
        }
      } catch (collectionError: any) {
        console.log(`Collection "${collectionName}" not found or error:`, collectionError.message);
      }
    }
    
    console.log('Total API time:', Date.now() - startTime, 'ms');
    console.log('Returning property owners:', propertyOwners.length);
    
    // Return just the array
    return NextResponse.json(propertyOwners);
    
  } catch (error: any) {
    console.error('API Error after', Date.now() - startTime, 'ms:', error.message);
    console.error('Full error:', error);
    
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