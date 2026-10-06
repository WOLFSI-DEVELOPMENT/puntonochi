const https = require('https');
const fs = require('fs');
const osmtogeojson = require('osmtogeojson');

const query = `
  [out:json][timeout:25];
  (
    way["building"](21.35,-102.86,21.38,-102.83);
    relation["building"](21.35,-102.86,21.38,-102.83);
  );
  out body;
  >;
  out skel qt;
`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
https.get(url, { headers: { 'User-Agent': 'NodeJS script' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const osmJson = JSON.parse(data);
      const geojson = osmtogeojson(osmJson);
      geojson.features.forEach(f => {
        if (!f.properties.height) {
          f.properties.height = Math.floor(Math.random() * 11) + 4;
        }
      });
      fs.writeFileSync('public/buildings.geojson', JSON.stringify(geojson));
      console.log('Saved buildings.geojson with ' + geojson.features.length + ' features');
    } catch(e) {
      console.error('Error:', e, data.substring(0, 200));
    }
  });
});
