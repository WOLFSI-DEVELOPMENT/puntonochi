const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ?, logo = ? WHERE id = ?').run(
  JSON.stringify(['https://lh5.googleusercontent.com/p/AF1QipPaSYHsbv_u1jCpIYHJSdLB4RaK1fOu5GZJZb1l=w426-h240-k-no']),
  'https://images.seeklogo.com/logo-png/5/1/farmacias-guadalajara-logo-png_seeklogo-52062.png',
  'f1'
);
console.log('Updated Farmacia Guadalajara');
