import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';

// Add a user to a specific property owner
export async function POST(req: Request, { params }: { params: Promise<{ ownerName: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can add users to property owners
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheckResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/check-admin`,
      {
        headers: {
          cookie: req.headers.get('cookie') || '',
        },
      }
    );
    
    const adminCheck = await adminCheckResponse.json();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const ownerName = decodeURIComponent(resolvedParams.ownerName);
    const userData = await req.json();
    
    const { name, email } = userData;

    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user with this email already exists for this property owner
    const existingOwner = await PropertyOwnerModel.findOne({ 
      name: ownerName,
      'users.email': email 
    });

    if (existingOwner) {
      return NextResponse.json(
        { message: 'User with this email already exists for this property owner' },
        { status: 400 }
      );
    }

    // Add user to the specified property owner's users array
    const result = await PropertyOwnerModel.findOneAndUpdate(
      { name: ownerName },
      {
        $push: {
          users: {
            name,
            email,
            password: '', // Empty password - user would need to set up via auth
            userType: 'property-owner',
            selectedProperty: '',
            isVerified: false,
            identityVerificationStatus: 'pending',
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

    return NextResponse.json({
      message: `User added to ${ownerName}`,
      user: {
        name,
        email,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding user to property owner:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
