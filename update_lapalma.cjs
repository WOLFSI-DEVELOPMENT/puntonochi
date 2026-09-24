const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
db.prepare('UPDATE places SET images = ?, logo = ? WHERE id = ?').run(
  JSON.stringify(['https://escapadas.mexicodesconocido.com.mx/wp-content/uploads/2020/10/restaurante-palma-ok.jpg']),
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDOHZ8lLw9qBjdVrdAfXeopkMS9c35GZTKdUeNK9qUfU0GSoXSpY9xhBo&s=10',
  'r1'
);
console.log('Restaurante La Palma updated');
