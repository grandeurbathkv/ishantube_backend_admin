import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }
});
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    subcategories: [subcategorySchema]
});
const Category = mongoose.model('Category', categorySchema);

const categories = [
    {
        name: "Showering",
        subcategories: [
            { name: "Showerarm - Ceiling Mount" },
            { name: "Showerarm - WM" },
            { name: "SH - 1F Round" },
            { name: "SH - 1F Square / Rect." },
            { name: "Wall Elbow" },
            { name: "HS - 1-Function" },
            { name: "Body Jet Rough" },
            { name: "Sprayhead - HydraChoice" },
            { name: "Trim - HydraChoice" },
            { name: "2-in-1 Showerhead" },
            { name: "SH - Multi-Function Rect." },
            { name: "SH - Multi-Function Round" },
            { name: "Slide Bar" },
            { name: "Rough - HydraChoice" },
            { name: "HS - Multi-Function" },
            { name: "Rough - Kintsu Shower" },
            { name: "HS with Slide Bar" },
            { name: "Hose Only" },
            { name: "Holder with Integrated Elbow" },
            { name: "HS w Slide Bar" },
            { name: "HS - Bracket" }
        ]
    },
    {
        name: "Tub & Shower",
        subcategories: [
            { name: "In-wall T&S Trim" },
            { name: "Rough - In-wall T&S" },
            { name: "Spout with Diverter to HS" },
            { name: "Sensori Vol. Ctrl Trim" },
            { name: "Rough - 4 Hole Tub Filler" },
            { name: "Freestanding Tub Filler Trim" },
            { name: "17T Trim" },
            { name: "Handle Trim" },
            { name: "Integrated Trim w 3-Setting Diverter" },
            { name: "Spout without Diverter" },
            { name: "Rough - Freestanding Tub Filler" },
            { name: "4-Hole Tub Filler Trim" },
            { name: "6-Setting Diverter Trim" },
            { name: "Spout with Diverter to SH" },
            { name: "Integrated Trim w 6-Setting Diverter" },
            { name: "Sensori TH Trim" },
            { name: "Rough - 17T" },
            { name: "Rough - 6/3 Setting" },
            { name: "Handle Trim - Sensori TH" },
            { name: "Rough - MagnaSpin TH" },
            { name: "Rough - MagnaSpin Vol" },
            { name: "Rough - Sensori Vol" },
            { name: "Rough - Integrated" },
            { name: "Trim - MagnaSpin TH" },
            { name: "Trim - MagnaSpin Vol" },
            { name: "Rough - MagnaChoice 5B TH" },
            { name: "Rough - MagnaChoice 3B TH" },
            { name: "Rough - MagnaChoice 1B On/Off" },
            { name: "Trim - MagnaChoice 5B TH" },
            { name: "Trim - MagnaChoice 3B TH" },
            { name: "Trim - MagnaChoice 1B On/Off" },
            { name: "Handle Trim - Integrated" },
            { name: "2H WM Tub Filler Trim" },
            { name: "Rough - MagnaChoice Bud 3B TH" },
            { name: "Trim - MagnaChoice Bud" },
            { name: "Rough - Choice Dway 2B" },
            { name: "Handle Trim - Choice Dway" },
            { name: "Trim - Choice Dway" }
        ]
    },
    {
        name: "Lav Faucets",
        subcategories: [
            { name: "1H WM Trim" },
            { name: "2H WM Lav Trim" },
            { name: "2H Tall Lav" },
            { name: "1H Lav" },
            { name: "1H Tall Lav" },
            { name: "2H WM Bundle" },
            { name: "Handle Trim - 2H DM Lav" },
            { name: "2H Deck-Mount Lav" },
            { name: "Rough - 2H WM Lav" },
            { name: "Rough - 1H WM Lav" },
            { name: "Rough - 1 Hole WM Lav" },
            { name: "1H Lav with Touch" },
            { name: "Handle Trim" },
            { name: "Handle Trim - 1H WM Lav" },
            { name: "1H Mid-Height Lav" },
            { name: "Handle Trim 2H Deck Mount Lav" },
            { name: "Handle Trim - WM Lav" }
        ]
    },
    {
        name: "Accessories",
        subcategories: [
            { name: "Robe Hook" },
            { name: "Towel Bar/Shelf/Ring" },
            { name: "Single Towel Bar" },
            { name: "Toilet Paper Holder" },
            { name: "Double Towel Bar" },
            { name: "Towel Ring" },
            { name: "Soap Dish/Dispenser" },
            { name: "Light/Candle Sconce" },
            { name: "Glass Shelf" },
            { name: "Drawer Knob & Pull" }
        ]
    },
    {
        name: "Fittings & Allied",
        subcategories: [
            { name: "Bottle Trap" },
            { name: "Grid Drain" },
            { name: "Bib Tap" },
            { name: "Health Faucet Sprayhead" },
            { name: "Angle Valve" },
            { name: "Concealed Valve - Rough" },
            { name: "Concealed Valve - Trim" },
            { name: "Holder with Integrated Elbow" },
            { name: "Hose Only" },
            { name: "Concealed Cistern" },
            { name: "Cover Plate" },
            { name: "Health Faucet" },
            { name: "Floor Drain" }
        ]
    },
    {
        name: "Kitchen Faucets",
        subcategories: [
            { name: "Pull-Down Kitchen Faucet" },
            { name: "WM Kitchen Cold-Only" },
            { name: "WM Kitchen Mixer" },
            { name: "ShieldSpray Wand" },
            { name: "Bar/Prep/Beverage Faucet" },
            { name: "Kitchen Faucet" },
            { name: "Glass Rinser" },
            { name: "Articulating Faucet with Touch" },
            { name: "Pull-Down Kitchen Faucet with Touch" },
            { name: "RO Faucet" }
        ]
    },
    {
        name: "Spares",
        subcategories: [
            { name: "Spares" },
            { name: "Connector" },
            { name: "Cartridge" },
            { name: "Mounting Hardware" },
            { name: "Hose" },
            { name: "Handle Kit" },
            { name: "Aerator" }
        ]
    },
    {
        name: "Sanitaryware",
        subcategories: [
            { name: "Wall Mounted WC Rimless" },
            { name: "Wall Mounted WC Box Rim" },
            { name: "Floor Mounted WC Rimless" },
            { name: "Floor Mounted WC Box Rim" },
            { name: "Electronic WC" },
            { name: "Seat Cover" },
            { name: "Electronic Seat Cover" },
            { name: "Bidget Seat Cover" },
            { name: "Countertop Basin Without Tap Hole" },
            { name: "Countertop Basin With Tap hole" },
            { name: "Semi recessed Basin With Tap Hole" },
            { name: "Semi recessed Basin Without Tap Hole" },
            { name: "Undercounter Basin" }
        ]
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const result = await Category.insertMany(categories);
        console.log(`\n✅ ${result.length} categories inserted successfully!\n`);

        result.forEach(cat => {
            console.log(`📁 ${cat.name} (${cat.subcategories.length} subcategories)`);
            cat.subcategories.forEach(sub => console.log(`   └─ ${sub.name}`));
        });

        const totalSubs = result.reduce((sum, cat) => sum + cat.subcategories.length, 0);
        console.log(`\n📊 Total: ${result.length} categories, ${totalSubs} subcategories`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB disconnected');
    }
}

seed();
