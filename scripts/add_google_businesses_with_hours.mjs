import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY or GOOGLE_API_KEY is required.');
if (!connectionString) throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required.');

const sql = neon(connectionString);
const targetPerCategory = 10;
const radiusMeters = 20_000;
const center = { latitude: 21.3656, longitude: -102.8461 };
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const weekdayKeys = new Map([
  ['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'],
  ['viernes', 'Viernes'], ['sabado', 'Sábado'], ['domingo', 'Domingo'],
]);

const searches = new Map([
  ['Hoteles', ['hoteles y posadas', 'alojamientos y hoteles']],
  ['Restaurantes', ['restaurantes y fondas', 'taquerías y comida mexicana']],
  ['Supermercados', ['supermercados y tiendas de abarrotes grandes', 'supermercados']],
  ['Farmacias', ['farmacias', 'farmacias y droguerías']],
  ['Bancos', ['bancos y sucursales bancarias', 'bancos y cajeros automáticos']],
  ['Emergencias', ['hospitales, clínicas, bomberos y policía', 'hospitales y clínicas']],
  ['Escuelas', ['escuelas y colegios', 'preescolares y escuelas']],
  ['Turismo', ['atracciones turísticas, museos y sitios históricos', 'museos y lugares turísticos']],
  ['Parques', ['parques, plazas y jardines públicos', 'parques y unidades deportivas']],
  ['Repostería', ['panaderías, pastelerías y reposterías', 'pastelerías y tiendas de pasteles']],
  ['Comida', ['puestos de comida, tacos y antojitos', 'comida para llevar y puestos de comida']],
  ['Vinos y Licores', ['vinaterías y tiendas de licores', 'tiendas de bebidas alcohólicas']],
  ['Bebidas y Depósitos', ['depósitos de cerveza, agua y bebidas', 'distribuidores de bebidas y agua purificada']],
  ['Mercado', ['mercado municipal, carnicerías y fruterías', 'mercados y tiendas de productos frescos']],
  ['Farmacia', ['farmacias independientes', 'farmacias y droguerías']],
  ['Hogar', ['mueblerías y tiendas de artículos para el hogar', 'ferreterías y tiendas de hogar']],
  ['Oficios', ['plomeros, electricistas, carpinteros y talleres de oficios', 'servicios de reparación para el hogar']],
  ['Mecánica', ['talleres mecánicos y reparación de autos', 'llanteras y talleres automotrices']],
  ['Educación', ['academias, centros de capacitación e idiomas', 'centros educativos y tutorías']],
  ['Servicios Pro.', ['abogados, contadores y servicios profesionales', 'despachos y oficinas de servicios profesionales']],
  ['Fiestas', ['tiendas de artículos para fiestas y alquiler de mobiliario', 'salones de fiestas y organizadores de eventos']],
  ['Música y Audio', ['tiendas de música, instrumentos y audio', 'estudios de grabación y audio']],
  ['Viajes y Vehículos', ['agencias de viajes, taxis y alquiler de autos', 'transporte local y renta de vehículos']],
  ['Agricultura', ['tiendas de insumos agrícolas y veterinarias rurales', 'agropecuarias y semillas']],
  ['Moda y Regalos', ['tiendas de ropa, calzado y regalos', 'boutiques y tiendas de regalos']],
  ['Belleza', ['estéticas, salones de belleza y barberías', 'salones de uñas y peluquerías']],
  ['Salud Esp.', ['dentistas, consultorios médicos y ópticas', 'especialistas médicos y clínicas']],
  ['Entretenimiento', ['bares, cines y centros de entretenimiento', 'lugares de entretenimiento y recreación']],
  ['Estilo de Vida', ['gimnasios, centros deportivos y bienestar', 'gimnasios y estudios de ejercicio']],
  ['Construcción', ['constructoras, materiales de construcción y ferreterías', 'proveedores de materiales y contratistas']],
  ['Tecnología', ['tiendas de electrónica, computación y reparación de celulares', 'servicio técnico y tiendas de computación']],
  ['Hoteles y Rentas', ['hospedaje, cabañas y casas de renta', 'inmobiliarias y renta de alojamientos']],
  ['Ayuntamiento', ['oficinas de gobierno municipal y servicios públicos', 'oficinas públicas y dependencias de gobierno']],
  ['Eventos', ['salones de eventos y jardines para eventos', 'espacios para bodas y reuniones']],
]);

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function parseTime(hour, minute, meridiem) {
  let value = Number(hour);
  const suffix = (meridiem || '').toLocaleLowerCase().replace(/[^ap]/g, '');
  if (suffix === 'p' && value < 12) value += 12;
  if (suffix === 'a' && value === 12) value = 0;
  if (value > 23 || Number(minute) > 59) return null;
  return `${String(value).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`;
}

function scheduleFromGoogle(place) {
  const descriptions = place.regularOpeningHours?.weekdayDescriptions;
  if (!Array.isArray(descriptions) || descriptions.length < 7) return null;
  const schedule = Object.fromEntries(weekdays.map((day) => [day, null]));
  for (const description of descriptions) {
    const normalized = normalizeText(description);
    const dayMatch = normalized.match(/^\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b\s*[:,.-]?\s*(.*)$/);
    if (!dayMatch) continue;
    const day = weekdayKeys.get(dayMatch[1]);
    const text = dayMatch[2];
    if (/cerrad|closed/.test(text)) {
      schedule[day] = { closed: true, intervals: [] };
      continue;
    }
    if (/24\s*horas|24\s*hours|abierto todo el dia/.test(text)) {
      schedule[day] = { closed: false, intervals: [{ open: '00:00', close: '23:59' }] };
      continue;
    }
    const timePattern = /(\d{1,2}):(\d{2})\s*([ap](?:\.?\s*m\.?)?)?/gi;
    const matches = [...text.matchAll(timePattern)];
    if (!matches.length || matches.length % 2 !== 0) continue;
    const intervals = [];
    for (let index = 0; index < matches.length; index += 2) {
      const open = parseTime(matches[index][1], matches[index][2], matches[index][3]);
      const close = parseTime(matches[index + 1][1], matches[index + 1][2], matches[index + 1][3]);
      if (!open || !close) { intervals.length = 0; break; }
      intervals.push({ open, close });
    }
    if (intervals.length) schedule[day] = { closed: false, intervals };
  }
  return Object.values(schedule).every(Boolean) ? schedule : null;
}

function distanceMeters(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return Infinity;
  const radians = (degrees) => degrees * Math.PI / 180;
  const lat1 = radians(center.latitude); const lat2 = radians(location.latitude);
  const dLat = lat2 - lat1; const dLng = radians(location.longitude - center.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchGooglePlaces(query) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
        'places.rating', 'places.userRatingCount', 'places.types', 'places.primaryTypeDisplayName',
        'places.googleMapsUri', 'places.nationalPhoneNumber', 'places.priceLevel',
        'places.regularOpeningHours.weekdayDescriptions', 'places.currentOpeningHours.openNow',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${query} in Nochistlán de Mejía, Zacatecas, México`,
      languageCode: 'es-MX',
      regionCode: 'MX',
      maxResultCount: 20,
      locationBias: { circle: { center, radius: radiusMeters } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google Places search failed (${response.status}): ${result.error?.status || 'API error'}`);
  return Array.isArray(result.places) ? result.places : [];
}

const categories = await sql`SELECT id, name FROM categories ORDER BY sort_order, name`;
const existingRows = await sql`SELECT id FROM places`;
const existingIds = new Set(existingRows.map((row) => row.id));
const usedIds = new Set(existingIds);
const pending = [];
const report = [];

console.log(`Loaded ${categories.length} database categories and ${existingIds.size} existing businesses.`);
for (const category of categories) {
  const queries = searches.get(category.name) || [`${category.name} businesses`, `servicios y negocios de ${category.name}`];
  const chosen = [];
  let searched = 0;
  for (const term of queries) {
    if (chosen.length >= targetPerCategory) break;
    searched++;
    let results;
    try {
      results = await searchGooglePlaces(term);
    } catch (error) {
      console.error(`Search failed for ${category.name}: ${error.message}`);
      continue;
    }
    for (const place of results) {
      if (chosen.length >= targetPerCategory) break;
      if (!place.id || !place.displayName?.text?.trim() || usedIds.has(place.id) || distanceMeters(place.location) > radiusMeters * 1.25) continue;
      const weeklyHours = scheduleFromGoogle(place);
      if (!weeklyHours) continue;
      usedIds.add(place.id);
      const hours = weekdays.map((day) => {
        const entry = weeklyHours[day];
        return entry.closed ? `${day}: cerrado` : `${day}: ${entry.intervals.map(({ open, close }) => `${open}–${close}`).join(' y ')}`;
      }).join(' · ');
      chosen.push({
        id: place.id,
        name: place.displayName?.text?.trim(),
        category: category.name,
        subtitle: place.primaryTypeDisplayName?.text || place.types?.[0]?.replaceAll('_', ' ') || category.name,
        address: place.formattedAddress || 'Nochistlán de Mejía, Zacatecas',
        lat: place.location.latitude,
        lng: place.location.longitude,
        rating: Number(place.rating || 0),
        reviewCount: Number(place.userRatingCount || 0),
        phone: place.nationalPhoneNumber || null,
        cost: ({ PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 })[place.priceLevel] ?? null,
        mapUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
        weeklyHours,
        hours,
        isOpen: Boolean(place.currentOpeningHours?.openNow),
      });
    }
  }
  for (const place of chosen) pending.push(place);
  report.push({ id: category.id, category: category.name, searched, found: chosen.length, names: chosen.map((place) => place.name) });
  console.log(`${category.name}: ${chosen.length}/${targetPerCategory} businesses with weekly hours (${searched} Google search${searched === 1 ? '' : 'es'}).`);
}

const insertBatches = [];
for (let offset = 0; offset < pending.length; offset += 20) {
  insertBatches.push(pending.slice(offset, offset + 20));
}
let inserted = 0;
for (const batch of insertBatches) {
  const queries = batch.map((place) => sql`
    INSERT INTO places (
      id, name, category, subtitle, location, address, map_url, images, logo, rating, review_count,
      is_open, cost, distance, good_to_know, hours, weekly_hours, phone, lat, lng, sort_order
    ) VALUES (
      ${place.id}, ${place.name}, ${place.category}, ${place.subtitle}, 'Nochistlán de Mejía, Zacatecas',
      ${place.address}, ${place.mapUrl}, '[]'::jsonb, NULL, ${place.rating}, ${place.reviewCount},
      ${place.isOpen}, ${place.cost}, NULL, '[]'::jsonb, ${place.hours}, ${JSON.stringify(place.weeklyHours)}::jsonb,
      ${place.phone}, ${place.lat}, ${place.lng}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM places)
    ) ON CONFLICT (id) DO NOTHING
  `);
  await sql.transaction(queries);
  inserted += batch.length;
  console.log(`Saved ${inserted}/${pending.length}.`);
}

const finalCounts = await sql`
  SELECT category, COUNT(*)::int AS count
  FROM places
  GROUP BY category
  ORDER BY category
`;
const deficit = report.filter((item) => item.found < targetPerCategory).map(({ category, found }) => ({ category, added: found, shortBy: targetPerCategory - found }));
console.log(JSON.stringify({ requestedPerCategory: targetPerCategory, categories: report, inserted, finalCounts, categoriesWithFewerThanTen: deficit }, null, 2));
