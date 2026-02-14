import mongoose from 'mongoose';
import { Product } from '../moduls/Inventory/product.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Utility function to round to 2 decimal places
const roundTo2Decimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Fix GST values in all products
const fixProductGST = async () => {
    try {
        console.log('\n🔍 Starting GST Fix Script...\n');

        // Find all products
        const products = await Product.find({});
        console.log(`📊 Found ${products.length} products in database\n`);

        let fixedCount = 0;
        let alreadyCorrectCount = 0;

        for (const product of products) {
            const originalGST = product.Product_gst;
            const roundedGST = roundTo2Decimals(originalGST);

            if (originalGST !== roundedGST) {
                console.log(`🔧 Fixing Product: ${product.Product_code} - ${product.Product_Description}`);
                console.log(`   Original GST: ${originalGST}%`);
                console.log(`   Rounded GST:  ${roundedGST}%`);

                product.Product_gst = roundedGST;
                await product.save();
                fixedCount++;
            } else {
                alreadyCorrectCount++;
            }
        }

        console.log('\n📈 Summary:');
        console.log(`✅ Fixed: ${fixedCount} products`);
        console.log(`✓  Already correct: ${alreadyCorrectCount} products`);
        console.log(`📊 Total processed: ${products.length} products\n`);

        if (fixedCount > 0) {
            console.log('✅ GST values have been successfully rounded to 2 decimal places!');
        } else {
            console.log('✅ All GST values are already correct!');
        }

    } catch (error) {
        console.error('❌ Error fixing GST values:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await fixProductGST();
        console.log('\n✅ Script completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    }
};

// Run the script
main();
