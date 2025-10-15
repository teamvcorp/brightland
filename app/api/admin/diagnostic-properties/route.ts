// Diagnostic Script - Check Property Statuses
// Run this in your admin panel or as a one-time API call

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to run diagnostics
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get all property owners with their properties
    const propertyOwners = await PropertyOwnerModel.find({}).lean().exec();
    
    interface PropertyDetail {
      ownerName: string;
      propertyName: string;
      propertyId: string;
      status: string;
      type: string;
      rent: number;
    }

    const diagnostics = {
      totalOwners: propertyOwners.length,
      totalProperties: 0,
      propertiesByStatus: {
        available: 0,
        rented: 0,
        'under-remodel': 0,
        maintenance: 0,
        undefined: 0,
        null: 0,
      } as Record<string, number>,
      propertyDetails: [] as PropertyDetail[],
    };
    
    propertyOwners.forEach(owner => {
      if (owner.properties && owner.properties.length > 0) {
        owner.properties.forEach((property: any) => {
          diagnostics.totalProperties++;
          
          const status = property.status || 'undefined';
          if (diagnostics.propertiesByStatus[status] !== undefined) {
            diagnostics.propertiesByStatus[status]++;
          } else {
            diagnostics.propertiesByStatus[status] = 1;
          }
          
          diagnostics.propertyDetails.push({
            ownerName: owner.name,
            propertyName: property.name,
            propertyId: property._id,
            status: property.status || 'NO STATUS SET',
            type: property.type,
            rent: property.rent,
          });
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      diagnostics,
      recommendation: diagnostics.propertiesByStatus.available === 0 
        ? 'No properties have status "available". You need to update property statuses in the admin panel.'
        : `${diagnostics.propertiesByStatus.available} properties are available.`,
    });
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// Fix all properties to have "available" status (run once)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get all property owners
    const propertyOwners = await PropertyOwnerModel.find({}).exec();
    
    let updatedCount = 0;
    
    for (const owner of propertyOwners) {
      let ownerNeedsUpdate = false;
      
      owner.properties.forEach((property: any) => {
        // If property doesn't have a status or status is undefined/null
        if (!property.status) {
          property.status = 'available'; // Set default to available
          ownerNeedsUpdate = true;
          updatedCount++;
        }
      });
      
      if (ownerNeedsUpdate) {
        await owner.save();
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} properties to have "available" status`,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Fix error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
