const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ?, logo = ? WHERE id = ?').run(
  JSON.stringify(['https://elceo.com/wp-content/uploads/2024/06/Banorte-Plaza-Patria-6.webp']),
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCqrpUhyFo7yXIDutdT8MUnYuqRin9baUDUAK5NRpdnify6cCmK9U_pfqO&s=10',
  'b2'
);
console.log('Updated Banorte');
