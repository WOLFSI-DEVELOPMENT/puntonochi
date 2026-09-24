const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('INSERT INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)').run('c8', 'Turismo', 0, 'bg-card-purple', '');
db.prepare('INSERT INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)').run('c9', 'Parques', 0, 'bg-card-green', '');
db.prepare('INSERT INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)').run('c10', 'Repostería', 0, 'bg-card-orange', '');
console.log('Categories added');
