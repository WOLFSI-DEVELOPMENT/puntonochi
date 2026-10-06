import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config'; // Requires dotenv to be installed if we want to use .env, otherwise we can just use process.env

const YELP_API_KEY = process.env.YELP_API_KEY || 'YOUR_YELP_KEY_HERE';
const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY || 'YOUR_FOURSQUARE_KEY_HERE';

const db = new DatabaseSync('database.sqlite');

async function searchYelp(name, lat, lng) {
  if (YELP_API_KEY === 'YOUR_YELP_KEY_HERE') return null;
  try {
    // Yelp Fusion Business Search
    const res = await fetch(`https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&latitude=${lat}&longitude=${lng}&limit=1`, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` }
    });
    const data = await res.json();
    if (data.businesses && data.businesses.length > 0) {
      return data.businesses[0].image_url || null;
    }
  } catch (err) {
    console.error('Yelp Error:', err.message);
  }
  return null;
}

async function searchFoursquare(name, lat, lng) {
  if (FOURSQUARE_API_KEY === 'YOUR_FOURSQUARE_KEY_HERE') return null;
  try {
    // Foursquare Places Search
    const res = await fetch(`https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(name)}&ll=${lat},${lng}&limit=1`, {
      headers: { Authorization: FOURSQUARE_API_KEY }
    });
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const fsq_id = data.results[0].fsq_id;
      // Get photos for this place
      const photoRes = await fetch(`https://api.foursquare.com/v3/places/${fsq_id}/photos?limit=1`, {
        headers: { Authorization: FOURSQUARE_API_KEY }
      });
      const photoData = await photoRes.json();
      if (photoData && photoData.length > 0) {
        return `${photoData[0].prefix}original${photoData[0].suffix}`;
      }
    }
  } catch (err) {
    console.error('Foursquare Error:', err.message);
  }
  return null;
}

async function runWaterfall() {
  console.log('Starting API Waterfall for Images...');
  
  if (YELP_API_KEY === 'YOUR_YELP_KEY_HERE' && FOURSQUARE_API_KEY === 'YOUR_FOURSQUARE_KEY_HERE') {
    console.log('⚠️ WARNING: No API keys found! The script will exit. Please add your keys.');
    return;
  }

  const places = db.prepare('SELECT id, name, lat, lng, images FROM places').all();
  let updatedCount = 0;

  for (const place of places) {
    console.log(`Searching images for: ${place.name}...`);
    
    // We parse the current images array (it currently holds the Unsplash stock image)
    let currentImages = [];
    try { currentImages = JSON.parse(place.images || '[]'); } catch(e){}

    // 1. Try Yelp
    let foundImage = await searchYelp(place.name, place.lat, place.lng);
    
    // 2. Try Foursquare if Yelp failed
    if (!foundImage) {
      foundImage = await searchFoursquare(place.name, place.lat, place.lng);
    }

    // 3. Update Database if we found a real image
    if (foundImage) {
      console.log(`✅ Found real photo for ${place.name}!`);
      // Put the real image as the first image, keeping the stock image as a backup
      const newImages = [foundImage, ...currentImages];
      
      const stmt = db.prepare('UPDATE places SET images = ? WHERE id = ?');
      stmt.run(JSON.stringify(newImages), place.id);
      updatedCount++;
    } else {
      console.log(`❌ No real photo found. Keeping stock fallback.`);
    }

    // Wait 300ms to avoid hitting rate limits too quickly
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n🎉 Waterfall Complete! Successfully found real images for ${updatedCount} businesses.`);
}

runWaterfall();
