import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      password, 
      selectedProperty,
      address 
    } = body;

    console.log('Creating tenant:', { name, email, phone, selectedProperty, address });

    // Validate required fields
    if (!name || !email || !password || !selectedProperty) {
      return NextResponse.json({ 
        error: 'Name, email, password, and property selection are required' 
      }, { status: 400 });
    }

    // Validate email format
    if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the tenant user
    const newTenant = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      userType: 'tenant',
      selectedProperty,
      address: address || undefined,
      isVerified: false,
      identityVerificationStatus: 'pending',
      role: 'user'
    });

    console.log('Tenant created successfully:', {
      id: newTenant._id,
      email: newTenant.email,
      name: newTenant.name
    });

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant: {
          _id: newTenant._id,
          name: newTenant.name,
          email: newTenant.email,
          phone: newTenant.phone,
          selectedProperty: newTenant.selectedProperty
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant', details: error.message },
      { status: 500 }
    );
  }
}
