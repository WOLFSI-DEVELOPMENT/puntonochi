const fs = require('fs');
let code = fs.readFileSync('src/components/MapPage.tsx', 'utf8');

const oldBlock = `      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}' // Hybrid (Satellite + Labels)
            ],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },`;

const newBlock = `      style: '/maptiler-3d.json',`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/MapPage.tsx', code);
console.log('Updated Map style to maptiler-3d.json');
