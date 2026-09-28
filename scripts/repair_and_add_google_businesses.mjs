import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY or GOOGLE_API_KEY is required.');
if (!connectionString) throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required.');

const sql = neon(connectionString);
const targetPerCategory = 5;
const fallbackImage = '/business-placeholder.svg';
const center = { latitude: 21.3656, longitude: -102.8461 };
const maxDistanceMeters = 75_000;
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const weekdayKeys = new Map([['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'], ['viernes', 'Viernes'], ['sabado', 'Sábado'], ['domingo', 'Domingo']]);
const searches = new Map([
  ['Hoteles', ['hoteles y posadas', 'alojamientos y hoteles']], ['Restaurantes', ['restaurantes y fondas', 'taquerías y comida mexicana']],
  ['Supermercados', ['supermercados y tiendas de abarrotes grandes', 'supermercados']], ['Farmacias', ['farmacias', 'farmacias y droguerías']],
  ['Bancos', ['bancos y sucursales bancarias', 'bancos y cajeros automáticos']], ['Emergencias', ['hospitales, clínicas, bomberos y policía', 'hospitales y clínicas']],
  ['Escuelas', ['escuelas y colegios', 'preescolares y escuelas']], ['Turismo', ['atracciones turísticas, museos y sitios históricos', 'museos y lugares turísticos']],
  ['Parques', ['parques, plazas y jardines públicos', 'parques y unidades deportivas']], ['Repostería', ['panaderías, pastelerías y reposterías', 'pastelerías y tiendas de pasteles']],
  ['Comida', ['puestos de comida, tacos y antojitos', 'comida para llevar y puestos de comida']], ['Vinos y Licores', ['vinaterías y tiendas de licores', 'tiendas de bebidas alcohólicas']],
  ['Bebidas y Depósitos', ['depósitos de cerveza, agua y bebidas', 'distribuidores de bebidas y agua purificada']], ['Mercado', ['mercado municipal, carnicerías y fruterías', 'mercados y tiendas de productos frescos']],
  ['Farmacia', ['farmacias independientes', 'farmacias y droguerías']], ['Hogar', ['mueblerías y tiendas de artículos para el hogar', 'ferreterías y tiendas de hogar']],
  ['Oficios', ['plomeros, electricistas, carpinteros y talleres de oficios', 'servicios de reparación para el hogar']], ['Mecánica', ['talleres mecánicos y reparación de autos', 'llanteras y talleres automotrices']],
  ['Educación', ['academias, centros de capacitación e idiomas', 'centros educativos y tutorías']], ['Servicios Pro.', ['abogados, contadores y servicios profesionales', 'despachos y oficinas de servicios profesionales']],
  ['Fiestas', ['tiendas de artículos para fiestas y alquiler de mobiliario', 'salones de fiestas y organizadores de eventos']], ['Música y Audio', ['tiendas de música, instrumentos y audio', 'estudios de grabación y audio']],
  ['Viajes y Vehículos', ['agencias de viajes, taxis y alquiler de autos', 'transporte local y renta de vehículos']], ['Agricultura', ['tiendas de insumos agrícolas y veterinarias rurales', 'agropecuarias y semillas']],
  ['Moda y Regalos', ['tiendas de ropa, calzado y regalos', 'boutiques y tiendas de regalos']], ['Belleza', ['estéticas, salones de belleza y barberías', 'salones de uñas y peluquerías']],
  ['Salud Esp.', ['dentistas, consultorios médicos y ópticas', 'especialistas médicos y clínicas']], ['Entretenimiento', ['bares, cines y centros de entretenimiento', 'lugares de entretenimiento y recreación']],
  ['Estilo de Vida', ['gimnasios, centros deportivos y bienestar', 'gimnasios y estudios de ejercicio']], ['Construcción', ['constructoras, materiales de construcción y ferreterías', 'proveedores de materiales y contratistas']],
  ['Tecnología', ['tiendas de electrónica, computación y reparación de celulares', 'servicio técnico y tiendas de computación']], ['Hoteles y Rentas', ['hospedaje, cabañas y casas de renta', 'inmobiliarias y renta de alojamientos']],
  ['Ayuntamiento', ['oficinas de gobierno municipal y servicios públicos', 'oficinas públicas y dependencias de gobierno']], ['Eventos', ['salones de eventos y jardines para eventos', 'espacios para bodas y reuniones']],
]);

const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const normalizeKey = (value) => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
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
    const text = normalizeText(description);
    const match = text.match(/^\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s*[:,.-]?\s*(.*)$/);
    if (!match) continue;
    const day = weekdayKeys.get(match[1]);
    if (/cerrad|closed/.test(match[2])) { schedule[day] = { closed: true, intervals: [] }; continue; }
    if (/24\s*horas|24\s*hours|abierto todo el dia/.test(match[2])) { schedule[day] = { closed: false, intervals: [{ open: '00:00', close: '23:59' }] }; continue; }
    const matches = [...match[2].matchAll(/(\d{1,2}):(\d{2})\s*([ap](?:\.?\s*m\.?)?)?/gi)];
    if (!matches.length || matches.length % 2) continue;
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
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
async function googleRequest(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), 'X-Goog-Api-Key': apiKey }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Google Places returned HTTP ${response.status}`);
  return response;
}
async function searchGooglePlaces(query) {
  const response = await googleRequest('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryTypeDisplayName,places.googleMapsUri,places.nationalPhoneNumber,places.priceLevel,places.regularOpeningHours.weekdayDescriptions,places.currentOpeningHours.openNow,places.photos.name' },
    body: JSON.stringify({ textQuery: `${query} in Nochistlán de Mejía, Zacatecas, México`, languageCode: 'es-MX', regionCode: 'MX', maxResultCount: 20, locationBias: { circle: { center, radius: 50_000 } } }),
  });
  const result = await response.json();
  return Array.isArray(result.places) ? result.places : [];
}
async function detailsForPlace(id) {
  const response = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=es-MX`, { headers: { 'X-Goog-FieldMask': 'id,photos.name,regularOpeningHours.weekdayDescriptions,currentOpeningHours.openNow' } });
  return response.json();
}
async function photoUrl(place) {
  const photoName = place.photos?.[0]?.name;
  if (!photoName) return fallbackImage;
  try {
    const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    url.searchParams.set('maxWidthPx', '1200');
    url.searchParams.set('skipHttpRedirect', 'true');
    const response = await googleRequest(url.toString());
    const body = await response.json();
    return typeof body.photoUri === 'string' && /^https:\/\//.test(body.photoUri) ? body.photoUri : fallbackImage;
  } catch { return fallbackImage; }
}
function weeklyText(schedule) {
  return weekdays.map((day) => { const entry = schedule[day]; return entry.closed ? `${day}: cerrado` : `${day}: ${entry.intervals.map(({ open, close }) => `${open}–${close}`).join(' y ')}`; }).join(' · ');
}
const normalizeAddress = (value) => normalizeKey(String(value || '').replace(/\b(mexico|méxico)\b/gi, ''));
const placeFingerprint = (place) => `${normalizeKey(place.category)}|${normalizeKey(place.name)}|${normalizeAddress(place.address)}`;
const knownPlaceNames = (place) => `${normalizeKey(place.category)}|${normalizeKey(place.name)}`;
function relevantForCategory(category, place) {
  const text = normalizeKey([place.displayName?.text, place.primaryTypeDisplayName?.text, ...(place.types || [])].join(' '));
  const rules = new Map([
    ['Bancos', /\b(bank|banco|atm|cajero|financial|financiera|credit union)\b/],
    ['Emergencias', /\b(cruz roja|proteccion civil|bomberos|policia|hospital|clinica|ambulancia|emergency|emergencia)\b/],
    ['Comida', /\b(restaurant|restaurante|taqueria|taco|antojito|food|comida|hamburg|burger|pizza|cafe|cafeteria|mariscos|torta|gordita|tamale|asadero|cocina)\b/],
    ['Supermercados', /\b(supermarket|supermercado|grocery|abarrote|tienda de abarrotes|minisuper|convenience store|bodega aurrera|oxxo|neto)\b/],
    ['Bebidas y Depósitos', /\b(deposito|deposito de cerveza|cerveza|bebida|refresco|agua purificada|licores|distribuidor de bebidas|vinateria)\b/],
    ['Mercado', /\b(mercado|market|tianguis|flea market|plaza de mercado)\b/],
    ['Turismo', /\b(tourist attraction|tourism|turismo|santuario|museo|museum|landmark|monument|mirador|zona arqueologica|rancho|hacienda|natural feature|church|iglesia)\b/],
    ['Música y Audio', /\b(music|musica|instrument|audio|sound|recording|studio|estudio|banda)\b/],
    ['Estilo de Vida', /\b(gym|gimnasio|fitness|yoga|pilates|sports club|deportivo|wellness|bienestar)\b/],
    ['Tecnología', /\b(technology|tecnologia|computer|computacion|electronics|electronica|cell phone|celular|internet|software|repair service)\b/],
    ['Hoteles y Rentas', /\b(hotel|hostal|hospedaje|lodging|cabin|cabana|renta|rental|real estate|inmobiliaria)\b/],
    ['Servicios Pro.', /\b(lawyer|abogado|accountant|contador|consultant|consultoria|professional service|servicio profesional|insurance|seguro|architecture|arquitectura|engineering|ingenieria|marketing|despacho juridico|notario)\b/],
    ['Oficios', /\b(plumber|plomero|electrician|electricista|carpenter|carpintero|locksmith|cerrajero|repair|reparacion|welder|soldador|painter|pintor|handyman|taller)\b/],
    ['Agricultura', /\b(agric|agropec|farm|granja|semilla|seed|veterinar|forraje|ganader|livestock|tractores)\b/],
    ['Entretenimiento', /\b(entertainment|entretenimiento|cinema|cine|theater|teatro|bar|nightclub|club nocturno|arcade|bowling|boliche|amusement|recreation|recreacion|casino)\b/],
    ['Ayuntamiento', /\b(municipal|municipio|ayuntamiento|gobierno|government|presidencia|oficina publica|public office|dependencia)\b/],
  ]);
  if ((place.displayName?.text || '').trim().length < 3) return false;
  if (category === 'Oficios' && /\b(mecanic|automotriz|llantera|vehiculo|car repair|auto repair)\b/.test(text)) return false;
  const matcher = rules.get(category);
  return !matcher || matcher.test(text);
}
async function mapLimit(items, limit, callback) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  }));
  return results;
}

const categoriesWithAliases = await sql`SELECT id, name FROM categories ORDER BY sort_order, name`;
const uniqueCategories = new Map();
for (const category of categoriesWithAliases) if (!uniqueCategories.has(normalizeKey(category.name))) uniqueCategories.set(normalizeKey(category.name), category);
const categories = [...uniqueCategories.values()];
const baselineSortOrder = 403;
const existingRows = await sql`SELECT id, name, category, address, images, weekly_hours AS "weeklyHours", sort_order AS "sortOrder" FROM places`;
const existingIds = new Set(existingRows.map((place) => place.id));
const fingerprints = new Set(existingRows.map(placeFingerprint));
const categoryNames = new Set(existingRows.map(knownPlaceNames));
const addedThisRun = new Map();
for (const place of existingRows) if (Number(place.sortOrder) > baselineSortOrder) addedThisRun.set(place.category, (addedThisRun.get(place.category) || 0) + 1);
const missingPhotos = existingRows.filter((place) => place.id.startsWith('ChI') && place.weeklyHours && (!Array.isArray(place.images) || !place.images.length));
let repairedPhotos = 0;
console.log(`Loaded ${categories.length} categories and ${existingRows.length} businesses; repairing ${missingPhotos.length} imported photo records.`);

await mapLimit(missingPhotos, 5, async (place) => {
  let image = fallbackImage;
  try { image = await photoUrl(await detailsForPlace(place.id)); } catch { /* Keep the local fallback if Google has no retrievable photo. */ }
  await sql`UPDATE places SET images = ${JSON.stringify([image])}::jsonb WHERE id = ${place.id} AND (images IS NULL OR jsonb_array_length(images) = 0 OR images->>0 LIKE '%placeholder%')`;
  repairedPhotos++;
  if (repairedPhotos % 20 === 0) console.log(`Repaired photos for ${repairedPhotos}/${missingPhotos.length} existing businesses.`);
});

const categoryReports = await mapLimit(categories, 3, async (category) => {
  const remaining = Math.max(0, targetPerCategory - (addedThisRun.get(category.name) || 0));
  if (!remaining) return { id: category.id, category: category.name, added: 0, missing: 0, businesses: [], chosen: [] };
  const queries = [...(searches.get(category.name) || [`${category.name} negocios`, `servicios de ${category.name}`]), `${category.name} negocios cerca de Nochistlán`, `${category.name} en Jalpa Zacatecas`, `${category.name} en Teocaltiche`, `${category.name} en Juchipila Zacatecas`, `${category.name} en Yahualica de González Gallo`];
  const chosen = [];
  for (const query of queries) {
    if (chosen.length >= remaining) break;
    let results = [];
    try { results = await searchGooglePlaces(query); }
    catch (error) { console.error(`Google search failed for ${category.name}: ${error.message}`); continue; }
    for (const place of results) {
      if (chosen.length >= remaining || !place.id || !place.displayName?.text?.trim() || !place.location || distanceMeters(place.location) > maxDistanceMeters || existingIds.has(place.id) || !relevantForCategory(category.name, place)) continue;
      const candidate = { id: place.id, name: place.displayName.text.trim(), category: category.name, address: place.formattedAddress || 'Nochistlán de Mejía, Zacatecas' };
      if (fingerprints.has(placeFingerprint(candidate)) || categoryNames.has(knownPlaceNames(candidate))) continue;
      let details = place;
      let weeklyHours = scheduleFromGoogle(details);
      if (!weeklyHours) {
        try { details = await detailsForPlace(place.id); weeklyHours = scheduleFromGoogle(details); }
        catch { /* Skip listings whose hours cannot be confirmed. */ }
      }
      if (!weeklyHours) continue;
      const image = await photoUrl({ ...place, photos: place.photos?.length ? place.photos : details.photos });
      chosen.push({ ...candidate, subtitle: place.primaryTypeDisplayName?.text || place.types?.[0]?.replaceAll('_', ' ') || category.name,
        lat: place.location.latitude, lng: place.location.longitude, rating: Number(place.rating || 0), reviewCount: Number(place.userRatingCount || 0),
        phone: place.nationalPhoneNumber || null, cost: ({ PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 })[place.priceLevel] ?? null,
        mapUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
        weeklyHours, hours: weeklyText(weeklyHours), isOpen: Boolean(place.currentOpeningHours?.openNow || details.currentOpeningHours?.openNow), image });
      existingIds.add(place.id); fingerprints.add(placeFingerprint(candidate)); categoryNames.add(knownPlaceNames(candidate));
    }
  }
  const categoryReport = { id: category.id, category: category.name, added: chosen.length, missing: remaining - chosen.length, businesses: chosen.map(({ name, image }) => ({ name, image: image === fallbackImage ? 'placeholder' : 'Google photo' })), chosen };
  
  console.log(`${category.name}: ${chosen.length}/${remaining} remaining businesses with hours.`);
  return categoryReport;
});
const pending = categoryReports.flatMap(({ chosen }) => chosen);
const report = categoryReports.map(({ chosen, ...summary }) => summary);

let inserted = 0;
for (let offset = 0; offset < pending.length; offset += 20) {
  const batch = pending.slice(offset, offset + 20);
  await sql.transaction(batch.map((place) => sql`
    INSERT INTO places (id, name, category, subtitle, location, address, map_url, images, logo, rating, review_count, is_open, cost, distance, good_to_know, hours, weekly_hours, phone, lat, lng, sort_order)
    VALUES (${place.id}, ${place.name}, ${place.category}, ${place.subtitle}, 'Nochistlán de Mejía, Zacatecas', ${place.address}, ${place.mapUrl}, ${JSON.stringify([place.image])}::jsonb, NULL, ${place.rating}, ${place.reviewCount}, ${place.isOpen}, ${place.cost}, NULL, '[]'::jsonb, ${place.hours}, ${JSON.stringify(place.weeklyHours)}::jsonb, ${place.phone}, ${place.lat}, ${place.lng}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM places))
    ON CONFLICT (id) DO NOTHING
  `));
  inserted += batch.length;
  console.log(`Saved ${inserted}/${pending.length} new businesses.`);
}

const finalCounts = await sql`SELECT category, COUNT(*)::int AS count FROM places GROUP BY category ORDER BY category`;
console.log(JSON.stringify({ repairedPhotos, requestedNewPerCategory: targetPerCategory, inserted, categories: report, finalCounts, shortCategories: report.filter((item) => item.missing > 0).map(({ category, missing }) => ({ category, missing })) }, null, 2));
