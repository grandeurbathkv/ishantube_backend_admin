// Fix Brand Database Index Issue
// Run this script to drop old Brand_id index and fix the duplicate key error

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixBrandIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the Brand collection
    const db = mongoose.connection.db;
    const brandCollection = db.collection('brands');

    console.log('🔍 Checking existing indexes...');
    
    // List all indexes
    const indexes = await brandCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Check if Brand_id index exists
    const brandIdIndex = indexes.find(idx => idx.name === 'Brand_id_1');
    if (brandIdIndex) {
      console.log('🗑️ Dropping old Brand_id index...');
      await brandCollection.dropIndex('Brand_id_1');
      console.log('✅ Old Brand_id index dropped successfully');
    } else {
      console.log('ℹ️ Brand_id index not found');
    }

    // Remove any documents with null Brand_id
    console.log('🧹 Cleaning up null Brand_id documents...');
    const deleteResult = await brandCollection.deleteMany({ Brand_id: null });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} documents with null Brand_id`);

    // Also remove documents without Brand_Code
    console.log('🧹 Cleaning up documents without Brand_Code...');
    const deleteResult2 = await brandCollection.deleteMany({ Brand_Code: { $exists: false } });
    console.log(`🗑️ Deleted ${deleteResult2.deletedCount} documents without Brand_Code`);

    console.log('✅ Brand collection fixed successfully!');
    console.log('🚀 You can now create brands without errors');

  } catch (error) {
    console.error('❌ Error fixing brand index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
};

// Run the fix
fixBrandIndex();