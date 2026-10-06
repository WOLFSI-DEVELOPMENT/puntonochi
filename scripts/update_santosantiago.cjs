const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE colonias SET image = ? WHERE id = ?').run(
  'https://i0.wp.com/viajoconestilo.com/wp-content/uploads/2017/03/nochistlan.jpg?resize=1170%2C700&ssl=1',
  '2'
);
console.log('Santo Santiago colonia image updated');
