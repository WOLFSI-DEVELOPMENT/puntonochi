import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('database.sqlite');
db.exec(`
UPDATE places SET category = 'Hoteles' WHERE category = 'Hotel';
UPDATE places SET category = 'Restaurantes' WHERE category = 'Restaurante';
UPDATE places SET category = 'Supermercados' WHERE category = 'Tienda';
UPDATE places SET category = 'Farmacias' WHERE category = 'Salud';
`);
console.log('Categories updated!');
