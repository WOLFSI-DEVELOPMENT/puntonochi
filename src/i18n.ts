export const APP_LANGUAGE_KEY = 'puntonochi-language-v1';
const TRANSLATION_CACHE_KEY = 'puntonochi-ui-translation-cache-v1';

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
    'Idioma de la aplicación': 'App language', 'Elige el idioma de toda la interfaz.': 'Choose the language for the app interface.', 'Idioma': 'Language',
    'PREFERENCIAS': 'PREFERENCES', 'TU ESPACIO': 'YOUR SPACE', 'Diseño de navegación': 'Navigation style', 'Elige cómo quieres ver la barra inferior.': 'Choose how you want the navigation bar to look.',
    'Brillo y movimiento': 'Glow and motion', 'Cristal esmerilado': 'Frosted glass', 'Acceso con passkey': 'Passkey sign-in', 'Usa huella, rostro o el bloqueo de tu dispositivo.': 'Use your fingerprint, face, or device screen lock.',
    'Configurar passkey': 'Set up passkey', 'Configurando…': 'Setting up…', 'Passkey configurada.': 'Passkey set up.', 'No se pudo configurar la passkey.': 'Could not set up passkey.',
    'Cerrar sesión': 'Sign out', 'No se pudo cerrar sesión. Intenta otra vez.': 'Could not sign out. Try again.', 'Cuenta de Facebook': 'Facebook account',
    'Guardados': 'Saved', 'Tus negocios favoritos': 'Your favorite places', 'Aún no guardas negocios. Toca el marcador azul en una tarjeta para agregarla aquí.': 'You have no saved places yet. Tap the blue bookmark on a card to save one here.',
    'Inicia sesión para acceder a tu perfil': 'Sign in to access your profile', 'Consulta tus publicaciones, reseñas y eventos, y participa en la comunidad.': 'View your posts, reviews, and events, and join the community.',
    'Iniciar sesión o crear cuenta': 'Sign in or create an account', 'Iniciar sesión': 'Sign in', 'Guardar': 'Save', 'Cancelar': 'Cancel', 'Aceptar': 'Accept', 'Continuar': 'Continue',
    'Pronóstico de hoy': "Today's forecast", 'Sugeridos': 'Suggested for you', 'Por Categoría': 'Browse by category', 'Encuentra lo que necesitas': 'Find what you need',
    'Mercado': 'Marketplace', 'Eventos': 'Events', 'Negocios': 'Businesses', 'Favoritos': 'Favorites', 'Ver más': 'See more', 'Ver todos': 'See all',
    'Cargando…': 'Loading…', 'Cargando': 'Loading', 'No hay resultados': 'No results', 'Intenta otra búsqueda': 'Try another search', 'Volver': 'Back',
    'Nueva nota': 'New note', 'Recordatorios': 'Reminders', 'Calendario': 'Calendar', 'Temporizador': 'Timer', 'Cronómetro': 'Stopwatch', 'Alarmas': 'Alarms',
    'Notas rápidas': 'Quick Notes', 'Más usados': 'Most used', 'Próximamente': 'Coming soon', 'Pregunta del día': 'Question of the day', 'Patrocinadores': 'Sponsors',
    'Sin eventos para este día': 'No events for this day', 'Agenda': 'Schedule', 'Nombre del evento': 'Event name', 'Nuevo evento': 'New event', 'Nuevo recordatorio': 'New reminder',
    'Notas': 'Notes', 'Buscar un lugar, servicio o lo que necesitas': 'Search for a place, service, or anything you need', 'O escribe lo que necesitas': 'Or type what you need',
  },

};

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
  const pending = new Map<string, { node: Node; attribute?: string }[]>();
  const translationCache = new Map<string, string>();
  try {
    const saved = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}') as Record<string, string>;
    Object.entries(saved).forEach(([key, value]) => { if (typeof value === 'string') translationCache.set(key, value); });
  } catch { /* Missing translation cache is fine. */ }
  let translationTimer: number | undefined;
  let translating = false;
  let disposed = false;
  const cacheKey = (source: string, targetLanguage = language) => `${targetLanguage}\u0000${source}`;
  const lookupTranslation = (source: string) => translations[language]?.[source.replace(/\s+/g, ' ').trim()] || translationCache.get(cacheKey(source));
  const isAlreadyInTargetLanguage = (source: string, targetLanguage: AppLanguage) => {
    const normalized = source.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (targetLanguage === 'es') {
      if (Object.keys(translations.en).some((key) => key.toLocaleLowerCase() === normalized)) return true;
      return /[áéíóúñ¿¡]/i.test(source) || /\b(el|la|los|las|de|del|que|y|en|para|con|una|uno|por|como|tu|tus|sus|es|no|más|aquí|este|esta)\b/i.test(source);
    }
    if (Object.values(translations.en).some((value) => value.toLocaleLowerCase() === normalized)) return true;
    return /\b(the|and|for|with|from|your|you|this|that|are|was|were|what|where|when|how|please|click|tap|save|close|cancel|settings|search|home|profile)\b/i.test(source);
  };
  const needsTranslation = (source: string, targetLanguage: AppLanguage) => !isAlreadyInTargetLanguage(source, targetLanguage);
  const scheduleTranslation = () => {
    if (translationTimer !== undefined || translating || !pending.size || disposed) return;
    translationTimer = window.setTimeout(() => { translationTimer = undefined; void translatePending(); }, 280);
  };
  const queueTranslation = (source: string, node: Node, attribute?: string) => {
    if (!source.trim() || source.length > 300 || !/[\p{L}]{2}/u.test(source)) return;
    const key = cacheKey(source);
    if (translationCache.has(key)) return;
    const entries = pending.get(source) || [];
    if (!entries.some((entry) => entry.node === node && entry.attribute === attribute)) entries.push({ node, attribute });
    pending.set(source, entries);
    scheduleTranslation();
  };
  const translatePending = async () => {
    if (translating || disposed || !pending.size || language === 'es') return;
    const targetLanguage = language;
    translating = true;
    const batch = [...pending.entries()].slice(0, 32);
    batch.forEach(([source]) => pending.delete(source));
    try {
      const translationsForBatch: (string | null)[] = new Array(batch.length).fill(null);
      let nextIndex = 0;
      const workers = Array.from({ length: Math.min(4, batch.length) }, async () => {
        while (nextIndex < batch.length) {
          const index = nextIndex++;
          const [source] = batch[index];
          try {
            const url = new URL('https://api.mymemory.translated.net/get');
            url.searchParams.set('q', source);
            url.searchParams.set('langpair', `autodetect|${targetLanguage}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
            if (!response.ok) continue;
            const result = await response.json() as { responseStatus?: number; responseData?: { translatedText?: string } };
            const translated = result.responseData?.translatedText;
            if (result.responseStatus === 200 && typeof translated === 'string' && translated.trim()) translationsForBatch[index] = translated;
          } catch { /* Keep the source text if the free translator is offline or rate limited. */ }
        }
      });
      await Promise.all(workers);
      batch.forEach(([source, entries], index) => {
        const translated = translationsForBatch[index];
        if (typeof translated !== 'string' || !translated.trim()) return;
        translationCache.set(cacheKey(source, targetLanguage), translated);
        if (language !== targetLanguage) return;
        entries.forEach(({ node, attribute }) => {
          if (!node.isConnected) return;
          if (attribute && node instanceof Element) {
            const current = node.getAttribute(attribute);
            const entryMap = attributeEntries.get(node);
            const previous = entryMap?.get(attribute);
            if (current !== source && current !== previous?.target) return;
            let entriesByAttribute = entryMap;
            if (!entriesByAttribute) { entriesByAttribute = new Map(); attributeEntries.set(node, entriesByAttribute); }
            entriesByAttribute.set(attribute, { source, target: translated });
            if (current !== translated) node.setAttribute(attribute, translated);
          } else if (!attribute && node.nodeType === Node.TEXT_NODE) {
            const current = node.nodeValue;
            const previous = textEntries.get(node);
            if (current !== source && current !== previous?.target) return;
            textEntries.set(node, { source, target: translated });
            if (current !== translated) node.nodeValue = translated;
          }
        });
      });
      try { localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries([...translationCache.entries()].slice(-1600)))); } catch { /* Cache is an optimization. */ }
    } catch (error) {
      console.warn('Some interface text could not be translated.', error);
    } finally {
      translating = false;
      scheduleTranslation();
    }
  };
  const applyTextNode = (node: Node) => {
    const current = node.nodeValue;
    if (current === null) return;
    const previous = textEntries.get(node);
    const source = previous && current === previous.target ? previous.source : current;
    const target = language === 'es' ? source : lookupTranslation(source) || source;
    textEntries.set(node, { source, target });
    if (current !== target) node.nodeValue = target;
    if (target === source && needsTranslation(source, language)) queueTranslation(source, node);
  };
  const applyAttribute = (element: Element, attribute: string) => {
    const current = element.getAttribute(attribute);
    if (current === null) return;
    let entries = attributeEntries.get(element);
    if (!entries) { entries = new Map(); attributeEntries.set(element, entries); }
    const previous = entries.get(attribute);
    const source = previous && current === previous.target ? previous.source : current;
    const target = language === 'es' ? source : lookupTranslation(source) || source;
    entries.set(attribute, { source, target });
    if (current !== target) element.setAttribute(attribute, target);
    if (target === source && needsTranslation(source, language)) queueTranslation(source, element, attribute);
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
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
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
    disposed = true;
    if (translationTimer !== undefined) window.clearTimeout(translationTimer);
    observer.disconnect();
    window.removeEventListener('puntonochi-language-changed', handleLanguageChange);
    window.removeEventListener('languagechange', handleBrowserLanguageChange);
  };
}
