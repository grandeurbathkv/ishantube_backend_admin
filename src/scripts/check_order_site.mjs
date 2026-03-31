import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected\n');

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const Site = mongoose.model('Site', new mongoose.Schema({}, { strict: false }));

const order = await Order.findById('69cb823eb63259f0a70e1c76').lean();
console.log('Order party_id:', order.party_id);
console.log('Order party_name:', order.party_name);
console.log('Order keys:', Object.keys(order).join(', '));

const sites = await Site.find({ party_id: order.party_id }).lean();
console.log('\nSites for this party:', sites.length);
sites.forEach(s => {
    console.log('---');
    console.log(' _id              :', s._id);
    console.log(' Site_Billing_Name:', s.Site_Billing_Name);
    console.log(' Site_Address     :', s.Site_Address);
    console.log(' Contact_Person   :', s.Contact_Person);
    console.log(' Mobile_Number    :', s.Mobile_Number);
    console.log(' All keys         :', Object.keys(s).filter(k => !k.startsWith('_') && k !== '__v').join(', '));
});

await mongoose.disconnect();
console.log('\nDone.');
