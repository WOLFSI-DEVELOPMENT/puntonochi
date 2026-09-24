import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const db = new DatabaseSync('database.sqlite');
const imagesDir = path.join(process.cwd(), 'public', 'images');
const FALLBACK_IMAGE = 'https://i.ibb.co/BHdjYdLp/Chat-GPT-Image-Sep-18-2026-03-26-24-PM.png';

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 1. Wipe the old INEGI data
db.exec('DELETE FROM places');
console.log('✅ Wiped all old businesses from the database.');

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
    console.error('Error downloading photo:', err.message);
    return null;
  }
}

function mapCategory(types) {
  if (!types) return 'Otro';
  if (types.includes('restaurant') || types.includes('cafe') || types.includes('food')) return 'Restaurante';
  if (types.includes('store') || types.includes('supermarket') || types.includes('grocery_or_supermarket')) return 'Tienda';
  if (types.includes('pharmacy') || types.includes('hospital') || types.includes('health')) return 'Salud';
  if (types.includes('school')) return 'Escuela';
  if (types.includes('lodging')) return 'Hotel';
  return 'Servicios';
}

async function searchPlaces(query) {
  let allResults = [];
  let nextToken = null;
  
  do {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    if (nextToken) {
      url += `&pagetoken=${nextToken}`;
      // Google requires a short delay before using a next_page_token
      await wait(2000);
    }
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.results) {
      allResults.push(...data.results);
    }
    nextToken = data.next_page_token;
  } while (nextToken && allResults.length < 60); // Max 60 per query (3 pages)
  
  return allResults;
}

async function run() {
  const queries = [
    'business in Nochistlán, Zacatecas',
    'restaurant in Nochistlán, Zacatecas',
    'store in Nochistlán, Zacatecas',
    'health in Nochistlán, Zacatecas',
    'hotel in Nochistlán, Zacatecas'
  ];

  const uniquePlaces = new Map();

  console.log('🔍 Fetching new businesses from Google Maps...');
  for (const q of queries) {
    console.log(`Searching for "${q}"...`);
    const results = await searchPlaces(q);
    for (const r of results) {
      if (!uniquePlaces.has(r.place_id)) {
        uniquePlaces.set(r.place_id, r);
      }
    }
    if (uniquePlaces.size >= 200) break;
  }

  const placesToProcess = Array.from(uniquePlaces.values()).slice(0, 200);
  console.log(`\nFound ${placesToProcess.length} unique businesses! Downloading photos and saving to DB...`);

  let savedCount = 0;
  const insertStmt = db.prepare(`
    INSERT INTO places (id, name, category, subtitle, location, address, images, rating, reviewCount, lat, lng, isOpen, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const place of placesToProcess) {
    let imageUrl = FALLBACK_IMAGE; // Use user's requested fallback immediately if no photo
    
    if (place.photos && place.photos.length > 0) {
      const downloaded = await downloadPhoto(place.photos[0].photo_reference, place.place_id);
      if (downloaded) {
        imageUrl = downloaded;
      }
    }

    const category = mapCategory(place.types);
    const imagesStr = JSON.stringify([imageUrl]); // Wrap in array
    
    insertStmt.run(
      place.place_id,
      place.name,
      category,
      place.types?.[0] ? place.types[0].replace(/_/g, ' ') : category,
      'Centro',
      place.formatted_address || 'Nochistlán, Zac.',
      imagesStr,
      place.rating || 0,
      place.user_ratings_total || 0,
      place.geometry.location.lat,
      place.geometry.location.lng,
      1, // isOpen
      Math.floor(Math.random() * 3) + 1 // random cost 1-3
    );
    
    savedCount++;
    if (savedCount % 10 === 0) console.log(`Processed ${savedCount}/${placesToProcess.length}...`);
    await wait(200); // rate limiting
  }

  console.log(`\n🎉 All done! Saved ${savedCount} Google businesses to the local database.`);
}

run();
