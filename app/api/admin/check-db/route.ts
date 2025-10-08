import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { UserModel } from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get property owners count and sample data
    const propertyOwnersCount = await PropertyOwnerModel.countDocuments();
    const propertyOwners = await PropertyOwnerModel.find().limit(3);
    
    // Count total properties across all owners
    const allOwners = await PropertyOwnerModel.find();
    const totalProperties = allOwners.reduce((sum, owner) => sum + (owner.properties?.length || 0), 0);
    const totalOwnerUsers = allOwners.reduce((sum, owner) => sum + (owner.users?.length || 0), 0);
    
    // Check auth collection (existing users)
    let authUsersCount = 0;
    try {
      authUsersCount = await UserModel.countDocuments();
    } catch (error) {
      // Auth collection might not exist or be accessible
      authUsersCount = 0;
    }
    
    return NextResponse.json({
      status: 'Connected to clean database structure',
      collections: {
        propertyowners: {
          count: propertyOwnersCount,
          totalProperties: totalProperties,
          totalEmbeddedUsers: totalOwnerUsers,
        },
        auth: {
          count: authUsersCount,
          note: 'Existing users collection (preserved)',
        }
      },
      samplePropertyOwners: propertyOwners.map(owner => ({
        name: owner.name,
        email: owner.email,
        propertiesCount: owner.properties?.length || 0,
        usersCount: owner.users?.length || 0,
        sampleProperties: owner.properties?.slice(0, 2).map((p: any) => ({
          name: p.name,
          type: p.type,
          rent: p.rent,
          status: p.status,
        })) || [],
      })),
      structure: {
        description: 'Clean database structure',
        collections: [
          'auth (existing users preserved)',
          'propertyowners (top-level collection)',
          '  └── Each owner document contains:',
          '      ├── properties: [embedded array]',
          '      └── users: [embedded array]'
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'Database connection failed',
      error: error.message,
    }, { status: 500 });
  }
}