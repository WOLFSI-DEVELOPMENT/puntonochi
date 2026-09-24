const fs = require('fs');
let code = fs.readFileSync('src/components/MapPage.tsx', 'utf8');

const buildingsBlock = "// Add global 3D buildings from Overture Maps (100% free)";

const roadsBlock = `
      // Add global 3D-styled roads from Overture Maps
      map.current.addSource('roads', {
        type: 'vector',
        url: 'pmtiles://https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/2026-08-19.0/transportation.pmtiles'
      });
      
      // Road Casing (Bottom layer, creates a border/shadow effect)
      map.current.addLayer({
        'id': 'roads-casing',
        'source': 'roads',
        'source-layer': 'segment',
        'type': 'line',
        'minzoom': 12,
        'paint': {
          'line-color': '#111111',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 8, 20, 20],
          'line-opacity': 0.7
        }
      });

      // Road Fill (Top layer, creates the raised 3D look)
      map.current.addLayer({
        'id': 'roads-fill',
        'source': 'roads',
        'source-layer': 'segment',
        'type': 'line',
        'minzoom': 12,
        'paint': {
          'line-color': '#444444',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 5, 20, 14],
          'line-opacity': 0.9
        }
      });

      // Add global 3D buildings from Overture Maps (100% free)`;

code = code.replace(buildingsBlock, roadsBlock);
fs.writeFileSync('src/components/MapPage.tsx', code);
console.log('Added roads layer');
