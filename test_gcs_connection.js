// Test script to verify Google Cloud Storage connection
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

const testGCSConnection = async () => {
  try {
    console.log('🔍 Testing Google Cloud Storage connection...\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || '❌ NOT SET'}`);
    console.log(`   GCS_PROJECT_ID: ${process.env.GCS_PROJECT_ID || '❌ NOT SET'}`);
    console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ NOT SET'}\n`);
    
    // Initialize Storage
    console.log('🔧 Initializing Google Cloud Storage...');
    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    console.log('✅ Storage initialized\n');
    
    // Get bucket
    const bucketName = process.env.GCS_BUCKET_NAME || 'ishantube-images-2025';
    console.log(`🪣 Checking bucket: ${bucketName}...`);
    const bucket = storage.bucket(bucketName);
    
    // Check if bucket exists
    const [exists] = await bucket.exists();
    if (exists) {
      console.log('✅ Bucket exists and is accessible\n');
      
      // Get bucket metadata
      console.log('📊 Bucket Metadata:');
      const [metadata] = await bucket.getMetadata();
      console.log(`   Location: ${metadata.location}`);
      console.log(`   Storage Class: ${metadata.storageClass}`);
      console.log(`   Created: ${metadata.timeCreated}\n`);
      
      // List some files (if any)
      console.log('📁 Checking for existing files...');
      const [files] = await bucket.getFiles({ maxResults: 5 });
      
      if (files.length > 0) {
        console.log(`   Found ${files.length} file(s):`);
        files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.name}`);
        });
      } else {
        console.log('   No files found (bucket is empty)');
      }
      
      console.log('\n✅ ✅ ✅ CONNECTION TEST SUCCESSFUL! ✅ ✅ ✅');
      console.log('\n🚀 Your Google Cloud Storage is ready to use!');
      console.log('   You can now start your backend server with: npm run dev\n');
      
    } else {
      console.log('❌ Bucket does not exist or is not accessible\n');
      console.log('Please check:');
      console.log('1. Bucket name is correct in .env file');
      console.log('2. Service account has access to the bucket');
      console.log('3. Bucket exists in your Google Cloud project\n');
    }
    
  } catch (error) {
    console.log('\n❌ ❌ ❌ CONNECTION TEST FAILED! ❌ ❌ ❌\n');
    console.error('Error:', error.message);
    console.log('\nPossible issues:');
    console.log('1. google-cloud-key.json file is missing or incorrect');
    console.log('2. GCS_PROJECT_ID is incorrect in .env file');
    console.log('3. Service account does not have proper permissions');
    console.log('4. Network/firewall issues');
    console.log('\nPlease refer to GOOGLE_CLOUD_SETUP.md for setup instructions.\n');
    process.exit(1);
  }
};

// Run the test
testGCSConnection();
