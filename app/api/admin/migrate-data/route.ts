import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PropertyModel } from '@/models/Property';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

// Static data to migrate (moved inline)
const resRentalList = [
  {
    name: "Apt 1",
    Sqft: 680,
    desc: "2 Bedroom 1 bath",
    rent: 950,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Rented",
    picture: "https://picsum.photos/seed/apt1/200/120",
  },
  {
    name: "Apt 2",
    Sqft: 621,
    desc: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Available",
    picture: "https://picsum.photos/seed/apt2/200/120",
  },
  {
    name: "Apt 3",
    Sqft: 500,
    desc: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Rented",
    picture: "https://picsum.photos/seed/apt3/200/120",
  },
  {
    name: "Apt 4",
    Sqft: 528,
    desc: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Being Remodeled",
    picture: "https://picsum.photos/seed/apt4/200/120",
  },
  {
    name: "Apt 5",
    Sqft: 840,
    desc: "2 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Rented",
    picture: "https://picsum.photos/seed/apt5/200/120",
  },
  {
    name: "Apt 6",
    Sqft: 750,
    desc: "2 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "Available",
    picture: "https://picsum.photos/seed/apt6/200/120",
  },
  {
    name: "Apt 7",
    Sqft: 450,
    desc: "2 Bedroom 1 bath",
    rent: 600,
    extraAdult: 100,
    ammenities: "Apartment includes Highspeed internet, onsite laundry, electric, water and sewer",
    status: "Rented",
    picture: "https://picsum.photos/seed/apt7/200/120",
  },
];

const commRentalList = [
  {
    name: "503 Lake Ave",
    Sqft: 2400,
    rent: 1500,
    desc: "Commercial",
    status: "Rented",
    picture: "https://picsum.photos/seed/unit1/200/120",
  },
  {
    name: "501 Lake Ave",
    Sqft: 2400,
    rent: 1500,
    desc: "Commercial",
    status: "Rented",
    picture: "https://picsum.photos/seed/unit2/200/120",
  },
  {
    name: "103 Railroad",
    Sqft: 400,
    rent: 450,
    desc: "Commercial",
    status: "Rented",
    picture: "https://picsum.photos/seed/unit3/200/120",
  },
  {
    name: "105 Railroad",
    Sqft: 728,
    rent: 850,
    desc: "Commercial",
    status: "Available",
    picture: "https://picsum.photos/seed/unit4/200/120",
  },
  {
    name: "107 Railroad",
    Sqft: 1040,
    rent: 1000,
    desc: "Commercial",
    status: "Rented",
    picture: "https://picsum.photos/seed/unit5/200/120",
  },
];

const houseRentalList = [
  {
    name: "600 5th west",
    Sqft: 1000,
    rent: 850,
    extraAdult: 100,
    desc: "Residential",
    status: "Under Remodel",
    picture: "https://picsum.photos/seed/house1/200/120",
  },
  {
    name: "600 1/2 5th west",
    Sqft: 1000,
    rent: 850,
    extraAdult: 100,
    desc: "Residential",
    status: "Rented",
    picture: "https://picsum.photos/seed/house2/200/120",
  },
  {
    name: "602 Otsego",
    Sqft: 1000,
    rent: 950,
    extraAdult: 100,
    desc: "2 bedroom, to bath",
    status: "Rented",
    picture: "https://picsum.photos/seed/house3/200/120",
  },
  {
    name: "Superior",
    Sqft: 1000,
    rent: 850,
    extraAdult: 100,
    desc: "2 bed 1 bath",
    status: "Rented",
    picture: "https://picsum.photos/seed/house4/200/120",
  },
  {
    name: "Onieda",
    Sqft: 1000,
    rent: 950,
    extraAdult: 100,
    desc: "3 bedroom, 1 bath",
    status: "Rented",
    picture: "https://picsum.photos/seed/house5/200/120",
  },
  {
    name: "phillips",
    Sqft: 1000,
    rent: 950,
    extraAdult: 100,
    desc: "2 bedroom, 1 bath",
    status: "Rented",
    picture: "https://picsum.photos/seed/house6/200/120",
  },
];

export async function POST(req: Request) {
  try {
    // Temporarily remove admin check for initial migration
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 401 });
    // }

    await connectToDatabase();

    // Check if properties already exist
    const existingPropertiesCount = await PropertyModel.countDocuments();
    if (existingPropertiesCount > 0) {
      return NextResponse.json(
        { message: 'Properties already exist in database. Migration skipped.' },
        { status: 200 }
      );
    }

    // Create default property owner
    let brightlandOwner = await PropertyOwnerModel.findOne({ name: 'Brightland Properties' });
    if (!brightlandOwner) {
      brightlandOwner = await PropertyOwnerModel.create({
        name: 'Brightland Properties',
        email: 'admin@brightlandrentals.com',
        phone: '(555) 123-4567',
      });
    }

    // Convert and insert residential properties
    const residentialProperties = resRentalList.map((prop: any) => ({
      name: prop.name,
      type: 'residential' as const,
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: prop.extraAdult || 0,
      amenities: prop.ammenities,
      status: prop.status.toLowerCase().replace(' ', '-') as any,
      picture: prop.picture,
      propertyOwner: 'Brightland Properties',
      address: {
        street: `${prop.name} Street`, // Placeholder addresses
        city: 'Brightland',
        state: 'CA',
        zip: '90210',
      },
    }));

    // Convert and insert commercial properties
    const commercialProperties = commRentalList.map((prop: any) => ({
      name: prop.name,
      type: 'commercial' as const,
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: 0,
      amenities: 'Commercial space with utilities',
      status: prop.status.toLowerCase().replace(' ', '-') as any,
      picture: prop.picture,
      propertyOwner: 'Brightland Properties',
      address: {
        street: prop.name,
        city: 'Brightland',
        state: 'CA',
        zip: '90210',
      },
    }));

    // Convert and insert house properties
    const houseProperties = houseRentalList.map((prop: any) => ({
      name: prop.name,
      type: 'house' as const,
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: prop.extraAdult || 0,
      amenities: 'Full house with yard and utilities',
      status: prop.status.toLowerCase().replace(' ', '-').replace('under remodel', 'under-remodel') as any,
      picture: prop.picture,
      propertyOwner: 'Brightland Properties',
      address: {
        street: prop.name,
        city: 'Brightland',
        state: 'CA',
        zip: '90210',
      },
    }));

    // Insert all properties
    const allProperties = [...residentialProperties, ...commercialProperties, ...houseProperties];
    const insertedProperties = await PropertyModel.insertMany(allProperties);

    return NextResponse.json({
      message: 'Database migration completed successfully',
      propertyOwner: brightlandOwner,
      propertiesCreated: insertedProperties.length,
      properties: insertedProperties,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      { message: `Migration failed: ${error.message}` },
      { status: 500 }
    );
  }
}