import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import { RentalApplicationModel, RentalApplication } from '../../models/RentalApplication';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'listingName', 'listingType', 'userEmail', 'userName',
      'employment', 'employer', 'monthlyIncome', 'socialSecurityLastFour',
      'referenceName', 'referencePhone', 'referenceRelation', 'moveInDate'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Connect to database
    await connectToDatabase();
    
    // Create application object
    const applicationData: Partial<RentalApplication> = {
      ...body,
      status: 'pending',
      paymentStatus: 'pending',
      applicationFee: 25.00
    };

    // Create and save application
    const application = new RentalApplicationModel(applicationData);
    const result = await application.save();
    
    const response = NextResponse.json(
      { 
        success: true, 
        applicationId: result._id.toString(),
        message: 'Application submitted successfully' 
      },
      { status: 201 }
    );
    
    // Add application ID to response headers for payment processing
    response.headers.set('application-id', result._id.toString());
    
    return response;

  } catch (error) {
    console.error('Error submitting rental application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const status = searchParams.get('status');
    
    await connectToDatabase();
    
    // Build query
    const query: any = {};
    if (userEmail) {
      query.userEmail = userEmail;
    }
    if (status) {
      query.status = status;
    }
    
    // Get applications
    const applications = await RentalApplicationModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json(applications);

  } catch (error) {
    console.error('Error fetching rental applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, status, paymentStatus } = body;
    
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Build update object
    const updateObj: any = {};
    if (status) updateObj.status = status;
    if (paymentStatus) updateObj.paymentStatus = paymentStatus;
    
    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Update application
    const result = await RentalApplicationModel.findByIdAndUpdate(
      applicationId,
      updateObj,
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Application updated successfully' 
    });

  } catch (error) {
    console.error('Error updating rental application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}