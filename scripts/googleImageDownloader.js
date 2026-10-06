import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const db = new DatabaseSync('database.sqlite');
const imagesDir = path.join(process.cwd(), 'public', 'images');

// Ensure public/images directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

async function findPlacePhotoReference(name, lat, lng) {
  try {
    // Find place by name, biased to its coordinates
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,photos&key=${GOOGLE_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.photos && candidate.photos.length > 0) {
        return {
          photoReference: candidate.photos[0].photo_reference,
          placeId: candidate.place_id
        };
      }
    }
  } catch (err) {
    console.error('Error finding place:', err.message);
  }
  return null;
}

async function downloadPhoto(photoReference, placeId) {
  try {
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
    
    // fetch will automatically follow the 302 redirect from Google
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fileName = `${placeId}.jpg`;
    const filePath = path.join(imagesDir, fileName);
    
    fs.writeFileSync(filePath, buffer);
    
    return `/images/${fileName}`; // The public URL path
  } catch (err) {
    console.error('Error downloading photo:', err.message);
    return null;
  }
}

async function runGoogleDownloader() {
  console.log('Starting Google Places Image Downloader...');
  
  if (!GOOGLE_API_KEY) {
    console.log('❌ Error: No GOOGLE_API_KEY found in .env');
    return;
  }

  const places = db.prepare('SELECT id, name, lat, lng, images FROM places').all();
  let downloadedCount = 0;

  for (const place of places) {
    console.log(`Searching Google for: ${place.name}...`);
    
    // Try to find the photo reference
    const photoData = await findPlacePhotoReference(place.name, place.lat, place.lng);
    
    if (photoData) {
      console.log(`✅ Found photo reference! Downloading image...`);
      
      const localImagePath = await downloadPhoto(photoData.photoReference, photoData.placeId);
      
      if (localImagePath) {
        // Parse existing images
        let currentImages = [];
        try { currentImages = JSON.parse(place.images || '[]'); } catch(e){}
        
        // Put the local image at the front
        const newImages = [localImagePath, ...currentImages];
        
        // Update database
        const stmt = db.prepare('UPDATE places SET images = ? WHERE id = ?');
        stmt.run(JSON.stringify(newImages), place.id);
        
        downloadedCount++;
        console.log(`💾 Saved to ${localImagePath}`);
      }
    } else {
      console.log(`❌ No photos found on Google. Keeping stock fallback.`);
    }

    // Wait 250ms to avoid Google Rate Limits
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n🎉 Google Downloader Complete! Successfully downloaded permanent images for ${downloadedCount} businesses.`);
}

runGoogleDownloader();
