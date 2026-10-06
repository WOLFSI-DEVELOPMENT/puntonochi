const fs = require('fs');
let code = fs.readFileSync('src/components/MapPage.tsx', 'utf8');

let buildLayer = `
      // Add 3D buildings layer
      map.current.addSource('buildings', {
        type: 'geojson',
        data: '/buildings.geojson'
      });
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'buildings',
        'type': 'fill-extrusion',
        'minzoom': 14,
        'paint': {
          'fill-extrusion-color': '#e0e0e0',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8
        }
      });
`;

code = code.replace("map.current.on('load', () => {", "map.current.on('load', () => {\n" + buildLayer);

fs.writeFileSync('src/components/MapPage.tsx', code);
console.log('Added 3D buildings');
