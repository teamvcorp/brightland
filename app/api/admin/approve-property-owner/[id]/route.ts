import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { PropertyOwnerModel } from '@/models/PropertyOwner';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await connectToDatabase();
    const adminUser = await UserModel.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { phone } = body;

    console.log('Approving property owner:', { userId, phone });

    // Validate required fields
    if (!phone) {
      return NextResponse.json({ 
        error: 'Phone number is required for approval' 
      }, { status: 400 });
    }
    
    // Find the user to approve
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Found user:', { 
      id: user._id, 
      email: user.email, 
      userType: user.userType,
      verificationStatus: user.propertyOwnerVerificationStatus 
    });

    if (user.userType !== 'property-owner') {
      return NextResponse.json({ error: 'User is not a property owner' }, { status: 400 });
    }

    // Allow approval even if status is undefined (old users)
    if (user.propertyOwnerVerificationStatus && user.propertyOwnerVerificationStatus !== 'pending') {
      return NextResponse.json({ 
        error: `User verification status is '${user.propertyOwnerVerificationStatus}', not pending` 
      }, { status: 400 });
    }

    // Check if PropertyOwner exists with this name
    let propertyOwner = await PropertyOwnerModel.findOne({ name: user.propertyOwnerName });
    
    // If PropertyOwner doesn't exist, create it (this should rarely happen - user signup should create it)
    if (!propertyOwner) {
      propertyOwner = await PropertyOwnerModel.create({
        name: user.propertyOwnerName,
        email: user.email,
        phone: phone,
        users: [],
        properties: [] // No properties during user approval - properties are added separately
      });
      console.log('Created new PropertyOwner (no properties):', { 
        propertyOwnerId: propertyOwner._id,
        propertyOwnerName: propertyOwner.name
      });
    }
    
    // Check if user already exists in PropertyOwner.users array
    const userExists = propertyOwner.users.some((u: any) => u.email === user.email);
    
    if (!userExists) {
      // Add user to PropertyOwner
      propertyOwner.users.push({
        name: user.name,
        email: user.email,
        password: user.password, // Keep the existing hashed password
        userType: 'property-owner',
        isVerified: true,
        identityVerificationStatus: 'verified'
      } as any);
      await propertyOwner.save();
    }

    // Update user verification status and phone
    user.propertyOwnerVerificationStatus = 'approved';
    user.propertyOwnerVerifiedBy = session.user.email;
    user.propertyOwnerVerifiedAt = new Date();
    user.phone = phone; // Update phone number from approval form
    await user.save();

    return NextResponse.json(
      {
        message: 'Property owner approved successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          propertyOwnerName: user.propertyOwnerName,
          propertyOwnerVerificationStatus: user.propertyOwnerVerificationStatus
        },
        propertyOwner: {
          _id: propertyOwner._id,
          name: propertyOwner.name
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error approving property owner:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Return detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to approve property owner', 
        details: error.message,
        errorType: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        // Include validation errors if it's a MongoDB validation error
        validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value
        })) : undefined
      },
      { status: 500 }
    );
  }
}
