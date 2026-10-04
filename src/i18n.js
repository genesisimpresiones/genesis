const MESSAGES = {
  es: {
    catalog: 'Catalogo',
    whatsapp: 'WhatsApp',
    heroEyebrow: 'Genesis / Impresiones 3D',
    heroTitle: 'Elegí una idea.',
    heroTitleAccent: 'Nosotros le damos forma.',
    heroDescription: 'Explorá modelos de referencia, encontrá algo que te guste y enviá su ID a Genesis para cotizarlo.',
    viewCatalog: 'Ver catalogo',
    talkWhatsapp: 'Hablar por WhatsApp',
    inspiration: 'Inspiracion para tu proximo proyecto',
    catalogTitle: 'Catalogo de modelos',
    featuredReferences: '20 referencias destacadas',
    searchLabel: 'Buscar un modelo',
    searchPlaceholder: 'Ej: maceta, soporte celular, organizador',
    searchButton: 'Buscar',
    catalogStatus: 'Top 20 por likes y solicitudes',
    loadingCatalog: 'Cargando modelos del catalogo',
    searching: 'Buscando "{query}" en catalogo disponible',
    models: '{count} modelos',
    ownIdea: '¿Tenés una idea propia?',
    sendReference: 'Mandanos una imagen o referencia.',
    consultGenesis: 'Consultar con Genesis',
    quoteWhatsapp: 'Pedir cotizacion por WhatsApp',
    footerSpark: 'Donde una',
    footerIdea: 'idea',
    footerShape: 'encuentra forma, nace una',
    footerPiece: 'pieza única.',
    footerClose: 'Crear también es imaginar lo que todavía no existe.',
    sealTagline: 'Sistemas & apps a medida',
    creator: 'Creador: {name}',
    likes: 'me gusta',
    requests: 'solicitudes',
    copyId: 'Copiar ID',
    copiedId: 'ID copiado',
    source: 'Ver fuente',
    localReference: 'Referencia local',
    consultModel: 'Consultar este modelo',
    noResults: 'No encontramos ese modelo en los destacados. Probá otra palabra o consultanos por WhatsApp.',
    previousPage: 'Pagina anterior',
    nextPage: 'Pagina siguiente',
    whatsappGeneric: 'Hola Genesis, quiero consultar por un trabajo de impresion 3D del catalogo. Puedo pasarles el ID o una imagen de referencia.',
    whatsappModel: 'Hola Genesis, quiero consultar por este modelo del catalogo.\n\nModelo: {title}\nID: {id}\nCategoria: {category}{creator}\n\nTambien puedo enviar una imagen de referencia si hace falta.',
    languageLabel: 'Idioma',
  },
  en: {
    catalog: 'Catalog',
    whatsapp: 'WhatsApp',
    heroEyebrow: 'Genesis / 3D Printing',
    heroTitle: 'Choose an idea.',
    heroTitleAccent: 'We give it shape.',
    heroDescription: 'Explore reference models, find something you like, and send its ID to Genesis for a quote.',
    viewCatalog: 'View catalog',
    talkWhatsapp: 'Talk on WhatsApp',
    inspiration: 'Inspiration for your next project',
    catalogTitle: 'Model catalog',
    featuredReferences: '20 featured references',
    searchLabel: 'Search a model',
    searchPlaceholder: 'Ex: planter, phone stand, organizer',
    searchButton: 'Search',
    catalogStatus: 'Top 20 by likes and requests',
    loadingCatalog: 'Loading catalog models',
    searching: 'Searching for "{query}" in the catalog',
    models: '{count} models',
    ownIdea: 'Have your own idea?',
    sendReference: 'Send us an image or reference.',
    consultGenesis: 'Talk to Genesis',
    quoteWhatsapp: 'Request a quote on WhatsApp',
    footerSpark: 'Where an',
    footerIdea: 'idea',
    footerShape: 'finds its shape, a',
    footerPiece: 'one-of-a-kind piece.',
    footerClose: 'Creating is also imagining what does not exist yet.',
    sealTagline: 'Custom systems & apps',
    creator: 'Creator: {name}',
    likes: 'likes',
    requests: 'requests',
    copyId: 'Copy ID',
    copiedId: 'ID copied',
    source: 'View source',
    localReference: 'Local reference',
    consultModel: 'Ask about this model',
    noResults: 'We could not find that model among the featured ones. Try another word or ask us on WhatsApp.',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    whatsappGeneric: 'Hello Genesis, I would like to ask about a 3D printing job from the catalog. I can send the ID or a reference image.',
    whatsappModel: 'Hello Genesis, I would like to ask about this catalog model.\n\nModel: {title}\nID: {id}\nCategory: {category}{creator}\n\nI can also send a reference image if needed.',
    languageLabel: 'Language',
  },
};

let currentLanguage = readLanguage();

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'es';
  localStorage.setItem('genesis-lang', currentLanguage);
  document.documentElement.lang = currentLanguage;
  applyTranslations();
  document.dispatchEvent(new CustomEvent('genesis:language', { detail: currentLanguage }));
}

export function t(key, values = {}) {
  const template = MESSAGES[currentLanguage][key] ?? MESSAGES.es[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

export function applyTranslations() {
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-lang]')) {
    node.classList.toggle('active', node.dataset.lang === currentLanguage);
    node.setAttribute('aria-pressed', String(node.dataset.lang === currentLanguage));
  }
}

function readLanguage() {
  return localStorage.getItem('genesis-lang') === 'en' ? 'en' : 'es';
}

document.documentElement.lang = currentLanguage;
document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.lang));
});
applyTranslations();
