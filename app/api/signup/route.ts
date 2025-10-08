import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { name, email, password, userType, selectedProperty, propertyOwnerName, isNewPropertyOwner } = await req.json();

  if (!name || !email || !password || !userType) {
    return NextResponse.json({ message: 'Name, email, password, and user type are required' }, { status: 400 });
  }

  if (userType === 'tenant' && !selectedProperty) {
    return NextResponse.json({ message: 'Property selection is required for tenants' }, { status: 400 });
  }

  if (userType === 'property-owner' && !propertyOwnerName) {
    return NextResponse.json({ message: 'Property owner name is required for property owners' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const existingUser = await UserModel.findOne({ email }).exec();
    if (existingUser) {
      return NextResponse.json({ 
        message: 'An account with this email already exists. Please sign in instead.', 
        redirect: '/auth/signin' 
      }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle property owner creation if needed
    if (userType === 'property-owner' && isNewPropertyOwner) {
      try {
        // Create new property owner with empty properties and users arrays
        await PropertyOwnerModel.create({
          name: propertyOwnerName,
          email: email, // Use user's email for new property owner
          phone: '(555) 000-0000', // Placeholder phone
          properties: [], // Start with empty properties array
          users: [{
            name,
            email,
            password: hashedPassword,
            userType,
            isVerified: false,
            identityVerificationStatus: 'pending',
          }], // Add this user to the property owner's users array
        });
        console.log(`Created new property owner: ${propertyOwnerName} with initial user`);
      } catch (error: any) {
        // If property owner already exists, add user to existing property owner
        if (error.message.includes('duplicate key')) {
          await PropertyOwnerModel.findOneAndUpdate(
            { name: propertyOwnerName },
            {
              $push: {
                users: {
                  name,
                  email,
                  password: hashedPassword,
                  userType,
                  isVerified: false,
                  identityVerificationStatus: 'pending',
                }
              }
            }
          );
          console.log(`Added user to existing property owner: ${propertyOwnerName}`);
        } else {
          throw error;
        }
      }
    }

    const userData: any = {
      name,
      email,
      password: hashedPassword,
      userType,
      isVerified: false,
      identityVerificationStatus: 'pending',
    };

    // Add type-specific fields
    if (userType === 'tenant') {
      userData.selectedProperty = selectedProperty;
    } else if (userType === 'property-owner') {
      userData.propertyOwnerName = propertyOwnerName;
    }

    const user = await UserModel.create(userData);

    return NextResponse.json({ message: 'User created successfully', userId: user._id.toString() }, { status: 201 });
  } catch (err: any) {
    console.error(`Signup failed: ${err.message}`);
    return NextResponse.json({ message: `Internal Server Error: ${err.message}` }, { status: 500 });
  }
}