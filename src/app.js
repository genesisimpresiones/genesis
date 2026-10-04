import { loadCatalog, prefetchCatalogPage } from './catalog.js';
import { t } from './i18n.js';

const state = {
  items: [],
  page: 1,
  totalPages: 5,
  pageSize: 20,
  isLoading: true,
  requestId: 0,
  activeSlides: new Map(),
};

const grid = document.querySelector('[data-catalog]');
const search = document.querySelector('[data-search]');
const searchForm = document.querySelector('[data-search-form]');
const count = document.querySelector('[data-count]');
const status = document.querySelector('[data-status]');
const pagination = document.querySelector('[data-pagination]');
const whatsappLinks = document.querySelectorAll('[data-whatsapp]');

const WHATSAPP_NUMBER = window.GENESIS_WHATSAPP_NUMBER ?? '5491112345678';
const WHATSAPP_ICON = `
  <svg class="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12.04 4.02a7.9 7.9 0 0 0-6.78 11.96l-.78 3.5 3.58-.74a7.91 7.91 0 0 0 3.98 1.08 7.9 7.9 0 1 0 0-15.8Zm0 1.56a6.34 6.34 0 0 1 5.33 9.76 6.35 6.35 0 0 1-8.78 1.82l-.28-.18-1.72.36.38-1.68-.2-.3a6.34 6.34 0 0 1 5.27-9.78Zm-2.5 3.2c-.15 0-.4.06-.62.3-.21.24-.82.8-.82 1.95 0 1.15.84 2.26.96 2.42.12.16 1.62 2.6 4.03 3.54 2 .78 2.41.62 2.84.58.43-.04 1.4-.57 1.6-1.12.2-.55.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28-.24-.12-1.4-.7-1.62-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46Z"/>
  </svg>`;

function updateWhatsappLinks() {
  for (const link of whatsappLinks) {
    link.href = whatsappUrl(t('whatsappGeneric'));
    decorateWhatsappLink(link);
  }
}

// Sello de creacion: contacto de servicios de desarrollo (URL en config.js).
function updateDevContactLinks() {
  const devContactUrl = window.GENESIS_DEV_CONTACT_URL;
  if (!devContactUrl) return;
  for (const link of document.querySelectorAll('[data-dev-contact]')) {
    link.href = devContactUrl;
  }
}
updateDevContactLinks();

async function refresh(query = '', page = 1) {
  const requestId = ++state.requestId;
  setLoading(true, query ? t('searching', { query }) : t('loadingCatalog'));
  status.textContent = query ? t('searching', { query }) : t('catalogStatus');
  const result = await loadCatalog(query, page);
  if (requestId !== state.requestId) return;
  state.items = result.items;
  state.page = result.page;
  state.totalPages = result.totalPages;
  state.pageSize = result.pageSize ?? 20;
  state.activeSlides.clear();
  setLoading(false);
  render();
  prefetchCatalogPage(query, page + 1);
}

function render() {
  count.textContent = t('models', { count: state.items.length });
  grid.innerHTML = state.items.map(renderCard).join('');
  pagination.innerHTML = renderPagination();
  if (state.items.length === 0) {
    grid.innerHTML = `<p class="empty">${escapeHtml(t('noResults'))}</p>`;
  }
}

function renderPagination() {
  const previous = state.page > 1 ? `<button data-page="${state.page - 1}" aria-label="${escapeHtml(t('previousPage'))}">‹</button>` : '';
  const next = state.page < state.totalPages ? `<button data-page="${state.page + 1}" aria-label="${escapeHtml(t('nextPage'))}">›</button>` : '';
  const pages = Array.from({ length: state.totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="${page === state.page ? 'active' : ''}" data-page="${page}" aria-current="${page === state.page ? 'page' : 'false'}">${page}</button>`;
  }).join('');
  return `${previous}${pages}${next}`;
}

function renderCard(item, index) {
  const slide = state.activeSlides.get(item.id) ?? 0;
  const slides = item.slides?.length ? item.slides : [item.cover];
  const visual = slides[slide % slides.length];
  const displayRank = (state.page - 1) * state.pageSize + index + 1;
  const hasRemoteImage = typeof visual === 'string' && /^https?:\/\//.test(visual);
  const image = hasRemoteImage
    ? `<img src="${escapeHtml(visual)}" alt="${escapeHtml(item.title)}" loading="lazy">`
    : renderPrintVisual(String(visual), item.title);

  return `
    <article class="model-card">
      <div class="model-media" data-tone="${toneFor(item.rank)}">
        ${image}
        <span class="rank">#${displayRank}</span>
        <div class="slide-controls" aria-label="Imagenes de ${escapeHtml(item.title)}">
          ${slides
            .map(
              (_, index) =>
                `<button class="${index === slide ? 'active' : ''}" data-slide="${index}" data-id="${escapeHtml(
                  item.id,
                )}" aria-label="Ver imagen ${index + 1}"></button>`,
            )
            .join('')}
        </div>
      </div>
      <div class="model-body">
        <div class="model-kicker">
          <span>${escapeHtml(item.category)}</span>
          <span>ID ${escapeHtml(item.id)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.creator ? `<p class="creator">${escapeHtml(t('creator', { name: item.creator }))}</p>` : ''}
        <p>${escapeHtml(item.description)}</p>
        <div class="model-footer">
          <span>${formatNumber(item.likes)} ${escapeHtml(t('likes'))}</span>
          <span>${formatNumber(item.downloads)} ${escapeHtml(t('requests'))}</span>
        </div>
        <div class="model-reference">
          <button data-copy-id="${escapeHtml(item.id)}" type="button">${escapeHtml(t('copyId'))}</button>
          ${
            item.sourceUrl
              ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('source'))}</a>`
              : `<span>${escapeHtml(t('localReference'))}</span>`
          }
        </div>
        <a class="card-whatsapp" href="${whatsappUrl(
          t('whatsappModel', {
            title: item.title,
            id: item.id,
            category: item.category,
            creator: item.creator ? `\n${t('creator', { name: item.creator })}` : '',
          }),
        )}" target="_blank" rel="noreferrer">${WHATSAPP_ICON}<span>${escapeHtml(t('consultModel'))}</span></a>
      </div>
    </article>
  `;
}

function renderPrintVisual(key, title) {
  const label = title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return `
    <div class="print-visual" aria-label="${escapeHtml(title)}">
      <span class="layer layer-a"></span>
      <span class="layer layer-b"></span>
      <span class="layer layer-c"></span>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(key.replace(/-/g, ' '))}</small>
    </div>
  `;
}

function toneFor(rank) {
  return ['gold', 'orange', 'graphite', 'white'][rank % 4];
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-AR').format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function setLoading(isLoading, message = '') {
  state.isLoading = isLoading;
  document.body.classList.toggle('is-loading', isLoading);
  document.querySelector('.catalog-section')?.classList.toggle('is-loading', isLoading);
  document.querySelector('.catalog-section')?.setAttribute('aria-busy', String(isLoading));
  if (isLoading) {
    status.textContent = message || t('loadingCatalog');
    if (state.items.length === 0) grid.innerHTML = renderSkeletonCards();
  }
}

function renderSkeletonCards() {
  return Array.from({ length: 8 }, () => '<article class="model-card skeleton-card" aria-hidden="true"><div class="model-media"></div><div class="model-body"><span></span><strong></strong><p></p><em></em></div></article>').join('');
}

function decorateWhatsappLink(link) {
  if (!(link instanceof HTMLAnchorElement)) return;
  const label = link.textContent.trim();
  link.innerHTML = `${WHATSAPP_ICON}<span>${escapeHtml(label)}</span>`;
}

let timer = 0;
search.addEventListener('input', () => {
  clearTimeout(timer);
  timer = window.setTimeout(() => refresh(search.value), 250);
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(timer);
  refresh(search.value);
});

document.querySelector('.catalog-section').addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.matches('[data-copy-id]')) {
    copyModelId(target);
    return;
  }
  if (target.matches('[data-slide]')) {
    state.activeSlides.set(target.dataset.id, Number(target.dataset.slide));
    render();
    return;
  }
  if (target.matches('[data-page]')) {
    refresh(search.value, Number(target.dataset.page));
    document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

refresh();
updateWhatsappLinks();
document.addEventListener('genesis:language', () => {
  updateWhatsappLinks();
  refresh(search.value);
});

async function copyModelId(target) {
  const id = target.dataset.copyId ?? '';
  try {
    await navigator.clipboard.writeText(id);
    target.textContent = t('copiedId');
    window.setTimeout(() => {
      target.textContent = t('copyId');
    }, 1400);
  } catch {
    target.textContent = id;
  }
}
