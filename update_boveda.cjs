const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');

const h2 = db.prepare('SELECT images FROM places WHERE id = ?').get('h2');
let images = JSON.parse(h2.images);
images[0] = 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/34/65/76/caption.jpg?w=900&h=500&s=1';

db.prepare('UPDATE places SET images = ? WHERE id = ?').run(JSON.stringify(images), 'h2');
console.log('La Bóveda updated');
