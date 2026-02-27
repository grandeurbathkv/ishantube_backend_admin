/**
 * ════════════════════════════════════════════════════════════
 *  CREATE TEST USERS + CHAT VERIFICATION SCRIPT
 *  Creates 2 fresh admin users in MongoDB, then verifies
 *  that they can chat with each other via the REST API.
 * ════════════════════════════════════════════════════════════
 *
 *  Run:  node src/test/create_test_users.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import https from 'https';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env') });

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_API = 'https://api.backendgrandeurbath.in/api';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const PASS_ICON = '\x1b[32m[✔]\x1b[0m';
const FAIL_ICON = '\x1b[31m[✘]\x1b[0m';
const INFO_ICON = '\x1b[36m[ℹ]\x1b[0m';

const api = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000,
});

let passed = 0;
let failed = 0;

function sep(label = '') {
    const line = '─'.repeat(60);
    console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}
function ok(msg) { console.log(`${PASS_ICON} ${msg}`); passed++; }
function fail(msg) { console.log(`${FAIL_ICON} \x1b[31m${msg}\x1b[0m`); failed++; }
function info(msg) { console.log(`${INFO_ICON} ${msg}`); }

function makeToken(userId) {
    return jwt.sign({ id: userId.toString() }, JWT_SECRET, { expiresIn: '2h' });
}

// ── User schema (minimal, mirrors user.model.js) ──────────────────────────────
const userSchema = new mongoose.Schema({
    User_id: { type: String, sparse: true },
    Password: { type: String, required: true },
    'Mobile Number': { type: String, required: true },
    'Email id': { type: String, required: true, unique: true, lowercase: true },
    Image: { type: String },
    'User Name': { type: String, required: true },
    Role: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ════════════════════════════════════════════════════════════
//  STEP 1 – Connect to MongoDB
// ════════════════════════════════════════════════════════════
sep('STEP 1: MongoDB Connection');

if (!MONGO_URI) {
    console.log(`${FAIL_ICON} MONGODB_URI not found in .env`);
    process.exit(1);
}
if (!JWT_SECRET) {
    console.log(`${FAIL_ICON} JWT_SECRET not found in .env`);
    process.exit(1);
}

info(`Connecting to MongoDB...`);
await mongoose.connect(MONGO_URI);
ok('MongoDB connected');

// ════════════════════════════════════════════════════════════
//  STEP 2 – Create (or reuse) 2 test users
// ════════════════════════════════════════════════════════════
sep('STEP 2: Create Test Users');

const TEST_USERS = [
    {
        'User Name': 'ChatTestUser One',
        'Email id': 'chattest1@ishantube.local',
        'Mobile Number': '9100000001',
        Password: 'ChatTest@123',
        Role: 'Admin',
    },
    {
        'User Name': 'ChatTestUser Two',
        'Email id': 'chattest2@ishantube.local',
        'Mobile Number': '9100000002',
        Password: 'ChatTest@456',
        Role: 'Admin',
    },
];

const createdUsers = [];

for (const userData of TEST_USERS) {
    const email = userData['Email id'];

    // Check if already exists
    let existing = await User.findOne({ 'Email id': email });
    if (existing) {
        info(`User "${userData['User Name']}" already exists (${existing._id}) — reusing`);
        createdUsers.push(existing);
        ok(`Reused: ${userData['User Name']} | _id: ${existing._id}`);
        continue;
    }

    // Hash password (pre-save hook won't run for direct insert → hash manually)
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(userData.Password, salt);

    const newUser = await User.create({
        ...userData,
        Password: hashed,
        isSuperAdmin: false,
        status: true,
    });

    createdUsers.push(newUser);
    ok(`Created: ${userData['User Name']} | _id: ${newUser._id} | email: ${email}`);
}

const [user1, user2] = createdUsers;
info(`User 1: ${user1['User Name']}  (${user1._id})`);
info(`User 2: ${user2['User Name']}  (${user2._id})`);

// ════════════════════════════════════════════════════════════
//  STEP 3 – Generate JWTs for both users
// ════════════════════════════════════════════════════════════
sep('STEP 3: Generate JWT Tokens');

const token1 = makeToken(user1._id);
const token2 = makeToken(user2._id);
ok(`Token for User 1 generated`);
ok(`Token for User 2 generated`);

const h1 = { Authorization: `Bearer ${token1}` };
const h2 = { Authorization: `Bearer ${token2}` };

// ════════════════════════════════════════════════════════════
//  STEP 4 – Verify User 1 can fetch chat user list
// ════════════════════════════════════════════════════════════
sep('STEP 4: REST API — GET /chat/users');

try {
    const res = await api.get(`${BASE_API}/chat/users`, { headers: h1 });
    if (res.status === 200 && res.data?.success) {
        const users = res.data.data;
        ok(`GET /chat/users  → ${users.length} users returned`);

        // Check User 2 appears in the list
        const found = users.find(u => u._id?.toString() === user2._id.toString());
        if (found) {
            ok(`User 2 visible in chat list for User 1`);
        } else {
            fail(`User 2 NOT found in chat list for User 1`);
        }
    } else {
        fail(`GET /chat/users  → unexpected response: ${res.status}`);
    }
} catch (e) {
    fail(`GET /chat/users  → ${e.message}`);
}

// ════════════════════════════════════════════════════════════
//  STEP 5 – User 1 sends a message to User 2
// ════════════════════════════════════════════════════════════
sep('STEP 5: REST API — POST /chat/send (User1 → User2)');

let sentMsgId = null;
try {
    const payload = {
        receiver_id: user2._id.toString(),
        message: `Hello from ${user1['User Name']}! 👋 (auto test ${Date.now()})`,
    };
    const res = await api.post(`${BASE_API}/chat/send`, payload, { headers: h1 });
    if (res.status === 201 && res.data?.success) {
        sentMsgId = res.data.data?._id;
        ok(`Message sent  → id: ${sentMsgId}`);
        info(`  Content: "${res.data.data?.message}"`);
    } else {
        fail(`POST /chat/send  → status ${res.status}: ${JSON.stringify(res.data)}`);
    }
} catch (e) {
    fail(`POST /chat/send  → ${e.message}`);
}

// ════════════════════════════════════════════════════════════
//  STEP 6 – User 2 fetches messages from User 1
// ════════════════════════════════════════════════════════════
sep('STEP 6: REST API — GET /chat/messages/:userId (User2 receives)');

try {
    const res = await api.get(
        `${BASE_API}/chat/messages/${user1._id}`,
        { headers: h2 }
    );
    if (res.status === 200 && res.data?.success) {
        const msgs = res.data.data;
        ok(`GET /chat/messages  → ${msgs.length} message(s) fetched`);

        if (sentMsgId) {
            const found = msgs.find(m => m._id?.toString() === sentMsgId?.toString());
            if (found) {
                ok(`Sent message confirmed in User 2's inbox  ✓`);
                info(`  "${found.message}"`);
            } else {
                fail(`Sent message NOT found in User 2's inbox`);
            }
        }
    } else {
        fail(`GET /chat/messages  → status ${res.status}: ${JSON.stringify(res.data)}`);
    }
} catch (e) {
    fail(`GET /chat/messages  → ${e.message}`);
}

// ════════════════════════════════════════════════════════════
//  STEP 7 – User 2 replies to User 1
// ════════════════════════════════════════════════════════════
sep('STEP 7: REST API — POST /chat/send (User2 → User1)');

try {
    const payload = {
        receiver_id: user1._id.toString(),
        message: `Hi ${user1['User Name']}! Reply from ${user2['User Name']} 😊 (auto test ${Date.now()})`,
    };
    const res = await api.post(`${BASE_API}/chat/send`, payload, { headers: h2 });
    if (res.status === 201 && res.data?.success) {
        ok(`Reply sent  → id: ${res.data.data?._id}`);
        info(`  Content: "${res.data.data?.message}"`);
    } else {
        fail(`POST /chat/send (reply)  → status ${res.status}: ${JSON.stringify(res.data)}`);
    }
} catch (e) {
    fail(`POST /chat/send (reply)  → ${e.message}`);
}

// ════════════════════════════════════════════════════════════
//  STEP 8 – Unread count
// ════════════════════════════════════════════════════════════
sep('STEP 8: REST API — GET /chat/unread-count');

try {
    const res = await api.get(`${BASE_API}/chat/unread-count`, { headers: h1 });
    if (res.status === 200 && res.data?.success) {
        ok(`GET /chat/unread-count  → ${res.data.data?.unreadCount ?? 0} unread`);
    } else {
        fail(`GET /chat/unread-count  → status ${res.status}`);
    }
} catch (e) {
    fail(`GET /chat/unread-count  → ${e.message}`);
}

// ════════════════════════════════════════════════════════════
//  SUMMARY
// ════════════════════════════════════════════════════════════
sep('SUMMARY');
console.log(`\n  Total passed: \x1b[32m${passed}\x1b[0m  |  Total failed: \x1b[31m${failed}\x1b[0m\n`);

if (failed === 0) {
    console.log('\x1b[32m✅ ALL CHECKS PASSED!\x1b[0m');
    console.log('\nTest user credentials for the Flutter app:');
    console.log(`  User 1: ${TEST_USERS[0]['Email id']}  /  ${TEST_USERS[0].Password}`);
    console.log(`  User 2: ${TEST_USERS[1]['Email id']}  /  ${TEST_USERS[1].Password}`);
    console.log(`\n  User 1 MongoDB _id: ${user1._id}`);
    console.log(`  User 2 MongoDB _id: ${user2._id}`);
} else {
    console.log(`\x1b[31m❌ ${failed} CHECK(S) FAILED — see above for details.\x1b[0m`);
}

await mongoose.disconnect();
process.exit(failed === 0 ? 0 : 1);
