export const APP_LANGUAGE_KEY = 'puntonochi-language-v1';

export const APP_LANGUAGES = [
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' },
] as const;

export type AppLanguage = typeof APP_LANGUAGES[number]['code'];
export type AppLanguageSetting = AppLanguage | 'auto';

const translations: Record<string, Record<string, string>> = {
  en: {
    'Elige el idioma de toda la interfaz. En automático usamos el idioma preferido de tu navegador y lo actualizamos si cambia.': 'Choose the language for the entire interface. Automatic uses your browser’s preferred language and updates if it changes.',
    'Inicio': 'Home', 'Explorar': 'Explore', 'Noticias': 'News', 'Artículos': 'Articles', 'Crear': 'Create', 'Buscar': 'Search',
    'Buscar en PuntoNochi': 'Search PuntoNochi', 'Buscar en PuntoNochi...': 'Search PuntoNochi...', 'Perfil': 'Profile', 'Ajustes': 'Settings', 'Cerrar': 'Close',
    'Todas las categorías': 'All categories', 'CATEGORÍA': 'CATEGORY', 'negocio': 'business', 'negocios': 'businesses', 'clics': 'clicks', 'Quitar de guardados': 'Remove from saved',
    'Aún no hay negocios en esta categoría': 'There are no businesses in this category yet', 'Vuelve pronto para ver nuevos lugares.': 'Check back soon for new places.', 'Aún no hay negocios guardados': 'No saved businesses yet', 'Toca el marcador de un negocio para encontrarlo aquí después.': 'Tap a business bookmark to find it here later.',
    'Idioma de la aplicación': 'App language', 'Elige el idioma de toda la interfaz.': 'Choose the language for the app interface.', 'Idioma': 'Language',
    'PREFERENCIAS': 'PREFERENCES', 'TU ESPACIO': 'YOUR SPACE', 'Diseño de navegación': 'Navigation style', 'Elige cómo quieres ver la barra inferior.': 'Choose how you want the navigation bar to look.',
    'Brillo y movimiento': 'Glow and motion', 'Cristal esmerilado': 'Frosted glass', 'Acceso con passkey': 'Passkey sign-in', 'Usa huella, rostro o el bloqueo de tu dispositivo.': 'Use your fingerprint, face, or device screen lock.',
    'Configurar passkey': 'Set up passkey', 'Configurando…': 'Setting up…', 'Passkey configurada.': 'Passkey set up.', 'No se pudo configurar la passkey.': 'Could not set up passkey.',
    'Cerrar sesión': 'Sign out', 'No se pudo cerrar sesión. Intenta otra vez.': 'Could not sign out. Try again.', 'Cuenta de Facebook': 'Facebook account',
    'Guardados': 'Saved', 'Tus negocios favoritos': 'Your favorite places', 'Aún no guardas negocios. Toca el marcador azul en una tarjeta para agregarla aquí.': 'You have no saved places yet. Tap the blue bookmark on a card to save one here.',
    'Inicia sesión para acceder a tu perfil': 'Sign in to access your profile', 'Consulta tus publicaciones, reseñas y eventos, y participa en la comunidad.': 'View your posts, reviews, and events, and join the community.',
    'Iniciar sesión o crear cuenta': 'Sign in or create an account', 'Iniciar sesión': 'Sign in', 'Guardar': 'Save', 'Cancelar': 'Cancel', 'Aceptar': 'Accept', 'Continuar': 'Continue',
    'Pronóstico de hoy': "Today's forecast", 'Sugeridos': 'Suggested for you', 'Por Categoría': 'Browse by category', 'Encuentra lo que necesitas': 'Find what you need',
    'Eventos': 'Events', 'Negocios': 'Businesses', 'Favoritos': 'Favorites', 'Ver más': 'See more', 'Ver todos': 'See all',
    'Cargando…': 'Loading…', 'Cargando': 'Loading', 'No hay resultados': 'No results', 'Intenta otra búsqueda': 'Try another search', 'Volver': 'Back',
    'Nueva nota': 'New note', 'Recordatorios': 'Reminders', 'Calendario': 'Calendar', 'Temporizador': 'Timer', 'Cronómetro': 'Stopwatch', 'Alarmas': 'Alarms',
    'Notas rápidas': 'Quick Notes', 'Más usados': 'Most used', 'Próximamente': 'Coming soon', 'Pregunta del día': 'Question of the day', 'Patrocinadores': 'Sponsors',
    'Sin eventos para este día': 'No events for this day', 'Agenda': 'Schedule', 'Nombre del evento': 'Event name', 'Nuevo evento': 'New event', 'Nuevo recordatorio': 'New reminder',
    'Notas': 'Notes', 'Buscar un lugar, servicio o lo que necesitas': 'Search for a place, service, or anything you need', 'O escribe lo que necesitas': 'Or type what you need',
    'Busca un negocio…': 'Search for a business…', '¿Se te antoja algo rico?': 'Craving something good?', 'Encuentra servicios cerca': 'Find services nearby', 'Explora lugares locales': 'Explore local places',
    'Comida': 'Food', 'Vinos y Licores': 'Wine and Liquor', 'Bebidas y Depósitos': 'Drinks and Deposits', 'Farmacia': 'Pharmacy', 'Hogar': 'Home', 'Oficios': 'Trades', 'Mecánica': 'Auto Repair', 'Educación': 'Education',
    'Servicios Pro.': 'Professional Services', 'Fiestas': 'Parties', 'Música y Audio': 'Music and Audio', 'Viajes y Vehículos': 'Travel and Vehicles', 'Agricultura': 'Agriculture', 'Supermercados': 'Supermarkets',
    'Moda y Regalos': 'Fashion and Gifts', 'Belleza': 'Beauty', 'Salud Especializada': 'Specialized Health', 'Entretenimiento': 'Entertainment', 'Estilo de Vida': 'Lifestyle', 'Construcción': 'Construction', 'Tecnología': 'Technology', 'Hoteles y Rentas': 'Hotels and Rentals', 'Ayuntamiento': 'City Hall',
    'PUNTONOCHI EN': 'PUNTONOCHI IN', 'Buscar negocios, lugares o servicios': 'Search businesses, places, or services', 'Abrir búsqueda': 'Open search',
  },

};

const englishToSpanish: Record<string, string> = {
  ...Object.fromEntries(Object.entries(translations.en).map(([spanish, english]) => [english, spanish])),
  'Browse businesses': 'Explorar negocios', 'Search businesses, places, or services': 'Buscar negocios, lugares o servicios',
  'Search businesses, places, or services…': 'Buscar negocios, lugares o servicios…', 'Search a business…': 'Busca un negocio…',
  'Craving something good?': '¿Se te antoja algo rico?', 'Find services nearby': 'Encuentra servicios cerca',
  'Explore local places': 'Explora lugares locales', 'Explore categories': 'Explorar categorías',
  'PuntoNochi in': 'PuntoNochi en', 'Today’s forecast': 'Pronóstico de hoy', "Today's forecast": 'Pronóstico de hoy',
  'Suggested for you': 'Sugeridos para ti', 'Business for you, based on what you’re looking for and saving': 'Negocios para ti, según lo que buscas y guardas',
  'Business for you, based on what you\'re looking for and saving': 'Negocios para ti, según lo que buscas y guardas',
  'Recently Viewed': 'Vistos recientemente', 'Quickly get back to the stores you visited': 'Vuelve rápido a los negocios que visitaste',
  'The stores you visit will appear here.': 'Los negocios que visites aparecerán aquí.', 'Popular this week': 'Popular esta semana',
  'What the community is looking for and visiting': 'Lo que la comunidad está buscando y visitando', 'New in Nochistlán': 'Nuevo en Nochistlán',
  'Recently Added Businesses': 'Negocios agregados recientemente', 'Any new stores we add will appear here.': 'Los negocios nuevos que agreguemos aparecerán aquí.',
  'Your Saved Businesses': 'Tus negocios guardados', 'You don’t have any favorites yet. Save a store with the bookmark to find it here.': 'Aún no tienes favoritos. Guarda un negocio con el marcador para encontrarlo aquí.',
  'You don\'t have any favorites yet. Save a store with the bookmark to find it here.': 'Aún no tienes favoritos. Guarda un negocio con el marcador para encontrarlo aquí.',
  'Featured Places': 'Lugares destacados', 'Recommendations for you': 'Recomendaciones para ti', 'Add your business': 'Agrega tu negocio',
  'Share your business with the Nochistlán community.': 'Comparte tu negocio con la comunidad de Nochistlán.',
  'I want to be a sponsor': 'Quiero ser patrocinador', 'Tap to see the answer of the day': 'Toca para ver la respuesta del día',
  'Flip to see the answer of the day': 'Voltear para ver la respuesta del día', 'Tap to go back': 'Toca para volver',
  'Question of the day, forecast, sponsors and Instagram': 'Pregunta del día, pronóstico, patrocinadores e Instagram',
  'Which do you prefer: corn tortillas or flour tortillas?': '¿Qué prefieres: tortillas de maíz o de harina?',
  'Services': 'Servicios', 'Restaurants': 'Restaurantes', 'Hotels': 'Hoteles', 'Hotels and Rentals': 'Hoteles y Rentas',
  'Pharmacies': 'Farmacias', 'Banks': 'Bancos', 'Emergencies': 'Emergencias', 'Schools': 'Escuelas', 'Tourism': 'Turismo',
  'Parks': 'Parques', 'Food': 'Comida', 'Wines and Spirits': 'Vinos y Licores', 'Beverages and Deposits': 'Bebidas y Depósitos',
  'Home': 'Inicio', 'Trades': 'Oficios', 'Mechanics': 'Mecánica', 'Education': 'Educación',
  'Pro Services.': 'Servicios Profesionales', 'Parties': 'Fiestas', 'Music & Audio': 'Música y Audio', 'Trips & Vehicles': 'Viajes y Vehículos',
  'Agriculture': 'Agricultura', 'Supermarkets': 'Supermercados', 'Fashion & Gifts': 'Moda y Regalos', 'Beauty': 'Belleza',
  'Health Esp.': 'Salud Especializada', 'Entertainment': 'Entretenimiento', 'Lifestyle': 'Estilo de Vida', 'Construction': 'Construcción',
  'Technology': 'Tecnología', 'City Hall': 'Ayuntamiento', 'Events': 'Eventos', 'Search': 'Buscar', 'Profile': 'Perfil',
  'Open search': 'Abrir búsqueda', 'Browse by category': 'Por Categoría', 'Find what you need': 'Encuentra lo que necesitas',
  'days': 'días', 'day': 'día', 'Open': 'Abierto', 'Closed': 'Cerrado', 'Verified Business': 'Negocio verificado',
  'See all': 'Ver todos', 'See more': 'Ver más', 'Read more': 'Leer más', 'Show more': 'Mostrar más', 'Show less': 'Mostrar menos',
  'Cancel': 'Cancelar', 'Save': 'Guardar', 'Close': 'Cerrar', 'Back': 'Volver', 'Continue': 'Continuar', 'Loading…': 'Cargando…',
  'No results': 'No hay resultados', 'Try another search': 'Intenta otra búsqueda', 'Search for a place, service, or anything you need': 'Busca un lugar, servicio o lo que necesitas',
  'Or type what you need': 'O escribe lo que necesitas', 'No events for this day': 'Sin eventos para este día', 'Schedule': 'Agenda',
  'Event name': 'Nombre del evento', 'New event': 'Nuevo evento', 'New reminder': 'Nuevo recordatorio', 'Quick Notes': 'Notas rápidas',
  'Reminders': 'Recordatorios', 'Calendar': 'Calendario', 'Timer': 'Temporizador', 'Stopwatch': 'Cronómetro', 'Alarms': 'Alarmas',
  'Most used': 'Más usados', 'Coming soon': 'Próximamente', 'Sponsors': 'Patrocinadores', 'Question of the day': 'Pregunta del día',
};
translations.es = englishToSpanish;

export function detectAppLanguage(): AppLanguage {
  const preferred = typeof navigator !== 'undefined' ? navigator.languages?.length ? navigator.languages : [navigator.language] : [];
  for (const candidate of preferred) {
    const baseLanguage = candidate.toLowerCase().split('-')[0];
    if (baseLanguage === 'es' || baseLanguage === 'en') return baseLanguage;
  }
  return 'es';
}

export function getAppLanguageSetting(): AppLanguageSetting {
  try {
    const saved = localStorage.getItem(APP_LANGUAGE_KEY) as AppLanguageSetting | null;
    return saved === 'auto' || APP_LANGUAGES.some((language) => language.code === saved) ? saved! as AppLanguageSetting : 'auto';
  } catch { return 'auto'; }
}

export function getAppLanguage(): AppLanguage {
  const setting = getAppLanguageSetting();
  return setting === 'auto' ? detectAppLanguage() : setting;
}

export function setAppLanguage(setting: AppLanguageSetting) {
  try { localStorage.setItem(APP_LANGUAGE_KEY, setting); } catch { /* Language still changes for this session. */ }
  const language = setting === 'auto' ? detectAppLanguage() : setting;
  window.dispatchEvent(new CustomEvent('puntonochi-language-changed', { detail: { language, setting } }));
}

function translatedText(value: string, language: AppLanguage) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const translation = translations[language]?.[normalized];
  if (!translation) return value;
  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  return `${leading}${translation}${trailing}`;
}

export function installAppLocalization() {
  let language = getAppLanguage();
  const textEntries = new WeakMap<Node, { source: string; target: string }>();
  const attributeEntries = new WeakMap<Element, Map<string, { source: string; target: string }>>();
  const applyTextNode = (node: Node) => {
    const current = node.nodeValue;
    if (current === null) return;
    const previous = textEntries.get(node);
    const source = previous && current === previous.target ? previous.source : current;
    const target = translatedText(source, language);
    textEntries.set(node, { source, target });
    if (current !== target) node.nodeValue = target;
  };
  const applyAttribute = (element: Element, attribute: string) => {
    const current = element.getAttribute(attribute);
    if (current === null) return;
    let entries = attributeEntries.get(element);
    if (!entries) { entries = new Map(); attributeEntries.set(element, entries); }
    const previous = entries.get(attribute);
    const source = previous && current === previous.target ? previous.source : current;
    const target = translatedText(source, language);
    entries.set(attribute, { source, target });
    if (current !== target) element.setAttribute(attribute, target);
  };
  const applyElement = (element: Element) => {
    for (const attribute of ['placeholder', 'aria-label', 'title']) applyAttribute(element, attribute);
  };
  const applyTree = (root: Node) => {
    if (root.nodeType === Node.ELEMENT_NODE) applyElement(root as Element);
    if (root.nodeType === Node.TEXT_NODE) applyTextNode(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) applyTextNode(textNode);
    if (root instanceof Element) root.querySelectorAll('[placeholder], [aria-label], [title]').forEach(applyElement);
  };
  const updateLanguage = (nextLanguage = getAppLanguage()) => {
    language = nextLanguage;
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
    applyTree(document.body);
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') applyTextNode(record.target);
      if (record.type === 'attributes' && record.attributeName) applyAttribute(record.target as Element, record.attributeName);
      record.addedNodes.forEach(applyTree);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  const handleLanguageChange = (event: Event) => updateLanguage((event as CustomEvent<{ language: AppLanguage }>).detail.language);
  const handleBrowserLanguageChange = () => {
    if (getAppLanguageSetting() === 'auto') {
      const detected = detectAppLanguage();
      updateLanguage(detected);
      window.dispatchEvent(new CustomEvent('puntonochi-language-changed', { detail: { language: detected, setting: 'auto' } }));
    }
  };
  window.addEventListener('puntonochi-language-changed', handleLanguageChange);
  window.addEventListener('languagechange', handleBrowserLanguageChange);
  updateLanguage(language);
  return () => {
    observer.disconnect();
    window.removeEventListener('puntonochi-language-changed', handleLanguageChange);
    window.removeEventListener('languagechange', handleBrowserLanguageChange);
  };
}
