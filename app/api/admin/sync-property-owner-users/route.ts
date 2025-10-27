import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { UserModel } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

// Sync users to PropertyOwners based on propertyOwnerName field
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheckResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/check-admin`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );
    
    const adminCheck = await adminCheckResponse.json();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all property owners
    const propertyOwners = await PropertyOwnerModel.find({});
    
    let updatedCount = 0;
    let totalUsersAdded = 0;
    const results: any[] = [];

    for (const propertyOwner of propertyOwners) {
      // Find all users with this propertyOwnerName and userType 'property-owner'
      const users = await UserModel.find({
        userType: 'property-owner',
        propertyOwnerName: propertyOwner.name
      }).select('name email').lean();

      if (users.length > 0) {
        // Map users to the format needed for PropertyOwner.users array
        const userEntries = users.map(user => ({
          name: user.name,
          email: user.email,
          password: '', // Not used - they login with their own account
          userType: 'property-owner' as const,
          selectedProperty: '',
          isVerified: true,
          identityVerificationStatus: 'verified' as const,
        }));

        // Update the PropertyOwner with the users array
        await PropertyOwnerModel.findByIdAndUpdate(
          propertyOwner._id,
          { $set: { users: userEntries } }
        );

        updatedCount++;
        totalUsersAdded += users.length;
        
        results.push({
          propertyOwner: propertyOwner.name,
          usersAdded: users.length,
          users: users.map(u => ({ name: u.name, email: u.email }))
        });
      }
    }

    return NextResponse.json({
      message: 'Property owner users synced successfully',
      propertyOwnersUpdated: updatedCount,
      totalUsersAdded,
      results
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error syncing property owner users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be synced
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheckResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/check-admin`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );
    
    const adminCheck = await adminCheckResponse.json();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all property owners
    const propertyOwners = await PropertyOwnerModel.find({});
    
    const preview: any[] = [];

    for (const propertyOwner of propertyOwners) {
      // Find all users with this propertyOwnerName and userType 'property-owner'
      const users = await UserModel.find({
        userType: 'property-owner',
        propertyOwnerName: propertyOwner.name
      }).select('name email').lean();

      preview.push({
        propertyOwner: propertyOwner.name,
        currentUsersCount: propertyOwner.users?.length || 0,
        foundUsersCount: users.length,
        currentUsers: propertyOwner.users?.map((u: any) => ({ name: u.name, email: u.email })) || [],
        foundUsers: users.map(u => ({ name: u.name, email: u.email }))
      });
    }

    return NextResponse.json({
      message: 'Preview of users that would be synced',
      preview
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error previewing sync:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
