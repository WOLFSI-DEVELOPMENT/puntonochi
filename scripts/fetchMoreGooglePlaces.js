import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const db = new DatabaseSync('database.sqlite');
const imagesDir = path.join(process.cwd(), 'public', 'images');
const FALLBACK_IMAGE = 'https://i.ibb.co/BHdjYdLp/Chat-GPT-Image-Sep-18-2026-03-26-24-PM.png';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadPhoto(photoReference, placeId) {
  try {
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${placeId}.jpg`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/images/${fileName}`;
  } catch (err) {
    return null;
  }
}

async function searchPlaces(query) {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results ? data.results.slice(0, 15) : []; // Grab up to 15 per category
}

async function run() {
  const categoriesToFetch = [
    { query: 'hospital or police or fire station in Nochistlán, Zacatecas', category: 'Emergencias' },
    { query: 'school in Nochistlán, Zacatecas', category: 'Escuelas' },
    { query: 'tourist attraction or museum in Nochistlán, Zacatecas', category: 'Turismo' },
    { query: 'park or plaza in Nochistlán, Zacatecas', category: 'Parques' },
    { query: 'bakery or desserts in Nochistlán, Zacatecas', category: 'Repostería' }
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO places (id, name, category, subtitle, location, address, images, rating, reviewCount, lat, lng, isOpen, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalSaved = 0;

  for (const item of categoriesToFetch) {
    console.log(`\n🔍 Fetching places for category: ${item.category}...`);
    const results = await searchPlaces(item.query);
    
    let savedCount = 0;
    for (const place of results) {
      if (savedCount >= 10) break; // Limit to 10 each

      let imageUrl = FALLBACK_IMAGE;
      if (place.photos && place.photos.length > 0) {
        const downloaded = await downloadPhoto(place.photos[0].photo_reference, place.place_id);
        if (downloaded) imageUrl = downloaded;
      }

      const imagesStr = JSON.stringify([imageUrl]);
      
      try {
        insertStmt.run(
          place.place_id,
          place.name,
          item.category, // explicitly force the category!
          place.types?.[0] ? place.types[0].replace(/_/g, ' ') : item.category,
          'Centro',
          place.formatted_address || 'Nochistlán, Zac.',
          imagesStr,
          place.rating || 0,
          place.user_ratings_total || 0,
          place.geometry.location.lat,
          place.geometry.location.lng,
          1,
          Math.floor(Math.random() * 3) + 1
        );
        savedCount++;
        totalSaved++;
        console.log(` ✅ Added: ${place.name}`);
      } catch (e) {
        // usually ignore UNIQUE constraint failures if place already exists
      }
      
      await wait(300);
    }
  }

  console.log(`\n🎉 All done! Appended ${totalSaved} new Google businesses to the missing categories.`);
}

run();
