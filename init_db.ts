import { DatabaseSync } from 'node:sqlite';
import { categories, allColonias, mockPlaces } from './src/data.js';

const db = new DatabaseSync('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    visits INTEGER,
    gradient TEXT,
    emoji TEXT
  );

  CREATE TABLE IF NOT EXISTS colonias (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    cp TEXT,
    visits INTEGER,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    subtitle TEXT,
    location TEXT,
    address TEXT,
    mapUrl TEXT,
    images TEXT,
    logo TEXT,
    rating REAL,
    reviewCount INTEGER,
    isOpen INTEGER,
    cost INTEGER,
    distance TEXT,
    goodToKnow TEXT,
    hours TEXT
  );
`);

// Insert categories
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)');
for (const c of categories) {
  insertCategory.run(c.id, c.name, c.visits, c.gradient, c.emoji);
}

// Insert colonias
const insertColonia = db.prepare('INSERT OR IGNORE INTO colonias (id, name, type, cp, visits, image) VALUES (?, ?, ?, ?, ?, ?)');
for (const c of allColonias) {
  insertColonia.run(c.id, c.name, c.type, c.cp, c.visits, c.image);
}

// Insert places
const insertPlace = db.prepare(`
  INSERT OR IGNORE INTO places (id, name, category, subtitle, location, address, mapUrl, images, logo, rating, reviewCount, isOpen, cost, distance, goodToKnow, hours)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const p of mockPlaces) {
  insertPlace.run(
    p.id, p.name, p.category, p.subtitle, p.location, p.address, p.mapUrl,
    JSON.stringify(p.images || []), p.logo, p.rating, p.reviewCount, p.isOpen ? 1 : 0,
    p.cost, p.distance, JSON.stringify(p.goodToKnow || []), p.hours
  );
}

console.log("Database initialized");
