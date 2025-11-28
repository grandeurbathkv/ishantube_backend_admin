import mongoose from 'mongoose';
import User from './src/moduls/users/user.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test users data
const testUsers = [
  {
    'User Name': 'Rahul Sharma',
    'Email id': 'rahul.sharma@gmail.com',
    'Mobile Number': '9876543210',
    Password: 'Test@123',
    Role: 'Admin',
    Image: 'https://i.pravatar.cc/150?img=11',
    status: true
  },
  {
    'User Name': 'Priya Singh',
    'Email id': 'priya.singh@gmail.com',
    'Mobile Number': '9876543211',
    Password: 'Test@123',
    Role: 'Marketing',
    Image: 'https://i.pravatar.cc/150?img=47',
    status: true
  },
  {
    'User Name': 'Amit Kumar',
    'Email id': 'amit.kumar@gmail.com',
    'Mobile Number': '9876543212',
    Password: 'Test@123',
    Role: 'Store Head',
    Image: 'https://i.pravatar.cc/150?img=12',
    status: true
  },
  {
    'User Name': 'Sneha Patel',
    'Email id': 'sneha.patel@gmail.com',
    'Mobile Number': '9876543213',
    Password: 'Test@123',
    Role: 'Dispatch head',
    Image: 'https://i.pravatar.cc/150?img=48',
    status: true
  },
  {
    'User Name': 'Vikram Reddy',
    'Email id': 'vikram.reddy@gmail.com',
    'Mobile Number': '9876543214',
    Password: 'Test@123',
    Role: 'Transport Manager',
    Image: 'https://i.pravatar.cc/150?img=13',
    status: true
  },
  {
    'User Name': 'Anjali Gupta',
    'Email id': 'anjali.gupta@gmail.com',
    'Mobile Number': '9876543215',
    Password: 'Test@123',
    Role: 'Accountant',
    Image: 'https://i.pravatar.cc/150?img=49',
    status: true
  },
  {
    'User Name': 'Rajesh Verma',
    'Email id': 'rajesh.verma@gmail.com',
    'Mobile Number': '9876543216',
    Password: 'Test@123',
    Role: 'Document Manager',
    Image: 'https://i.pravatar.cc/150?img=14',
    status: true
  },
  {
    'User Name': 'Neha Desai',
    'Email id': 'neha.desai@gmail.com',
    'Mobile Number': '9876543217',
    Password: 'Test@123',
    Role: 'Guest',
    Image: 'https://i.pravatar.cc/150?img=50',
    status: true
  }
];

// Create test users
const createTestUsers = async () => {
  try {
    console.log('🔄 Creating test users...\n');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 'Email id': userData['Email id'] });
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData['Email id']}`);
        continue;
      }

      // Create new user
      const user = await User.create(userData);
      console.log(`✅ Created user: ${user['User Name']} (${user['Email id']}) - Role: ${user.Role}`);
    }

    console.log('\n✅ All test users created successfully!');
    console.log('\n📊 Summary:');
    const totalUsers = await User.countDocuments({});
    console.log(`   Total users in database: ${totalUsers}`);
    
    console.log('\n🔐 Login credentials for all test users:');
    console.log('   Password: Test@123');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
};

// Run the script
(async () => {
  await connectDB();
  await createTestUsers();
})();
