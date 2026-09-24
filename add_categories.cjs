const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('INSERT INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)').run('c6', 'Emergencias', 0, 'bg-card-purple', '');
db.prepare('INSERT INTO categories (id, name, visits, gradient, emoji) VALUES (?, ?, ?, ?, ?)').run('c7', 'Escuelas', 0, 'bg-card-orange', '');
console.log('Categories added');
