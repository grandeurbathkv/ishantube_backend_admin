/**
 * ════════════════════════════════════════════════════════════
 *  CHAT DIAGNOSTIC SCRIPT
 *  Tests: REST API + Socket.IO (polling) + full 2-user chat
 * ════════════════════════════════════════════════════════════
 *
 *  Run:  node src/test/chat_diagnostic.js
 */

import mongoose from 'mongoose';
import axios from 'axios';
import https from 'https';
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env') });

const BASE_API = 'https://api.backendgrandeurbath.in/api';
const SOCKET_URL = 'https://api.backendgrandeurbath.in';
const PASS_ICON = '\x1b[32m[✔]\x1b[0m';
const FAIL_ICON = '\x1b[31m[✘]\x1b[0m';
const INFO_ICON = '\x1b[36m[ℹ]\x1b[0m';
const WARN_ICON = '\x1b[33m[⚠]\x1b[0m';

// Axios instance — ignore SSL errors (same as Flutter app)
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
function warn(msg) { console.log(`${WARN_ICON} \x1b[33m${msg}\x1b[0m`); }

// ─── Auth header helper ───────────────────────────────────────────────────────
function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

// ─── Generate JWT directly (no password needed) ───────────────────────────────
function makeToken(userId) {
    return jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

// ════════════════════════════════════════════════════════════
//  STEP 0: Check ENV
// ════════════════════════════════════════════════════════════
function checkEnv() {
    sep('STEP 0 — Environment Check');
    if (process.env.MONGO_URI) ok(`MONGO_URI is set`);
    else { fail('MONGO_URI missing'); process.exit(1); }

    if (process.env.JWT_SECRET) ok(`JWT_SECRET is set`);
    else { fail('JWT_SECRET missing'); process.exit(1); }
}

// ════════════════════════════════════════════════════════════
//  STEP 1: Pick 2 real users from DB
// ════════════════════════════════════════════════════════════
async function getUsers() {
    sep('STEP 1 — Fetch 2 Users from MongoDB');
    info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    ok('MongoDB connected');

    const users = await mongoose.connection.collection('users')
        .find({ status: true })
        .project({ _id: 1, 'User Name': 1, 'Email id': 1, Role: 1 })
        .limit(10)
        .toArray();

    await mongoose.disconnect();
    ok(`MongoDB disconnected. Total active users in DB: ${users.length}`);

    if (users.length < 2) {
        fail(`Need at least 2 users. Found: ${users.length}`);
        process.exit(1);
    }

    const u1 = users[0];
    const u2 = users[1];
    ok(`User1 → ${u1['User Name']} | ${u1['Email id']} | _id: ${u1._id}`);
    ok(`User2 → ${u2['User Name']} | ${u2['Email id']} | _id: ${u2._id}`);
    return [u1, u2];
}

// ════════════════════════════════════════════════════════════
//  STEP 2: Check server reachability
// ════════════════════════════════════════════════════════════
async function checkServerReachability() {
    sep('STEP 2 — Server Reachability');

    // Test plain HTTP request
    try {
        const res = await api.get(`${BASE_API}/user/dropdown`);
        ok(`Server responded: HTTP ${res.status}`);
    } catch (e) {
        warn(`/user/dropdown not reachable: ${e.message} (non-fatal)`);
    }

    // Test socket.io polling endpoint directly
    try {
        const url = `${SOCKET_URL}/socket.io/?EIO=4&transport=polling`;
        info(`Testing Socket.IO polling endpoint: ${url}`);
        const res = await api.get(url);
        ok(`Socket.IO polling endpoint → HTTP ${res.status}`);
        info(`Response preview: ${JSON.stringify(res.data).substring(0, 100)}`);
    } catch (e) {
        fail(`Socket.IO polling endpoint failed: ${e.message}`);
        warn('This means Socket.IO real-time will NOT work from app/Flutter');
    }

    // Test WebSocket upgrade (expected to fail — for diagnosis)
    try {
        const url = `${SOCKET_URL}/socket.io/?EIO=4&transport=websocket`;
        info(`Testing Socket.IO WebSocket endpoint: ${url}`);
        const res = await api.get(url, {
            headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
        });
        if (res.status === 101) ok('WebSocket upgrade supported!');
        else warn(`WebSocket endpoint returned HTTP ${res.status} (upgrade not supported — use polling)`);
    } catch (e) {
        warn(`WebSocket upgrade returns error: ${e.message}`);
        info('→ This is EXPECTED if Nginx does not proxy WebSocket. App uses polling.');
    }
}

// ════════════════════════════════════════════════════════════
//  STEP 3: Test REST APIs
// ════════════════════════════════════════════════════════════
async function testRestApis(token1, token2, user1Id, user2Id, user1Name, user2Name) {
    sep('STEP 3 — REST API Tests');

    // 3a: GET /chat/users (as User1)
    info('User1: GET /chat/users');
    try {
        const res = await api.get(`${BASE_API}/chat/users`, { headers: authHeader(token1) });
        if (res.data?.success) {
            ok(`GET /chat/users → ${res.data.data.length} users returned`);
            res.data.data.slice(0, 3).forEach(u => info(`  · ${u.name} | online: ${u.is_online} | unread: ${u.unread_count}`));
        } else {
            fail(`GET /chat/users returned success=false: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        fail(`GET /chat/users error: ${e.message}`);
    }

    // 3b: GET /chat/users/:id
    info(`User1: GET /chat/users/${user2Id}`);
    try {
        const res = await api.get(`${BASE_API}/chat/users/${user2Id}`, { headers: authHeader(token1) });
        if (res.data?.success) ok(`GET /chat/users/:id → name: ${res.data.data.name}`);
        else fail(`GET /chat/users/:id failed: ${JSON.stringify(res.data)}`);
    } catch (e) {
        fail(`GET /chat/users/:id error: ${e.message}`);
    }

    // 3c: POST /chat/send — User1 → User2
    info(`User1: POST /chat/send → "${user1Name}: Hi ${user2Name}!"`);
    let msg1Id = null;
    try {
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('receiver_id', user2Id);
        form.append('message', `${user1Name} says: Hi ${user2Name}! [${new Date().toISOString()}]`);
        const res = await api.post(`${BASE_API}/chat/send`, form, {
            headers: { ...authHeader(token1), ...form.getHeaders() },
        });
        if (res.data?.success) {
            msg1Id = res.data.data._id;
            ok(`POST /chat/send → message created. ID: ${msg1Id}`);
            info(`  sender_id._id: ${res.data.data.sender_id?._id || res.data.data.sender_id}`);
            info(`  receiver_id._id: ${res.data.data.receiver_id?._id || res.data.data.receiver_id}`);
            info(`  message: "${res.data.data.message}"`);
            info(`  is_read: ${res.data.data.is_read}`);
        } else {
            fail(`POST /chat/send failed: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        fail(`POST /chat/send error: ${e.message}`);
    }

    // 3d: POST /chat/send — User2 → User1 (reply)
    info(`User2: POST /chat/send → "${user2Name}: Hi ${user1Name}! (reply)"`);
    let msg2Id = null;
    try {
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('receiver_id', user1Id);
        form.append('message', `${user2Name} replies: Hello ${user1Name}! [${new Date().toISOString()}]`);
        const res = await api.post(`${BASE_API}/chat/send`, form, {
            headers: { ...authHeader(token2), ...form.getHeaders() },
        });
        if (res.data?.success) {
            msg2Id = res.data.data._id;
            ok(`POST /chat/send (reply) → ID: ${msg2Id}`);
        } else {
            fail(`POST /chat/send (reply) failed: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        fail(`POST /chat/send (reply) error: ${e.message}`);
    }

    // 3e: GET /chat/messages/:userId — User1 sees conversation
    info(`User1: GET /chat/messages/${user2Id}`);
    try {
        const res = await api.get(`${BASE_API}/chat/messages/${user2Id}`, { headers: authHeader(token1) });
        if (res.data?.success) {
            ok(`GET /chat/messages → ${res.data.data.length} messages in conversation`);
            const last3 = res.data.data.slice(-3);
            last3.forEach((m, i) => {
                const sId = m.sender_id?._id || m.sender_id;
                const from = sId === user1Id ? user1Name : user2Name;
                info(`  [${i + 1}] ${from}: "${m.message}" | read: ${m.is_read}`);
            });
        } else {
            fail(`GET /chat/messages failed: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        fail(`GET /chat/messages error: ${e.message}`);
    }

    // 3f: GET /chat/unread-count
    for (const [label, token] of [[`User1`, token1], [`User2`, token2]]) {
        info(`${label}: GET /chat/unread-count`);
        try {
            const res = await api.get(`${BASE_API}/chat/unread-count`, { headers: authHeader(token) });
            if (res.data?.success) ok(`${label} unread count: ${res.data.data.unread_count}`);
            else fail(`${label} unread-count failed: ${JSON.stringify(res.data)}`);
        } catch (e) {
            fail(`${label} unread-count error: ${e.message}`);
        }
    }

    return { msg1Id, msg2Id };
}

// ════════════════════════════════════════════════════════════
//  STEP 4: Real-time Socket.IO test using POLLING
// ════════════════════════════════════════════════════════════
async function testSocketIO(token1, token2, user2Id, user1Name, user2Name) {
    sep('STEP 4 — Real-time Socket.IO Test (polling transport)');
    info('Using transport: ["polling"] — same as Flutter app fix');

    return new Promise((resolve) => {
        const results = { connected1: false, connected2: false, typingSeen: false, messageSeen: false };
        const timeout = setTimeout(() => {
            warn('Socket test timed out (10s). Partial results:');
            Object.entries(results).forEach(([k, v]) => console.log(`  ${v ? '✅' : '❌'} ${k}`));
            socket1.disconnect();
            socket2.disconnect();
            resolve(results);
        }, 10000);

        const socketOpts = (token) => ({
            auth: { token },
            transports: ['polling'],          // ← KEY FIX: polling only, not websocket
            rejectUnauthorized: false,
            timeout: 8000,
            reconnection: false,
        });

        const socket1 = io(SOCKET_URL, socketOpts(token1));
        const socket2 = io(SOCKET_URL, socketOpts(token2));

        socket1.on('connect', () => {
            ok(`Socket1 connected (${user1Name}) → id: ${socket1.id}`);
            results.connected1 = true;
        });
        socket1.on('connect_error', (e) => fail(`Socket1 connect error: ${e.message}`));

        socket2.on('connect', () => {
            ok(`Socket2 connected (${user2Name}) → id: ${socket2.id}`);
            results.connected2 = true;
        });
        socket2.on('connect_error', (e) => fail(`Socket2 connect error: ${e.message}`));

        // Socket2 listens for typing
        socket2.on('user_typing', (data) => {
            ok(`Socket2 received typing from ${data.userId}: isTyping=${data.isTyping}`);
            results.typingSeen = true;
        });

        // Socket2 listens for new_message
        socket2.on('new_message', (data) => {
            const msg = data?.data;
            ok(`Socket2 received real-time message: "${msg?.message}"`);
            results.messageSeen = true;

            clearTimeout(timeout);
            socket1.disconnect();
            socket2.disconnect();

            sep('STEP 4 Results');
            ok(`Connected User1: ${results.connected1}`);
            ok(`Connected User2: ${results.connected2}`);
            ok(`Typing indicator received: ${results.typingSeen}`);
            ok(`Real-time message received: ${results.messageSeen}`);
            resolve(results);
        });

        // Wait for both sockets, then send typing + message
        let connectCount = 0;
        const onBothConnected = () => {
            connectCount++;
            if (connectCount < 2) return;

            // Send typing indicator
            setTimeout(() => {
                info('Socket1: emitting typing...');
                socket1.emit('typing', { receiver_id: user2Id, isTyping: true });
            }, 500);

            // Send real-time message via socket (using send_message event)
            setTimeout(() => {
                info(`Socket1: sending message via socket to ${user2Id}...`);
                socket1.emit('send_message', {
                    receiver_id: user2Id,
                    message: `🔴 Real-time socket message @ ${new Date().toISOString()}`,
                });
            }, 1000);
        };

        socket1.on('connect', onBothConnected);
        socket2.on('connect', onBothConnected);
    });
}

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════
async function main() {
    console.log('\n\x1b[1m\x1b[35m');
    console.log('════════════════════════════════════════════════════════════');
    console.log('         CHAT FULL DIAGNOSTIC — API + SOCKET.IO            ');
    console.log('════════════════════════════════════════════════════════════');
    console.log('\x1b[0m');

    try {
        checkEnv();

        const [u1, u2] = await getUsers();
        const user1Id = u1._id.toString();
        const user2Id = u2._id.toString();
        const user1Name = u1['User Name'];
        const user2Name = u2['User Name'];

        const token1 = makeToken(user1Id);
        const token2 = makeToken(user2Id);

        info(`Token1 (${user1Name}): ${token1.slice(0, 50)}...`);
        info(`Token2 (${user2Name}): ${token2.slice(0, 50)}...`);

        await checkServerReachability();
        await testRestApis(token1, token2, user1Id, user2Id, user1Name, user2Name);
        await testSocketIO(token1, token2, user2Id, user1Name, user2Name);

        sep('FINAL SUMMARY');
        console.log(`\n  Total passed: \x1b[32m${passed}\x1b[0m`);
        console.log(`  Total failed: \x1b[31m${failed}\x1b[0m`);

        if (failed === 0) {
            console.log('\n\x1b[1m\x1b[32m✅ ALL CHECKS PASSED! Chat is fully working.\x1b[0m\n');
        } else {
            console.log(`\n\x1b[1m\x1b[33m⚠  ${failed} check(s) failed. See above for details.\x1b[0m\n`);
        }
    } catch (e) {
        sep('FATAL ERROR');
        fail(e.message);
        console.error(e);
        process.exit(1);
    }
}

main();
