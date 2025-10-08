const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Property Owner schema with embedded properties
const PropertyOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  properties: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['residential', 'commercial', 'house'], required: true },
    sqft: { type: Number, required: true },
    description: { type: String, required: true },
    rent: { type: Number, required: true },
    extraAdult: { type: Number, default: 0 },
    amenities: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['available', 'rented', 'under-remodel', 'maintenance'], 
      default: 'available' 
    },
    picture: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
    },
  }],
}, { timestamps: true });

const PropertyOwner = mongoose.model('PropertyOwner', PropertyOwnerSchema);

// Data to migrate
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

function normalizeStatus(status) {
  return status.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('being-remodeled', 'being-remodeled')
    .replace('under-remodel', 'under-remodel');
}

async function migrateEmbedded() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if Brightland Properties already has embedded properties
    const brightlandOwner = await PropertyOwner.findOne({ name: 'Brightland Properties' });
    
    if (brightlandOwner && brightlandOwner.properties && brightlandOwner.properties.length > 0) {
      console.log(`Brightland Properties already has ${brightlandOwner.properties.length} embedded properties`);
      return;
    }

    // Convert data to embedded format
    const allPropertyData = [];
    
    // Add residential properties
    resRentalList.forEach(prop => {
      allPropertyData.push({
        name: prop.name,
        type: 'residential',
        sqft: prop.Sqft,
        description: prop.desc,
        rent: prop.rent,
        extraAdult: prop.extraAdult || 0,
        amenities: prop.ammenities,
        status: normalizeStatus(prop.status),
        picture: prop.picture,
        address: {
          street: `${prop.name} Street`,
          city: 'Brightland',
          state: 'CA',
          zip: '90210',
        },
      });
    });

    // Add commercial properties
    commRentalList.forEach(prop => {
      allPropertyData.push({
        name: prop.name,
        type: 'commercial',
        sqft: prop.Sqft,
        description: prop.desc,
        rent: prop.rent,
        extraAdult: 0,
        amenities: 'Commercial space with utilities',
        status: normalizeStatus(prop.status),
        picture: prop.picture,
        address: {
          street: prop.name,
          city: 'Brightland',
          state: 'CA',
          zip: '90210',
        },
      });
    });

    // Add house properties
    houseRentalList.forEach(prop => {
      allPropertyData.push({
        name: prop.name,
        type: 'house',
        sqft: prop.Sqft,
        description: prop.desc,
        rent: prop.rent,
        extraAdult: prop.extraAdult || 0,
        amenities: 'Full house with yard and utilities',
        status: normalizeStatus(prop.status),
        picture: prop.picture,
        address: {
          street: prop.name,
          city: 'Brightland',
          state: 'CA',
          zip: '90210',
        },
      });
    });

    // Create or update Brightland Properties with embedded properties
    const result = await PropertyOwner.findOneAndUpdate(
      { name: 'Brightland Properties' },
      {
        $set: {
          name: 'Brightland Properties',
          email: 'admin@brightlandrentals.com',
          phone: '(555) 123-4567',
          properties: allPropertyData
        }
      },
      { upsert: true, new: true }
    );

    console.log('\n=== EMBEDDED MIGRATION SUMMARY ===');
    console.log(`Property Owner: ${result.name}`);
    console.log(`Embedded Properties: ${result.properties.length}`);
    
    // Show property breakdown
    const residential = result.properties.filter(p => p.type === 'residential').length;
    const commercial = result.properties.filter(p => p.type === 'commercial').length;
    const houses = result.properties.filter(p => p.type === 'house').length;
    
    console.log(`- Residential: ${residential}`);
    console.log(`- Commercial: ${commercial}`);
    console.log(`- Houses: ${houses}`);
    
    console.log('\nSample properties:');
    result.properties.slice(0, 3).forEach(prop => {
      console.log(`- ${prop.name} (${prop.type}) - $${prop.rent} - ${prop.status}`);
    });

    console.log('\n✅ Embedded migration completed successfully!');
    console.log('Properties are now properly embedded under Brightland Properties');
    
  } catch (error) {
    console.error('❌ Embedded migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateEmbedded();