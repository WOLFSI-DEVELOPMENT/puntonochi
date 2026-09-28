import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const updates = [
  ['ChIJHWEc6_mmKYQRII6gD0LaD_o', 'Viajes y Vehículos'], // Bus station
  ['ChIJRZLdypNVKIQRznhGlNDA6t4', 'Ayuntamiento'], // Local tourism office
  ['ChIJY3PZ49hJKIQRS7sz7ilWI7I', 'Viajes y Vehículos'], // Travel agency
  ['ChIJZ8H7HgBJKIQRVGYBXBGYwRY', 'Viajes y Vehículos'], // Bus service
  ['ChIJ8ZppIz5JKIQR9npnIqqVKdI', 'Viajes y Vehículos'], // Transit service
  ['ChIJD4d13FemKYQR5P9843TFg9Q', 'Parques'], // Public plaza
  ['ChIJyQpcysVfKIQRde617suQzB0', 'Supermercados'], // Grocery store
  ['ChIJlfhdpLr8KIQRyl1reDnIhV0', 'Mecánica'], // Auto workshop
  ['ChIJtXaB1khVKIQRRrToM5iLx9M', 'Comida'], // Restaurant
  ['ChIJs6wVKrD8KIQRQ5zEQYqVlts', 'Parques'], // Public plaza
];
for (const [id, category] of updates) await sql`UPDATE places SET category = ${category} WHERE id = ${id} AND sort_order > 403`;
const removals = [
  'ChIJzWZBsH5VKIQRa4FnBKFaM7Y', // Unrelated India Post result
  'ChIJ9Xph7fT_KIQRtkJcG1EY0RI', // Gas depot returned for emergency services
  'ChIJa3qGsn5VKIQRBF5Ltbkzk_0', // Plastic distributor returned as supermarket
  'ChIJz-wQifinKYQRWQxzch_8m6k', // Invalid nameless business result
];
for (const id of removals) await sql`DELETE FROM places WHERE id = ${id} AND sort_order > 403`;
console.log(JSON.stringify({reclassified: updates.length, removed: removals.length}));
