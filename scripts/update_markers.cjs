const fs = require('fs');
let code = fs.readFileSync('src/components/MapPage.tsx', 'utf8');

const oldBlockRegex = /mockPlaces\.forEach\(\(place, index\) => \{[\s\S]*?new maplibregl\.Marker[\s\S]*?\.addTo\(map\.current!\);\s*\}\);/m;

const newBlock = `
      // 1. Collect unique colors
      const uniqueColors = Array.from(new Set(mockPlaces.map(p => getCategoryColor(p.category))));
      
      // 2. Generate and add SVG images for each color
      uniqueColors.forEach(color => {
        const svg = \`<svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 42C20 42 35 27.5685 35 16C35 7.71573 28.2843 1 20 1C11.7157 1 5 7.71573 5 16C5 27.5685 20 42 20 42Z" fill="\${color}" stroke="white" stroke-width="2.5"/>
            <circle cx="20" cy="16" r="6" fill="white"/>
        </svg>\`;
        const img = new Image();
        img.onload = () => {
          if (map.current && !map.current.hasImage('pin-' + color)) {
            map.current.addImage('pin-' + color, img);
          }
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });

      // 3. Create GeoJSON source
      const placesGeoJSON = {
        type: 'FeatureCollection',
        features: mockPlaces.map((place, index) => {
          const randX = (Math.sin(index * 12.9898) * 43758.5453) % 1;
          const randY = (Math.cos(index * 78.233) * 43758.5453) % 1;
          const lon = place.lng ?? (nochistlanCenter[0] + (randX * 0.01 - 0.005));
          const lat = place.lat ?? (nochistlanCenter[1] + (randY * 0.01 - 0.005));
          
          return {
            type: 'Feature',
            properties: {
              id: place.id,
              color: getCategoryColor(place.category),
              placeStr: JSON.stringify(place)
            },
            geometry: { type: 'Point', coordinates: [lon, lat] }
          };
        })
      };

      map.current.addSource('places', {
        type: 'geojson',
        data: placesGeoJSON
      });

      // 4. Add Symbol Layer for the pins
      map.current.addLayer({
        id: 'places-layer',
        type: 'symbol',
        source: 'places',
        layout: {
          'icon-image': ['concat', 'pin-', ['get', 'color']],
          'icon-size': 0.7,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'viewport' // Keeps pins standing upright in 3D
        }
      });

      // 5. Interactivity
      map.current.on('click', 'places-layer', (e) => {
        if (e.features && e.features.length > 0 && onSelectBusiness) {
          const place = JSON.parse(e.features[0].properties.placeStr);
          onSelectBusiness(place);
        }
      });

      map.current.on('mouseenter', 'places-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'places-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
`;

code = code.replace(oldBlockRegex, newBlock);
fs.writeFileSync('src/components/MapPage.tsx', code);
console.log('Replaced map markers with WebGL symbol layer!');
