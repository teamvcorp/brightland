const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Property Owner schema with embedded properties and users
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
  users: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    userType: { 
      type: String, 
      enum: ['tenant', 'manager', 'property-owner'], 
      required: true 
    },
    selectedProperty: { type: String },
    company: { type: String },
    isVerified: { type: Boolean, default: false },
    identityVerificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    },
  }],
}, { timestamps: true });

const PropertyOwner = mongoose.model('PropertyOwner', PropertyOwnerSchema);

// Complete properties data (all 18 original properties)
const allProperties = [
  // Residential properties (7)
  {
    name: "Apt 1",
    type: "residential",
    sqft: 680,
    description: "2 Bedroom 1 bath",
    rent: 950,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "rented",
    picture: "https://picsum.photos/seed/apt1/200/120",
    address: {
      street: "Apt 1 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 2",
    type: "residential",
    sqft: 621,
    description: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "available",
    picture: "https://picsum.photos/seed/apt2/200/120",
    address: {
      street: "Apt 2 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 3",
    type: "residential",
    sqft: 500,
    description: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "rented",
    picture: "https://picsum.photos/seed/apt3/200/120",
    address: {
      street: "Apt 3 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 4",
    type: "residential",
    sqft: 528,
    description: "1 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "being-remodeled",
    picture: "https://picsum.photos/seed/apt4/200/120",
    address: {
      street: "Apt 4 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 5",
    type: "residential",
    sqft: 840,
    description: "2 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "rented",
    picture: "https://picsum.photos/seed/apt5/200/120",
    address: {
      street: "Apt 5 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 6",
    type: "residential",
    sqft: 750,
    description: "2 Bedroom 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, water and sewer",
    status: "available",
    picture: "https://picsum.photos/seed/apt6/200/120",
    address: {
      street: "Apt 6 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Apt 7",
    type: "residential",
    sqft: 450,
    description: "2 Bedroom 1 bath",
    rent: 600,
    extraAdult: 100,
    amenities: "Apartment includes Highspeed internet, onsite laundry, electric, water and sewer",
    status: "rented",
    picture: "https://picsum.photos/seed/apt7/200/120",
    address: {
      street: "Apt 7 Street",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  // Commercial properties (5)
  {
    name: "503 Lake Ave",
    type: "commercial",
    sqft: 2400,
    description: "Commercial",
    rent: 1500,
    extraAdult: 0,
    amenities: "Commercial space with utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/unit1/200/120",
    address: {
      street: "503 Lake Ave",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "501 Lake Ave",
    type: "commercial",
    sqft: 2400,
    description: "Commercial",
    rent: 1500,
    extraAdult: 0,
    amenities: "Commercial space with utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/unit2/200/120",
    address: {
      street: "501 Lake Ave",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "103 Railroad",
    type: "commercial",
    sqft: 400,
    description: "Commercial",
    rent: 450,
    extraAdult: 0,
    amenities: "Commercial space with utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/unit3/200/120",
    address: {
      street: "103 Railroad",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "105 Railroad",
    type: "commercial",
    sqft: 728,
    description: "Commercial",
    rent: 850,
    extraAdult: 0,
    amenities: "Commercial space with utilities",
    status: "available",
    picture: "https://picsum.photos/seed/unit4/200/120",
    address: {
      street: "105 Railroad",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "107 Railroad",
    type: "commercial",
    sqft: 1040,
    description: "Commercial",
    rent: 1000,
    extraAdult: 0,
    amenities: "Commercial space with utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/unit5/200/120",
    address: {
      street: "107 Railroad",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  // House properties (6)
  {
    name: "600 5th west",
    type: "house",
    sqft: 1000,
    description: "Residential",
    rent: 850,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "under-remodel",
    picture: "https://picsum.photos/seed/house1/200/120",
    address: {
      street: "600 5th west",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "600 1/2 5th west",
    type: "house",
    sqft: 1000,
    description: "Residential",
    rent: 850,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/house2/200/120",
    address: {
      street: "600 1/2 5th west",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "602 Otsego",
    type: "house",
    sqft: 1000,
    description: "2 bedroom, to bath",
    rent: 950,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/house3/200/120",
    address: {
      street: "602 Otsego",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Superior",
    type: "house",
    sqft: 1000,
    description: "2 bed 1 bath",
    rent: 850,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/house4/200/120",
    address: {
      street: "Superior",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "Onieda",
    type: "house",
    sqft: 1000,
    description: "3 bedroom, 1 bath",
    rent: 950,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/house5/200/120",
    address: {
      street: "Onieda",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
  {
    name: "phillips",
    type: "house",
    sqft: 1000,
    description: "2 bedroom, 1 bath",
    rent: 950,
    extraAdult: 100,
    amenities: "Full house with yard and utilities",
    status: "rented",
    picture: "https://picsum.photos/seed/house6/200/120",
    address: {
      street: "phillips",
      city: "Brightland",
      state: "CA",
      zip: "90210",
    },
  },
];

async function createCleanStructure() {
  try {
    console.log('🏗️  Creating clean database structure...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Existing collections:', collections.map(c => c.name));

    // Check if propertyowners collection already exists and has Brightland Properties
    const existingBrightland = await PropertyOwner.findOne({ name: 'Brightland Properties' });
    
    if (existingBrightland) {
      console.log('⚠️  Brightland Properties already exists in propertyowners collection');
      console.log(`   Properties: ${existingBrightland.properties?.length || 0}`);
      console.log(`   Users: ${existingBrightland.users?.length || 0}`);
      return;
    }

    console.log('🏢 Creating Brightland Properties as property owner...');
    
    // Create Brightland Properties with all 18 properties
    const brightlandProperties = await PropertyOwner.create({
      name: 'Brightland Properties',
      email: 'admin@brightlandrentals.com',
      phone: '(555) 123-4567',
      properties: allProperties,
      users: [], // Start with empty users array - existing users stay in auth collection
    });

    console.log('✅ Created Brightland Properties successfully!');
    console.log(`   📍 Location: propertyowners collection (top-level)`);
    console.log(`   🏠 Properties: ${brightlandProperties.properties.length}`);
    console.log(`   👥 Users: ${brightlandProperties.users.length}`);
    
    console.log('\n📊 Final Database Structure:');
    console.log('   ├── auth (collection) - existing users preserved');
    console.log('   └── propertyowners (collection) - top level');
    console.log('       └── "Brightland Properties" document');
    console.log('           ├── properties: [18 complete properties]');
    console.log('           └── users: [empty - ready for future assignments]');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. New property owners will be added as documents in propertyowners collection');
    console.log('   2. Their properties and users will be embedded in their document');
    console.log('   3. Existing auth collection remains unchanged');
    
    console.log('\n🎉 Clean structure created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create clean structure:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createCleanStructure();