import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Drop the old User_id index
    try {
      await usersCollection.dropIndex('User_id_1');
      console.log('✅ Dropped old User_id index');
    } catch (error) {
      console.log('⚠️  Index User_id_1 does not exist or already dropped');
    }

    // Create new sparse unique index
    await usersCollection.createIndex(
      { User_id: 1 }, 
      { unique: true, sparse: true }
    );
    console.log('✅ Created new sparse unique index on User_id');

    console.log('\n✅ Index fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing index:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

fixIndex();
