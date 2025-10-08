const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrateToNewDatabase() {
  try {
    console.log('🔄 Starting database migration to fix collection structure...');
    
    // Connect to the current database (brightland)
    const oldDbUri = process.env.MONGODB_URI.replace('/brightland_db', '/brightland');
    const newDbUri = process.env.MONGODB_URI; // brightland_db
    
    console.log('📂 Connecting to old database:', oldDbUri);
    const oldConnection = await mongoose.createConnection(oldDbUri);
    
    console.log('📂 Connecting to new database:', newDbUri);  
    const newConnection = await mongoose.createConnection(newDbUri);
    
    // Define schemas for both connections
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

    const UserSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      userType: { 
        type: String, 
        enum: ['tenant', 'manager', 'property-owner'], 
        required: true 
      },
      selectedProperty: { type: String },
      company: { type: String },
      propertyOwnerName: { type: String },
      isVerified: { type: Boolean, default: false },
      identityVerificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected'], 
        default: 'pending' 
      },
    }, { timestamps: true });

    // Old database models (accessing nested collections under 'brightland')
    const OldPropertyOwner = oldConnection.model('PropertyOwner', PropertyOwnerSchema);
    const OldUser = oldConnection.model('User', UserSchema);
    
    // New database models (top-level collections)
    const NewPropertyOwner = newConnection.model('PropertyOwner', PropertyOwnerSchema);
    const NewUser = newConnection.model('User', UserSchema);

    // Migrate PropertyOwners
    console.log('📋 Migrating PropertyOwners...');
    const oldPropertyOwners = await OldPropertyOwner.find({}).lean();
    console.log(`Found ${oldPropertyOwners.length} property owners to migrate`);
    
    if (oldPropertyOwners.length > 0) {
      // Clear existing data in new database
      await NewPropertyOwner.deleteMany({});
      
      // Insert migrated data
      const migratedOwners = await NewPropertyOwner.insertMany(oldPropertyOwners);
      console.log(`✅ Migrated ${migratedOwners.length} property owners`);
      
      // Show property count
      const totalProperties = migratedOwners.reduce((sum, owner) => sum + (owner.properties?.length || 0), 0);
      console.log(`📊 Total properties: ${totalProperties}`);
    }

    // Migrate Users
    console.log('👥 Migrating Users...');
    const oldUsers = await OldUser.find({}).lean();
    console.log(`Found ${oldUsers.length} users to migrate`);
    
    if (oldUsers.length > 0) {
      // Clear existing data in new database
      await NewUser.deleteMany({});
      
      // Insert migrated data
      const migratedUsers = await NewUser.insertMany(oldUsers);
      console.log(`✅ Migrated ${migratedUsers.length} users`);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const newOwnerCount = await NewPropertyOwner.countDocuments();
    const newUserCount = await NewUser.countDocuments();
    
    console.log(`✅ New database contains:`);
    console.log(`  - PropertyOwners: ${newOwnerCount}`);
    console.log(`  - Users: ${newUserCount}`);
    
    // Show sample data
    const sampleOwner = await NewPropertyOwner.findOne({}).lean();
    if (sampleOwner) {
      console.log(`\n📋 Sample PropertyOwner: ${sampleOwner.name}`);
      console.log(`   Properties: ${sampleOwner.properties?.length || 0}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📍 Collections are now at the top level:');
    console.log('   - propertyowners (not brightland.propertyowners)');
    console.log('   - users (not brightland.users)');
    
    await oldConnection.close();
    await newConnection.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateToNewDatabase();