const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Property Owner Schema
const PropertyOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Property Schema
const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['residential', 'commercial', 'house'], required: true },
  sqft: { type: Number, required: true },
  description: { type: String, required: true },
  rent: { type: Number, required: true },
  extraAdult: { type: Number, default: 0 },
  amenities: { type: String },
  status: { 
    type: String, 
    enum: ['available', 'rented', 'being-remodeled', 'under-remodel', 'maintenance'], 
    default: 'available' 
  },
  picture: { type: String },
  propertyOwner: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
});

const PropertyOwner = mongoose.model('PropertyOwner', PropertyOwnerSchema);
const Property = mongoose.model('Property', PropertySchema);

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

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if data already exists
    const existingPropertiesCount = await Property.countDocuments();
    const existingOwnersCount = await PropertyOwner.countDocuments();
    
    console.log(`Existing properties: ${existingPropertiesCount}`);
    console.log(`Existing property owners: ${existingOwnersCount}`);

    // Create property owner
    console.log('Creating property owner...');
    let brightlandOwner = await PropertyOwner.findOne({ name: 'Brightland Properties' });
    if (!brightlandOwner) {
      brightlandOwner = await PropertyOwner.create({
        name: 'Brightland Properties',
        email: 'admin@brightlandrentals.com',
        phone: '(555) 123-4567',
      });
      console.log('Created property owner:', brightlandOwner.name);
    } else {
      console.log('Property owner already exists:', brightlandOwner.name);
    }

    // Convert and insert residential properties
    console.log('Converting residential properties...');
    const residentialProperties = resRentalList.map((prop) => ({
      name: prop.name,
      type: 'residential',
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: prop.extraAdult || 0,
      amenities: prop.ammenities,
      status: normalizeStatus(prop.status),
      picture: prop.picture,
      propertyOwner: 'Brightland Properties',
      address: {
        street: `${prop.name} Street`,
        city: 'Brightland',
        state: 'CA',
        zip: '90210',
      },
    }));

    // Convert and insert commercial properties
    console.log('Converting commercial properties...');
    const commercialProperties = commRentalList.map((prop) => ({
      name: prop.name,
      type: 'commercial',
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: 0,
      amenities: 'Commercial space with utilities',
      status: normalizeStatus(prop.status),
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
    console.log('Converting house properties...');
    const houseProperties = houseRentalList.map((prop) => ({
      name: prop.name,
      type: 'house',
      sqft: prop.Sqft,
      description: prop.desc,
      rent: prop.rent,
      extraAdult: prop.extraAdult || 0,
      amenities: 'Full house with yard and utilities',
      status: normalizeStatus(prop.status),
      picture: prop.picture,
      propertyOwner: 'Brightland Properties',
      address: {
        street: prop.name,
        city: 'Brightland',
        state: 'CA',
        zip: '90210',
      },
    }));

    // Insert all properties if they don't exist
    const allProperties = [...residentialProperties, ...commercialProperties, ...houseProperties];
    
    if (existingPropertiesCount === 0) {
      console.log('Inserting properties...');
      const insertedProperties = await Property.insertMany(allProperties);
      console.log(`Successfully inserted ${insertedProperties.length} properties`);
    } else {
      console.log('Properties already exist, skipping insertion');
    }

    // Verify the data
    const finalPropertiesCount = await Property.countDocuments();
    const finalOwnersCount = await PropertyOwner.countDocuments();
    
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Property Owners: ${finalOwnersCount}`);
    console.log(`Properties: ${finalPropertiesCount}`);
    
    // Show some sample data
    const sampleProperties = await Property.find().limit(3);
    console.log('\nSample properties:');
    sampleProperties.forEach(prop => {
      console.log(`- ${prop.name} (${prop.type}) - $${prop.rent} - ${prop.status}`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();