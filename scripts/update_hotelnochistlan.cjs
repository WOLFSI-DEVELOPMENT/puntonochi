const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ?, logo = ? WHERE id = ?').run(
  JSON.stringify([
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFrSxyibZZebZ947wFR1rj810JdBRKC7SPpjOzb8ggdhb0_QJzk5LSTHg&s=10',
    'https://media-cdn.tripadvisor.com/media/photo-s/1c/2a/c0/bb/hotel-nochistlan.jpg',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTKZcZ8hv5GiQ-w3G1eMqlkLwg-jtaz2XN2yFqntMPTczFJjooG59yciug&s=10'
  ]),
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjbm3kw5vkmpJB2rOvsxhU2L2UEmPbHpZ5BGZcd9gI6Kz7xYiEbgohbAEB&s=10',
  'h1'
);
console.log('Hotel Nochistlán updated');
