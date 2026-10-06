const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('DELETE FROM places WHERE id = ? OR id = ?').run('b3', 'b4');
console.log('Removed b3 and b4');
