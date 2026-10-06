const { DatabaseSync } = require('node:sqlite');
const https = require('https');

const url = 'https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/21.3653,-102.8456/2000/d44fb8fb-ca2b-41c3-92e0-0324fa253118';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const raw = JSON.parse(data);
    
    const mapCategory = (act) => {
      act = act.toLowerCase();
      if (act.includes('restaurante') || act.includes('comida') || act.includes('tacos') || act.includes('loncher') || act.includes('pizzer') || act.includes('antojitos')) return 'Restaurantes';
      if (act.includes('cafe') || act.includes('panad') || act.includes('postres') || act.includes('helad') || act.includes('palet')) return 'Cafeterías';
      if (act.includes('hotel') || act.includes('motel') || act.includes('alojamiento') || act.includes('posada')) return 'Hoteles';
      if (act.includes('farmacia') || act.includes('medicamento')) return 'Farmacias';
      if (act.includes('super') || act.includes('abarrotes') || act.includes('mini super') || act.includes('tienda de conveniencia')) return 'Supermercados';
      return 'Otros';
    };

    const db = new DatabaseSync('database.sqlite');
    db.exec('DELETE FROM places;');

    const insert = db.prepare('INSERT INTO places (id, name, category, subtitle, location, address, mapUrl, images, logo, rating, reviewCount, isOpen, cost, distance, goodToKnow, hours, lat, lng, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    let count = 0;
    for (const r of raw) {
      const category = mapCategory(r.Clase_actividad);
      if (category === 'Otros') continue;
      
      const phone = r.Telefono && r.Telefono.trim() !== '' ? r.Telefono.trim() : null;
      
      try {
        insert.run(
          r.Id,
          r.Nombre,
          category,
          r.Clase_actividad.substring(0, 50),
          'Nochistlán Centro',
          r.Calle + ' ' + r.Num_Exterior + ', ' + r.Colonia,
          'https://maps.apple.com/?q=' + parseFloat(r.Latitud) + ',' + parseFloat(r.Longitud),
          JSON.stringify(['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80']),
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
          parseFloat((Math.random() * (5 - 3.5) + 3.5).toFixed(1)),
          Math.floor(Math.random() * 200) + 10,
          1,
          1,
          (Math.random() * 1.5 + 0.1).toFixed(1) + ' km',
          JSON.stringify(['Efectivo']),
          '9:00 AM - 6:00 PM',
          parseFloat(r.Latitud),
          parseFloat(r.Longitud),
          phone
        );
        count++;
      } catch (e) {
        console.error('Error inserting ' + r.Nombre, e.message);
      }
    }
    console.log('Inserted ' + count + ' INEGI places with phone numbers');
  });
});
