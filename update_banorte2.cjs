const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ? WHERE id = ?').run(
  JSON.stringify([
    'https://elceo.com/wp-content/uploads/2024/06/Banorte-Plaza-Patria-6.webp',
    'https://lh3.googleusercontent.com/gps-cs-s/AHRPTWksJVhr06g19bAtns4Uc7mh-LQrWaEPsjwqGPV72VNJbq_ucDVNAxtOhJA8v8y-XfqgU81UWiYWzlPnqYKxSWOuMZ4OD1sU4Y_26J_OsyEVxd78UDJsvwkqfnw8piZb2GicytHRng=s1360-w1360-h1020-rw'
  ]),
  'b2'
);
console.log('Updated Banorte Images');
