const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE colonias SET image = ? WHERE id = ?').run(
  'https://static.ecodiario.mx/storage/61344/conversions/01KV46GC9FB1NQAHS8HMBSYXA4-large.jpg',
  '3'
);
console.log('La Gloria colonia image updated');
