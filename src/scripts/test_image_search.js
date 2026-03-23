/**
 * Diagnostic script: tests multiple image search providers
 * Run: node src/scripts/test_image_search.js
 */
import axios from 'axios';

const QUERY = 'Toilet Paper Holder Roller';
const TIMEOUT = 12000;

const sep = (title) => console.log(`\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`);

// ──────────────────────────────────────────────────────────
// 1. DuckDuckGo with cookie-session (fix the 403)
// ──────────────────────────────────────────────────────────
async function testDDG_WithCookies() {
    sep('TEST 1 – DuckDuckGo (with Cookie session)');
    try {
        const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

        // Step A: get initial cookies
        const homeRes = await axios.get('https://duckduckgo.com/', {
            headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
            timeout: TIMEOUT,
        });
        const cookies = (homeRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
        console.log('Cookies from homepage:', cookies || '(none)');

        // Step B: search page to get vqd with cookies
        const searchRes = await axios.get('https://duckduckgo.com/', {
            params: { q: QUERY, iax: 'images', ia: 'images' },
            headers: {
                'User-Agent': UA,
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://duckduckgo.com/',
                'Cookie': cookies,
            },
            timeout: TIMEOUT,
        });

        const vqd = searchRes.data.match(/vqd=['"]([^'"]+)['"]/)?.[1];
        console.log('VQD token:', vqd || '(not found)');
        if (!vqd) { console.log('❌ Cannot proceed without vqd'); return; }

        // Step C: fetch images with cookie
        const imgRes = await axios.get('https://duckduckgo.com/i.js', {
            params: { l: 'us-en', o: 'json', q: QUERY, vqd, f: ',,,', p: '1' },
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': `https://duckduckgo.com/?q=${encodeURIComponent(QUERY)}&iax=images&ia=images`,
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookies,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
            },
            timeout: TIMEOUT,
        });
        const count = imgRes.data.results?.length ?? 0;
        console.log(`✅ SUCCESS – ${count} images found`);
        if (count > 0) console.log('  First image URL:', imgRes.data.results[0].image);
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// 2. OpenVerse (Creative Commons – NO key required)
// ──────────────────────────────────────────────────────────
async function testOpenVerse() {
    sep('TEST 2 – OpenVerse (CC images, NO API key)');
    try {
        const res = await axios.get('https://api.openverse.org/v1/images/', {
            params: { q: QUERY, page_size: 18, license_type: 'commercial' },
            headers: { 'Accept': 'application/json' },
            timeout: TIMEOUT,
        });
        const count = res.data.results?.length ?? 0;
        console.log(`✅ SUCCESS – ${count} images found`);
        if (count > 0) {
            console.log('  First image URL:', res.data.results[0].url);
            console.log('  Thumbnail URL  :', res.data.results[0].thumbnail);
        }
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// 3. Wikimedia Commons (NO key required)
// ──────────────────────────────────────────────────────────
async function testWikimedia() {
    sep('TEST 3 – Wikimedia Commons (NO API key)');
    try {
        const searchRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
            params: {
                action: 'query',
                list: 'search',
                srsearch: QUERY,
                srnamespace: '6',   // File namespace only
                format: 'json',
                srlimit: 18,
                origin: '*',
            },
            timeout: TIMEOUT,
        });
        const titles = (searchRes.data.query?.search || []).map(r => r.title.replace('File:', '').replace(/ /g, '_'));
        console.log(`Found ${titles.length} titles`);
        if (titles.length === 0) { console.log('❌ No results'); return; }

        // Fetch thumbnail URLs for first 3
        const thumbRes = await axios.get('https://commons.wikimedia.org/w/api.php', {
            params: {
                action: 'query',
                titles: titles.slice(0, 3).map(t => 'File:' + t).join('|'),
                prop: 'imageinfo',
                iiprop: 'url|thumburl',
                iiurlwidth: 300,
                format: 'json',
                origin: '*',
            },
            timeout: TIMEOUT,
        });
        const pages = Object.values(thumbRes.data.query?.pages || {});
        const urls = pages.map(p => p.imageinfo?.[0]?.thumburl).filter(Boolean);
        console.log(`✅ SUCCESS – ${titles.length} results, ${urls.length} URLs resolved`);
        urls.forEach((u, i) => console.log(`  [${i + 1}] ${u}`));
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// 4. Pixabay (free tier – 100 req/day with a real free key)
//    Register at https://pixabay.com/api/docs/ to get a key
// ──────────────────────────────────────────────────────────
async function testPixabay() {
    sep('TEST 4 – Pixabay (free key – register at pixabay.com/api/docs)');
    const key = process.env.PIXABAY_API_KEY;
    if (!key || key.length < 5) {
        console.log('⏭  Skipped – PIXABAY_API_KEY not set in .env');
        return;
    }
    try {
        const res = await axios.get('https://pixabay.com/api/', {
            params: { key, q: QUERY, image_type: 'photo', per_page: 18, safesearch: 'true' },
            timeout: TIMEOUT,
        });
        const count = res.data.hits?.length ?? 0;
        console.log(`✅ SUCCESS – ${count} images found`);
        if (count > 0) console.log('  First preview:', res.data.hits[0].previewURL);
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// 5. Unsplash (free demo key – 50 req/hour)
//    Register at https://unsplash.com/developers
// ──────────────────────────────────────────────────────────
async function testUnsplash() {
    sep('TEST 5 – Unsplash (free key – register at unsplash.com/developers)');
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key || key.length < 5) {
        console.log('⏭  Skipped – UNSPLASH_ACCESS_KEY not set in .env');
        return;
    }
    try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query: QUERY, per_page: 18 },
            headers: { 'Authorization': `Client-ID ${key}` },
            timeout: TIMEOUT,
        });
        const count = res.data.results?.length ?? 0;
        console.log(`✅ SUCCESS – ${count} images found`);
        if (count > 0) console.log('  First thumb:', res.data.results[0].urls.thumb);
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// 6. Pexels (free key – register at pexels.com/api)
// ──────────────────────────────────────────────────────────
async function testPexels() {
    sep('TEST 6 – Pexels (free key – register at pexels.com/api)');
    const key = process.env.PEXELS_API_KEY;
    if (!key || key.length < 5) {
        console.log('⏭  Skipped – PEXELS_API_KEY not set in .env');
        return;
    }
    try {
        const res = await axios.get('https://api.pexels.com/v1/search', {
            params: { query: QUERY, per_page: 18 },
            headers: { 'Authorization': key },
            timeout: TIMEOUT,
        });
        const count = res.data.photos?.length ?? 0;
        console.log(`✅ SUCCESS – ${count} images found`);
        if (count > 0) console.log('  First thumb:', res.data.photos[0].src.small);
    } catch (e) {
        console.error('❌ FAILED:', e.message, e.response?.status ?? '');
    }
}

// ──────────────────────────────────────────────────────────
// Run all tests
// ──────────────────────────────────────────────────────────
(async () => {
    console.log(`\n🔍 Testing image search providers for query: "${QUERY}"\n`);
    await testDDG_WithCookies();
    await testOpenVerse();
    await testWikimedia();
    await testPixabay();
    await testUnsplash();
    await testPexels();
    console.log('\n' + '='.repeat(60));
    console.log('  All tests complete');
    console.log('='.repeat(60) + '\n');
})();
