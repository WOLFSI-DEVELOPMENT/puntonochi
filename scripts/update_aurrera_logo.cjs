const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET logo = ? WHERE id = ?').run('/icons/aurrera_logo.png', 's1');
console.log('Updated Bodega Aurrera logo');
