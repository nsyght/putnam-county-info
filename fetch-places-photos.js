// Run with: node fetch-places-photos.js
// Fetches ratings, hours, websites AND photo URLs for Putnam County businesses

const https = require('https');

const API_KEY = 'AIzaSyCKs0rN2CjZ3PXgW2Dp0lAjWx8fyBMi8Jw';

const businesses = [
  {slug:'the-dumpster-co-lake-country', query:'The Dumpster Co 200 Imperial Mill Rd Eatonton GA 31024'},
  {slug:'yesterday-cafe',               query:'Yesterday Cafe Eatonton GA'},
  {slug:'lake-country-bbq',             query:'BBQ restaurant Eatonton GA'},
  {slug:'oconee-coffee-co',             query:'coffee cafe Eatonton GA'},
  {slug:'el-sombrero-eatonton',         query:'El Sombrero Mexican Restaurant Eatonton GA'},
  {slug:'putnam-county-family-health',  query:'family health clinic Eatonton GA'},
  {slug:'eatonton-dental-care',         query:'dentist Eatonton GA'},
  {slug:'lake-country-urgent-care',     query:'urgent care Eatonton GA'},
  {slug:'eatonton-auto-tire',           query:'auto repair tire Eatonton GA'},
  {slug:'putnam-county-collision',      query:'auto body collision Eatonton GA'},
  {slug:'main-street-salon-eatonton',   query:'hair salon Eatonton GA'},
  {slug:'oconee-nail-spa',              query:'nail salon Eatonton GA'},
  {slug:'lake-country-fitness',         query:'gym fitness Eatonton GA'},
  {slug:'lake-oconee',                  query:'Lake Oconee Georgia'},
  {slug:'lake-sinclair',                query:'Lake Sinclair Eatonton GA'},
  {slug:'rock-eagle-4h',                query:'Rock Eagle Effigy Mound Eatonton GA'},
  {slug:'putnam-county-library',        query:'Putnam County Library Eatonton GA'},
  {slug:'putnam-county-schools',        query:'Putnam County School System Eatonton GA'},
  {slug:'lake-country-lawn-landscape',  query:'lawn care landscaping Eatonton GA'},
  {slug:'eatonton-animal-hospital',     query:'animal hospital veterinarian Eatonton GA'},
  {slug:'putnam-county-farm-supply',    query:'farm supply feed store Eatonton GA'},
];

function post(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'places.googleapis.com',
      path: '/v1/places:searchText',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.internationalPhoneNumber,places.nationalPhoneNumber,places.formattedAddress,places.photos'
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fmtTime(h, m) {
  const s = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return `${h12}${m ? ':' + String(m).padStart(2,'0') : ''}${s}`;
}

function parseHours(periods) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const map = {};
  for (const p of (periods || [])) {
    const d = p.open?.day ?? 0;
    const oh = p.open?.hour ?? 0, om = p.open?.minute ?? 0;
    const ch = p.close?.hour ?? 0, cm = p.close?.minute ?? 0;
    map[days[d]] = `${fmtTime(oh,om)}-${fmtTime(ch,cm)}`;
  }
  return map;
}

async function getPhotoUrl(photoName) {
  return new Promise((resolve) => {
    const path = `/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=600&key=${API_KEY}`;
    const opts = { hostname: 'places.googleapis.com', path, method: 'GET' };
    const req = https.request(opts, res => { resolve(res.headers['location'] || ''); });
    req.on('error', () => resolve(''));
    req.end();
  });
}

async function run() {
  const results = {};
  for (const biz of businesses) {
    try {
      const data = await post({ textQuery: biz.query, maxResultCount: 1 });
      const place = data.places?.[0];
      if (!place) {
        console.error(`NOT FOUND: ${biz.slug}`);
        results[biz.slug] = { found: false };
        await new Promise(r => setTimeout(r, 200));
        continue;
      }
      let photoUrl = '';
      if (place.photos && place.photos.length > 0) {
        photoUrl = await getPhotoUrl(place.photos[0].name);
      }
      const hours = parseHours(place.regularOpeningHours?.periods);
      results[biz.slug] = {
        found: true,
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
        rating: place.rating || '',
        reviews: place.userRatingCount || '',
        website: place.websiteUri || '',
        hours,
        photoUrl,
      };
      console.log(`✓ ${biz.slug} — ${place.rating}★ | photo: ${photoUrl ? 'YES' : 'none'}`);
    } catch(e) {
      console.error(`ERROR ${biz.slug}: ${e.message}`);
      results[biz.slug] = { found: false };
    }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('\n\n===RESULTS===');
  console.log(JSON.stringify(results, null, 2));
  console.log('===END RESULTS===');
}

run();
