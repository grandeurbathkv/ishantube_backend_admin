import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const colorSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }
});
const Color = mongoose.model('Color', colorSchema);

const colors = [
    "NA- Not applicable",
    "GL- Luxe Gold",
    "PN- Polished Nickel",
    "BL- Matte Black",
    "SL- Luxe Steel",
    "PNCO- Cocoa Bronze & Polished Nickel",
    "RB- Venetian Bronze",
    "PGBC- Black Glass & Polished Gold",
    "CZ- Champagne Bronze",
    "BLGL- Matte Black & Luxe Gold",
    "NK- Luxe Nickel",
    "NKBL- Matte Black & Luxe Nickel",
    "CS- Polished Chrome & Matte Black",
    "KS- Black Stainless",
    "PGBC- Polished Gold",
    "GLBC- Black Glass & Luxe Gold",
    "PNPR- Lumicoat Polished Nickel",
    "CZPR- Lumicoat Champagne Bronze",
    "BNX- Black Onyx",
    "SS- Stainless",
    "GLWD- Luxe Gold & Wood",
    "PR- Lumicoat Polished Chrome",
    "SSPR- Lumicoat Stainless",
    "PNTK- Polished Nickel & Teak Wood",
    "KSPR- Lumicoat Black Stainless",
    "NKTK- Luxe Nickel & Teak Wood",
    "CS- Champagne Bronze / Porcelain",
    "BNXBL- Black Onyx / Matte Black",
    "GLCL- Luxe Gold / Clear Acrylic",
    "GLPG- Luxe Gold & Polished Gold",
    "BV- Brushed Bronze",
    "White",
    "Black",
    "CP- Polished Chrome",
    "RGD- Rose Gold",
    "AF- French Gold",
    "Cashmere",
    "Black Glass",
    "Thunder Grey",
    "Indigo",
    "Transparent Glass",
    "BN- Brushed Nickel",
    "Peacock Hone",
    "VS- Vibrant Stainless Steel",
    "BRD- Bhrushed Rose Gold",
    "Coffee",
    "Copper"
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const docs = colors.map(name => ({ name }));
        const result = await Color.insertMany(docs);
        console.log(`✅ ${result.length} colors inserted successfully!`);

        result.forEach(c => console.log(`  - ${c.name}`));
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
}

seed();
