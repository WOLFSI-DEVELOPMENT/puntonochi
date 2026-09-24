const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare("UPDATE categories SET gradient = 'bg-card-red' WHERE id = 'c6'").run();
db.prepare("UPDATE categories SET gradient = 'bg-card-blue' WHERE id = 'c7'").run();
db.prepare("UPDATE categories SET gradient = 'bg-card-teal' WHERE id = 'c8'").run();
db.prepare("UPDATE categories SET gradient = 'bg-card-yellow' WHERE id = 'c9'").run();
db.prepare("UPDATE categories SET gradient = 'bg-card-pink' WHERE id = 'c10'").run();
console.log('Category gradients updated');
