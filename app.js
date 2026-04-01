/* ============================================================
   COLOR HUNT — App Logic v3
   IndexedDB for photos (no more lost data on reload),
   all settings & weeks in localStorage,
   stats always accurate, BG attachment toggle
   ============================================================ */

// ─────────────────────────────────────────────────
// IndexedDB  (photos live here — unlimited storage)
// ─────────────────────────────────────────────────
const IDB_NAME    = 'colorhunt_photos_db';
const IDB_VERSION = 1;
const IDB_STORE   = 'photos';
let   idb         = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { idb = e.target.result; resolve(idb); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbPut(photo) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(photo);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

function idbClear() {
  return new Promise((resolve, reject) => {
    const tx  = idb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ─────────────────────────────────────────────────
// State  (weeks & settings only — photos are in IDB)
// ─────────────────────────────────────────────────
const LS_KEY = 'colorhunt_meta_v3';

let state = {
  weeks: [],
  settings: {
    accent:       '#c8ff00',
    bgImage:      null,
    bgOverlay:    70,
    bgSize:       'cover',
    bgPosition:   'center',
    bgAttachment: 'fixed',
    heroFont:     'Space Grotesk',
  },
};

// photos array is kept in memory, sourced from IDB
let photos = [];

function saveMeta() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    weeks:    state.weeks,
    settings: state.settings,
  }));
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed     = JSON.parse(raw);
      state.weeks      = parsed.weeks    || [];
      state.settings   = { ...state.settings, ...(parsed.settings || {}) };
    }
  } catch (_) { /* use defaults */ }
}

// ─────────────────────────────────────────────────
// DOM refs
// ─────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const cursorDot         = $('cursorDot');
const cursorRing        = $('cursorRing');
const siteHeader        = $('siteHeader');
const heroColorWord     = $('heroColorWord');
const statPhotos        = $('statPhotos');
const statWeeks         = $('statWeeks');
const statColors        = $('statColors');
const statHunters       = $('statHunters');
const filterBar         = $('filterBar');
const galleryGrid       = $('galleryGrid');
const galleryEmpty      = $('galleryEmpty');
const weeksTimeline     = $('weeksTimeline');

// Upload Modal
const uploadModal       = $('uploadModal');
const uploadForm        = $('uploadForm');
const dropZone          = $('dropZone');
const fileInput         = $('fileInput');
const browseBtn         = $('browseBtn');
const previewGrid       = $('previewGrid');
const weekSelect        = $('weekSelect');
const uploaderName      = $('uploaderName');
const photoCaption      = $('photoCaption');

// Add/Edit Week Modal
const weeksModal        = $('weeksModal');
const weekForm          = $('weekForm');
const weekName          = $('weekName');
const weekColor         = $('weekColor');
const weekHex           = $('weekHex');
const weekHexPicker     = $('weekHexPicker');
const weekDate          = $('weekDate');
const editingWeekId     = $('editingWeekId');
const weekModalTitle    = $('weekModalTitle');
const weekModalSubtitle = $('weekModalSubtitle');
const weekSubmitLabel   = $('weekSubmitLabel');
const weekPreviewSwatch = $('weekPreviewSwatch');
const weekPreviewName   = $('weekPreviewName');
const weekPreviewTheme  = $('weekPreviewTheme');

// Settings Panel
const settingsPanel       = $('settingsPanel');
const settingsOverlay     = $('settingsOverlay');
const openSettingsBtn     = $('openSettingsBtn');
const closeSettingsBtn    = $('closeSettingsBtn');
const bgFileInput         = $('bgFileInput');
const bgUploadBtn         = $('bgUploadBtn');
const bgRemoveBtn         = $('bgRemoveBtn');
const bgPreview           = $('bgPreview');
const bgPreviewText       = $('bgPreviewText');
const bgOverlayRange      = $('bgOverlay');
const bgOverlayVal        = $('bgOverlayVal');
const bgSizeSelect        = $('bgSizeSelect');
const bgPositionSelect    = $('bgPositionSelect');
const bgAttachmentSelect  = $('bgAttachmentSelect');
const accentPicker        = $('accentPicker');
const accentHex           = $('accentHex');
const weeksManagerList    = $('weeksManagerList');
const addWeekSettingsBtn  = $('addWeekSettingsBtn');
const clearAllPhotosBtn   = $('clearAllPhotosBtn');
const clearAllWeeksBtn    = $('clearAllWeeksBtn');

// Lightbox
const lightboxOverlay = $('lightboxOverlay');
const lbImage         = $('lbImage');
const lbWeekBadge     = $('lbWeekBadge');
const lbCaption       = $('lbCaption');
const lbMeta          = $('lbMeta');
const lbClose         = $('lbClose');
const lbDelete        = $('lbDelete');
const lbPrev          = $('lbPrev');
const lbNext          = $('lbNext');
const lbCounter       = $('lbCounter');

// Confirm
const confirmModal  = $('confirmModal');
const confirmTitle  = $('confirmTitle');
const confirmMsg    = $('confirmMsg');
const confirmOk     = $('confirmOk');
const confirmCancel = $('confirmCancel');

const toast = $('toast');

// ─────────────────────────────────────────────────
// Custom Cursor
// ─────────────────────────────────────────────────
document.body.classList.add('custom-cursor');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top  = mouseY + 'px';
});
(function animateRing() {
  ringX += (mouseX - ringX) * 0.12;
  ringY += (mouseY - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top  = ringY + 'px';
  requestAnimationFrame(animateRing);
})();

function addHover(el) {
  if (!el) return;
  el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
}
document.querySelectorAll('a, button').forEach(addHover);

// ─────────────────────────────────────────────────
// Scroll Header
// ─────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ─────────────────────────────────────────────────
// Hero Color Word Cycling
// ─────────────────────────────────────────────────
const colorWords = [
  { text: 'Red',    color: '#ff4444' },
  { text: 'Blue',   color: '#4488ff' },
  { text: 'Green',  color: '#44ff88' },
  { text: 'Yellow', color: '#ffee44' },
  { text: 'Purple', color: '#aa44ff' },
  { text: 'Orange', color: '#ff8844' },
  { text: 'Pink',   color: '#ff44aa' },
  { text: 'Cyan',   color: '#44ffee' },
];
let cwIdx = 0;
heroColorWord.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
setInterval(() => {
  cwIdx = (cwIdx + 1) % colorWords.length;
  heroColorWord.style.opacity   = '0';
  heroColorWord.style.transform = 'translateY(10px)';
  setTimeout(() => {
    const cw = colorWords[cwIdx];
    heroColorWord.textContent = cw.text;
    heroColorWord.style.background = `linear-gradient(135deg, ${cw.color} 0%, #fff 60%, ${cw.color} 100%)`;
    heroColorWord.style.backgroundClip        = 'text';
    heroColorWord.style.webkitBackgroundClip  = 'text';
    heroColorWord.style.webkitTextFillColor   = 'transparent';
    heroColorWord.style.backgroundSize        = '200% auto';
    heroColorWord.style.opacity               = '1';
    heroColorWord.style.transform             = 'translateY(0)';
  }, 300);
}, 2500);

// ─────────────────────────────────────────────────
// Parallax Orbs
// ─────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  document.querySelectorAll('.orb').forEach((orb, i) => {
    orb.style.transform = `translateY(${y * [0.04, 0.06, 0.03][i]}px)`;
  });
}, { passive: true });

// ─────────────────────────────────────────────────
// Animated Counters
// ─────────────────────────────────────────────────
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function animateCounter(el, target, dur = 900) {
  const start = performance.now();
  const from  = parseInt(el.textContent) || 0;
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(from + easeOutCubic(p) * (target - from));
    if (p < 1) requestAnimationFrame(step);
  })(start);
}
function updateStats() {
  const hunterSet = new Set(photos.map(p => (p.uploader || 'Anonymous').trim().toLowerCase()));
  animateCounter(statPhotos,  photos.length);
  animateCounter(statWeeks,   state.weeks.length);
  animateCounter(statColors,  state.weeks.length);
  animateCounter(statHunters, hunterSet.size);
}

// ─────────────────────────────────────────────────
// Scroll Reveal
// ─────────────────────────────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

function addReveal(el, delay = 0) {
  el.classList.add('reveal');
  if (delay) el.classList.add(`reveal-delay-${delay}`);
  revealObs.observe(el);
}

// ─────────────────────────────────────────────────
// Accent Color
// ─────────────────────────────────────────────────
function applyAccent(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
  state.settings.accent = hex;
  document.documentElement.style.setProperty('--accent', hex);
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
  document.querySelectorAll('.accent-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color.toLowerCase() === hex.toLowerCase());
  });
  accentPicker.value = hex;
  accentHex.value    = hex;
}

accentPicker.addEventListener('input', () => {
  applyAccent(accentPicker.value); saveMeta();
});
accentHex.addEventListener('input', () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(accentHex.value)) { applyAccent(accentHex.value); saveMeta(); }
});
document.querySelectorAll('.accent-swatch').forEach(sw => {
  sw.addEventListener('click', () => { applyAccent(sw.dataset.color); saveMeta(); });
});

// ─────────────────────────────────────────────────
// Hero Font
// ─────────────────────────────────────────────────
const HERO_FONTS = [
  { name: 'Space Grotesk',    family: "'Space Grotesk', sans-serif",    tag: 'Default',    preview: 'Hunt',   letterSpacing: '-3px'  },
  { name: 'Bebas Neue',       family: "'Bebas Neue', sans-serif",       tag: 'Condensed',  preview: 'HUNT',   letterSpacing: '2px'  },
  { name: 'Playfair Display', family: "'Playfair Display', serif",      tag: 'Editorial',  preview: 'Hunt',   letterSpacing: '-2px'  },
  { name: 'Anton',            family: "'Anton', sans-serif",            tag: 'Impact',     preview: 'HUNT',   letterSpacing: '1px'  },
  { name: 'Syne',             family: "'Syne', sans-serif",             tag: 'Modern',     preview: 'Hunt',   letterSpacing: '-2px'  },
  { name: 'Fraunces',         family: "'Fraunces', serif",              tag: 'Quirky',     preview: 'Hunt',   letterSpacing: '-2px'  },
  { name: 'Orbitron',         family: "'Orbitron', sans-serif",         tag: 'Futuristic', preview: 'HUNT',   letterSpacing: '2px'  },
  { name: 'Abril Fatface',    family: "'Abril Fatface', serif",         tag: 'Display',    preview: 'Hunt',   letterSpacing: '-1px'  },
  { name: 'Righteous',        family: "'Righteous', sans-serif",        tag: 'Retro',      preview: 'Hunt',   letterSpacing: '1px'  },
];

function applyHeroFont(fontName) {
  const font = HERO_FONTS.find(f => f.name === fontName) || HERO_FONTS[0];
  state.settings.heroFont = font.name;
  document.documentElement.style.setProperty('--font-hero', font.family);
  // Adjust letter-spacing to suit each font's natural fit
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) heroTitle.style.letterSpacing = font.letterSpacing;
  // Update active state in picker
  document.querySelectorAll('.font-card').forEach(card => {
    card.classList.toggle('active', card.dataset.font === font.name);
  });
}

function buildFontPicker() {
  const grid = document.getElementById('fontPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';
  HERO_FONTS.forEach(font => {
    const card = document.createElement('button');
    card.className       = 'font-card';
    card.dataset.font    = font.name;
    card.title           = font.name;
    card.innerHTML = `
      <div class="font-card-preview" style="font-family:${font.family};letter-spacing:${font.letterSpacing}">${font.preview}</div>
      <span class="font-card-tag">${font.tag}</span>
      <div class="font-card-name">${font.name}</div>
    `;
    card.addEventListener('click', () => { applyHeroFont(font.name); saveMeta(); });
    addHover(card);
    grid.appendChild(card);
  });
  // Set initial active
  applyHeroFont(state.settings.heroFont || 'Space Grotesk');
}

function applyBg() {
  const s = state.settings;
  if (s.bgImage) {
    document.body.classList.add('has-bg-image');
    document.body.style.backgroundImage    = `linear-gradient(rgba(0,0,0,${s.bgOverlay/100}), rgba(0,0,0,${s.bgOverlay/100})), url(${s.bgImage})`;
    document.body.style.backgroundSize     = s.bgSize;
    document.body.style.backgroundPosition = s.bgPosition;
    document.body.style.backgroundAttachment = s.bgAttachment;

    bgPreviewText.style.display = 'none';
    let previewImg = bgPreview.querySelector('img');
    if (!previewImg) {
      previewImg = document.createElement('img');
      bgPreview.appendChild(previewImg);
    }
    previewImg.src           = s.bgImage;
    previewImg.style.display = 'block';
  } else {
    document.body.classList.remove('has-bg-image');
    document.body.style.backgroundImage      = '';
    document.body.style.backgroundSize       = '';
    document.body.style.backgroundPosition   = '';
    document.body.style.backgroundAttachment = '';
    const img = bgPreview.querySelector('img');
    if (img) img.style.display = 'none';
    bgPreviewText.style.display = '';
  }
}

bgUploadBtn.addEventListener('click', () => bgFileInput.click());
bgFileInput.addEventListener('change', () => {
  const file = bgFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.settings.bgImage = e.target.result;
    applyBg(); saveMeta();
    showToast('✓ Background updated!', 'success');
  };
  reader.readAsDataURL(file);
});
bgRemoveBtn.addEventListener('click', () => {
  state.settings.bgImage = null;
  bgFileInput.value = '';
  applyBg(); saveMeta();
  showToast('Background removed', '');
});

bgOverlayRange.addEventListener('input', () => {
  state.settings.bgOverlay = +bgOverlayRange.value;
  bgOverlayVal.textContent = bgOverlayRange.value + '%';
  applyBg(); saveMeta();
});
bgSizeSelect.addEventListener('change', () => {
  state.settings.bgSize = bgSizeSelect.value; applyBg(); saveMeta();
});
bgPositionSelect.addEventListener('change', () => {
  state.settings.bgPosition = bgPositionSelect.value; applyBg(); saveMeta();
});
bgAttachmentSelect.addEventListener('change', () => {
  state.settings.bgAttachment = bgAttachmentSelect.value; applyBg(); saveMeta();
});

function syncBgControls() {
  const s = state.settings;
  bgOverlayRange.value       = s.bgOverlay;
  bgOverlayVal.textContent   = s.bgOverlay + '%';
  bgSizeSelect.value         = s.bgSize       || 'cover';
  bgPositionSelect.value     = s.bgPosition   || 'center';
  bgAttachmentSelect.value   = s.bgAttachment || 'fixed';
}

// ─────────────────────────────────────────────────
// Settings Panel
// ─────────────────────────────────────────────────
function openSettings() {
  settingsPanel.classList.add('open');
  settingsOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderWeeksManagerList();
}
function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
openSettingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);

// ─────────────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────────────
let confirmResolve = null;

function showConfirm(title, msg, okLabel = 'Delete') {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    confirmTitle.textContent = title;
    confirmMsg.textContent   = msg;
    confirmOk.textContent    = okLabel;
    confirmModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
}
confirmOk.addEventListener('click', () => {
  confirmModal.classList.remove('open');
  document.body.style.overflow = '';
  if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
});
confirmCancel.addEventListener('click', () => {
  confirmModal.classList.remove('open');
  document.body.style.overflow = '';
  if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
});

// ─────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────────
// Filter Bar
// ─────────────────────────────────────────────────
let activeFilter = 'all';

function rebuildFilterBar() {
  filterBar.querySelectorAll('[data-filter]:not([data-filter="all"])').forEach(b => b.remove());
  state.weeks.forEach(w => {
    const btn = document.createElement('button');
    btn.className          = 'filter-btn';
    btn.dataset.filter     = w.id;
    btn.innerHTML          = `<span class="color-dot" style="background:${w.hex}"></span>${escHtml(w.name)}`;
    btn.addEventListener('click', () => setFilter(w.id));
    addHover(btn);
    filterBar.appendChild(btn);
  });
  filterBar.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === activeFilter);
  });
}

function setFilter(filter) {
  activeFilter = filter;
  filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  applyFilter();
}
function applyFilter() {
  galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
    item.classList.toggle('hidden', activeFilter !== 'all' && item.dataset.week !== activeFilter);
  });
}
filterBar.querySelector('[data-filter="all"]').addEventListener('click', () => setFilter('all'));

// ─────────────────────────────────────────────────
// Week Select Dropdown (upload form)
// ─────────────────────────────────────────────────
function rebuildWeekSelect() {
  weekSelect.innerHTML = '<option value="" disabled selected>Select week…</option>';
  state.weeks.forEach(w => {
    const opt      = document.createElement('option');
    opt.value      = w.id;
    opt.textContent = `${w.name} — ${w.color}`;
    weekSelect.appendChild(opt);
  });
}

// ─────────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderGallery() {
  galleryGrid.querySelectorAll('.gallery-item').forEach(el => el.remove());

  if (photos.length === 0) {
    galleryEmpty.style.display = 'flex';
    return;
  }
  galleryEmpty.style.display = 'none';

  photos.forEach((photo, idx) => {
    const week = state.weeks.find(w => w.id === photo.weekId);
    const item = document.createElement('div');
    item.className      = 'gallery-item';
    item.dataset.week   = photo.weekId;
    item.dataset.photoid = photo.id;

    item.innerHTML = `
      <img src="${photo.src}" alt="${escHtml(photo.caption || 'Color Hunt photo')}" loading="lazy" />
      <div class="gallery-item-overlay">
        ${week ? `<span class="item-week-badge" style="background:${week.hex}">${escHtml(week.name)} · ${escHtml(week.color)}</span>` : ''}
        <p class="item-caption">${escHtml(photo.caption || '')}</p>
        <p class="item-author">${escHtml(photo.uploader || 'Anonymous')}</p>
      </div>
      <div class="item-actions">
        <button class="item-action-btn expand" title="View fullscreen">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button class="item-action-btn delete" title="Delete photo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;

    item.querySelector('.expand').addEventListener('click', (e) => { e.stopPropagation(); openLightbox(idx); });
    item.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deletePhoto(photo.id); });
    item.addEventListener('click', () => openLightbox(idx));
    [item, item.querySelector('.expand'), item.querySelector('.delete')].forEach(addHover);
    addReveal(item);
    galleryGrid.appendChild(item);
  });

  applyFilter();
  applyGalleryMode(); // apply active carousel mode after rebuild
}

// ─────────────────────────────────────────────────
// Gallery Display Modes
// ─────────────────────────────────────────────────
let galleryMode = localStorage.getItem('colorhunt_gallery_mode') || 'grid';
let galleryIdx  = 0;

const galleryCarouselNav   = $('galleryCarouselNav');
const galleryCarouselPrev  = $('galleryCarouselPrev');
const galleryCarouselNext  = $('galleryCarouselNext');
const galleryCarouselCount = $('galleryCarouselCount');
const galleryInfoBar       = $('galleryInfoBar');
const gibBadge             = $('gibBadge');
const gibCaption           = $('gibCaption');
const gibMeta              = $('gibMeta');

function getVisibleGalleryItems() {
  return Array.from(galleryGrid.querySelectorAll('.gallery-item:not(.hidden)'));
}

function setGalleryMode(mode) {
  galleryMode = mode;
  galleryIdx  = 0;
  localStorage.setItem('colorhunt_gallery_mode', mode);
  document.querySelectorAll('.gm-btn').forEach(b => b.classList.toggle('active', b.dataset.gm === mode));
  applyGalleryMode();
}

function applyGalleryMode() {
  const items = getVisibleGalleryItems();
  const isGrid = galleryMode === 'grid';

  // Reset classes
  galleryGrid.className = 'gallery-grid' + (isGrid ? '' : ' gm-' + galleryMode);

  // Show/hide carousel nav & info bar
  galleryCarouselNav.classList.toggle('visible', !isGrid);
  galleryInfoBar.classList.toggle('visible', !isGrid && items.length > 0);

  if (isGrid) {
    items.forEach(item => {
      item.style.transform = '';
      item.style.opacity   = '';
      item.style.zIndex    = '';
      item.style.left      = '';
      item.style.display   = '';
    });
    return;
  }

  if (galleryIdx >= items.length) galleryIdx = Math.max(0, items.length - 1);
  galleryCarouselCount.textContent = `${galleryIdx + 1} / ${items.length}`;

  if (galleryMode === 'coverflow') applyCoverflow(items);
  else if (galleryMode === 'stack') applyStack(items);
  else if (galleryMode === 'reel')  applyReel(items);

  updateGalleryInfoBar(items);
}

function applyCoverflow(items) {
  items.forEach((item, i) => {
    const offset = i - galleryIdx;
    const absOff = Math.abs(offset);

    if (absOff > 5) { item.style.display = 'none'; return; }
    item.style.display = '';

    const sign    = Math.sign(offset) || 0;
    const rotY    = sign * Math.min(absOff * 48, 72);   // max 72deg
    const tx      = offset * 200;                        // horizontal spread
    const scale   = Math.max(0.55, 1 - absOff * 0.14);
    const opacity = Math.max(0.2, 1 - absOff * 0.28);
    const z       = 200 - absOff * 50;

    item.style.transform = `translateX(${tx}px) rotateY(${rotY}deg) scale(${scale})`;
    item.style.opacity   = opacity;
    item.style.zIndex    = z;
    item.classList.toggle('cf-active', offset === 0);
  });
}

function applyStack(items) {
  items.forEach((item, i) => {
    const offset = i - galleryIdx;
    if (offset < 0 || offset > 3) { item.style.display = 'none'; return; }
    item.style.display = '';

    const rot   = (offset % 2 === 0 ? 1 : -1) * offset * 3;
    const ty    = -offset * 8;
    const scale = 1 - offset * 0.04;
    const z     = 100 - offset;

    item.style.transform = `rotate(${rot}deg) translateY(${ty}px) scale(${scale})`;
    item.style.opacity   = offset === 0 ? 1 : 0.75 - offset * 0.15;
    item.style.zIndex    = z;
    item.classList.toggle('stack-top', offset === 0);
  });
}

function applyReel(items) {
  items.forEach((item, i) => {
    item.style.display   = '';
    item.style.transform = '';
    item.style.opacity   = '';
    item.style.zIndex    = '';
    item.classList.toggle('reel-active', i === galleryIdx);
  });
  // Scroll active into view
  if (items[galleryIdx]) {
    items[galleryIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function updateGalleryInfoBar(items) {
  const item  = items[galleryIdx];
  if (!item) return;
  const pid   = item.dataset.photoid;
  const photo = photos.find(p => p.id === pid);
  if (!photo) return;
  const week  = state.weeks.find(w => w.id === photo.weekId);

  if (week) {
    gibBadge.style.display    = '';
    gibBadge.style.background = week.hex;
    gibBadge.textContent      = `${week.name} · ${week.color}`;
  } else {
    gibBadge.style.display = 'none';
  }
  gibCaption.textContent = photo.caption || 'Untitled';
  gibMeta.textContent    = `by ${photo.uploader || 'Anonymous'} · ${new Date(photo.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
}

// Mode switcher buttons
document.querySelectorAll('.gm-btn').forEach(btn => {
  btn.addEventListener('click', () => setGalleryMode(btn.dataset.gm));
  addHover(btn);
});

// Carousel prev/next
galleryCarouselPrev.addEventListener('click', () => {
  const items = getVisibleGalleryItems();
  galleryIdx = (galleryIdx - 1 + items.length) % items.length;
  applyGalleryMode();
});
galleryCarouselNext.addEventListener('click', () => {
  const items = getVisibleGalleryItems();
  galleryIdx = (galleryIdx + 1) % items.length;
  applyGalleryMode();
});

// Keyboard arrow navigation (only when not in lightbox)
document.addEventListener('keydown', (e) => {
  if (lightboxOverlay.classList.contains('open')) return;
  if (galleryMode === 'grid') return;
  const items = getVisibleGalleryItems();
  if (e.key === 'ArrowLeft')  { galleryIdx = (galleryIdx - 1 + items.length) % items.length; applyGalleryMode(); }
  if (e.key === 'ArrowRight') { galleryIdx = (galleryIdx + 1) % items.length; applyGalleryMode(); }
});

// Click on coverflow side items = navigate to them; click center = open lightbox
galleryGrid.addEventListener('click', (e) => {
  if (galleryMode === 'grid') return;
  const item  = e.target.closest('.gallery-item');
  if (!item) return;
  const items = getVisibleGalleryItems();
  const i     = items.indexOf(item);
  if (i === -1) return;
  if (galleryMode === 'reel' || i === galleryIdx) {
    // Open lightbox for active card
    openLightbox(photos.findIndex(p => p.id === item.dataset.photoid));
  } else {
    galleryIdx = i;
    applyGalleryMode();
  }
  e.stopPropagation();
});

// ─────────────────────────────────────────────────
// Delete Photo

// ─────────────────────────────────────────────────
async function deletePhoto(photoId) {
  const yes = await showConfirm('Delete Photo?', 'This photo will be permanently removed from the gallery.', 'Delete');
  if (!yes) return;
  await idbDelete(photoId);
  photos = photos.filter(p => p.id !== photoId);
  if (lightboxOverlay.classList.contains('open')) closeLightbox();
  renderGallery();
  renderWeeksManagerList_soft();
  updateStats();
  showToast('Photo deleted', '');
}

// ─────────────────────────────────────────────────
// Lightbox — 4 Styles
// ─────────────────────────────────────────────────
let lbIdx   = 0;
let lbStyle = localStorage.getItem('colorhunt_lbstyle') || 'immersive';

const LB_STYLES = ['immersive', 'magazine', 'cinema', 'framed'];

function applyLbStyle(style) {
  lbStyle = style;
  localStorage.setItem('colorhunt_lbstyle', style);
  LB_STYLES.forEach(s => lightboxOverlay.classList.remove('lb-' + s));
  lightboxOverlay.classList.add('lb-' + style);
  document.querySelectorAll('.lb-sp-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lbs === style);
  });
}

// Wire style picker buttons
document.querySelectorAll('.lb-sp-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLbStyle(btn.dataset.lbs));
  addHover(btn);
});

function openLightbox(idx) {
  lbIdx = idx;
  applyLbStyle(lbStyle); // restore saved style
  showLightboxPhoto();
  lightboxOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightboxOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function showLightboxPhoto() {
  if (photos.length === 0) { closeLightbox(); return; }
  lbIdx = Math.max(0, Math.min(lbIdx, photos.length - 1));
  const photo = photos[lbIdx];
  const week  = state.weeks.find(w => w.id === photo.weekId);

  lbImage.src = photo.src;
  lbImage.alt = photo.caption || '';
  lbCaption.textContent = photo.caption || 'Untitled';
  lbMeta.textContent    = `by ${photo.uploader || 'Anonymous'} · ${new Date(photo.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  lbCounter.textContent = `${lbIdx + 1} / ${photos.length}`;

  // Inject week color as CSS var for Magazine accent bar + Framed border
  const hex = week ? week.hex : 'var(--accent)';
  const rgb = week ? hexToRgb(week.hex) : '200,255,0';
  lightboxOverlay.style.setProperty('--lb-color', hex);
  lightboxOverlay.style.setProperty('--lb-glow', `rgba(${rgb},0.12)`);

  if (week) {
    lbWeekBadge.style.display    = 'inline-flex';
    lbWeekBadge.style.background = week.hex;
    lbWeekBadge.textContent      = `${week.name} · ${week.color}`;
  } else {
    lbWeekBadge.style.display = 'none';
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

$('lbClose').addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightbox(); });
$('lbPrev').addEventListener('click', () => { lbIdx = (lbIdx - 1 + photos.length) % photos.length; showLightboxPhoto(); });
$('lbNext').addEventListener('click', () => { lbIdx = (lbIdx + 1) % photos.length; showLightboxPhoto(); });
$('lbDelete').addEventListener('click', () => { const p = photos[lbIdx]; if (p) deletePhoto(p.id); });

document.addEventListener('keydown', (e) => {
  if (!lightboxOverlay.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')  { lbIdx = (lbIdx - 1 + photos.length) % photos.length; showLightboxPhoto(); }
  if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % photos.length; showLightboxPhoto(); }
});

let lbTouchX = 0;
lightboxOverlay.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
lightboxOverlay.addEventListener('touchend', e => {
  const diff = lbTouchX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    lbIdx = diff > 0 ? (lbIdx + 1) % photos.length : (lbIdx - 1 + photos.length) % photos.length;
    showLightboxPhoto();
  }
});


// ─────────────────────────────────────────────────
// Weeks Timeline (main page)
// ─────────────────────────────────────────────────
function renderWeeks() {
  weeksTimeline.innerHTML = '';
  if (state.weeks.length === 0) {
    weeksTimeline.innerHTML = '<div class="weeks-empty"><p>No weeks yet. Use the <strong>＋</strong> button or Settings to add one.</p></div>';
    return;
  }
  state.weeks.forEach((w, i) => {
    const cnt  = photos.filter(p => p.weekId === w.id).length;
    const card = document.createElement('div');
    card.className  = 'week-card';
    card.style.borderTop = `3px solid ${w.hex}`;
    card.innerHTML = `
      <div class="week-card-count">${cnt} photo${cnt !== 1 ? 's' : ''}</div>
      <div class="week-card-color" style="background:${w.hex};box-shadow:0 0 20px ${w.hex}55"></div>
      <div class="week-card-label">Week ${i + 1}</div>
      <div class="week-card-name">${escHtml(w.name)}</div>
      <div class="week-card-theme">${escHtml(w.color)}</div>
      ${w.date ? `<div class="week-card-date">${escHtml(w.date)}</div>` : ''}
      <div class="week-card-actions">
        <button class="wk-action-btn edit" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="wk-action-btn del" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
    card.querySelector('.edit').addEventListener('click', (e) => { e.stopPropagation(); openEditWeek(w.id); });
    card.querySelector('.del').addEventListener('click',  (e) => { e.stopPropagation(); deleteWeek(w.id); });
    card.addEventListener('click', () => { setFilter(w.id); document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' }); });
    [card, card.querySelector('.edit'), card.querySelector('.del')].forEach(addHover);
    addReveal(card, Math.min((i % 3) + 1, 3));
    weeksTimeline.appendChild(card);
  });
}

// ─────────────────────────────────────────────────
// Weeks Manager List (Settings panel)
// ─────────────────────────────────────────────────
function renderWeeksManagerList() {
  weeksManagerList.innerHTML = '';
  if (state.weeks.length === 0) {
    weeksManagerList.innerHTML = '<p style="font-size:0.8rem;color:var(--text-dim);text-align:center;padding:12px 0">No weeks yet.</p>';
    return;
  }
  state.weeks.forEach(w => {
    const cnt  = photos.filter(p => p.weekId === w.id).length;
    const item = document.createElement('div');
    item.className    = 'wm-item';
    item.dataset.wid  = w.id;
    item.innerHTML = `
      <div class="wm-swatch" style="background:${w.hex};box-shadow:0 0 8px ${w.hex}66"></div>
      <div class="wm-info">
        <div class="wm-name">${escHtml(w.name)}</div>
        <div class="wm-theme">${escHtml(w.color)}</div>
      </div>
      <span class="wm-count">${cnt}</span>
      <div class="wm-actions">
        <button class="wm-btn edit" title="Edit">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="wm-btn del" title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
    item.querySelector('.edit').addEventListener('click', () => { closeSettings(); openEditWeek(w.id); });
    item.querySelector('.del').addEventListener('click',  () =>  deleteWeek(w.id));
    [item.querySelector('.edit'), item.querySelector('.del')].forEach(addHover);
    weeksManagerList.appendChild(item);
  });
}

function renderWeeksManagerList_soft() {
  weeksManagerList.querySelectorAll('.wm-item').forEach(item => {
    const cnt   = photos.filter(p => p.weekId === item.dataset.wid).length;
    const el    = item.querySelector('.wm-count');
    if (el) el.textContent = cnt;
  });
}

// ─────────────────────────────────────────────────
// Add / Edit Week Modal
// ─────────────────────────────────────────────────
function openAddWeek() {
  editingWeekId.value     = '';
  weekModalTitle.textContent    = 'Add New Week';
  weekModalSubtitle.textContent = 'Create a new color theme week';
  weekSubmitLabel.textContent   = 'Create Week';
  weekForm.reset();
  weekHexPicker.value = '#ff4444';
  weekHex.value       = '#ff4444';
  updateWeekPreview();
  weeksModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function openEditWeek(weekId) {
  const w = state.weeks.find(w => w.id === weekId);
  if (!w) return;
  editingWeekId.value           = weekId;
  weekModalTitle.textContent    = 'Edit Week';
  weekModalSubtitle.textContent = 'Update this color theme week';
  weekSubmitLabel.textContent   = 'Save Changes';
  weekName.value  = w.name;
  weekColor.value = w.color;
  weekHex.value   = w.hex;
  weekHexPicker.value = w.hex;
  weekDate.value  = w.date || '';
  updateWeekPreview();
  weeksModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeWeekModal() {
  weeksModal.classList.remove('open');
  document.body.style.overflow = '';
}

$('openWeeksBtn').addEventListener('click', openAddWeek);
addWeekSettingsBtn.addEventListener('click', () => { closeSettings(); openAddWeek(); });
$('closeWeeksBtn').addEventListener('click', closeWeekModal);
weeksModal.addEventListener('click', (e) => { if (e.target === weeksModal) closeWeekModal(); });

weekHexPicker.addEventListener('input', () => { weekHex.value = weekHexPicker.value; updateWeekPreview(); });
weekHex.addEventListener('input',       () => { if (/^#[0-9A-Fa-f]{6}$/.test(weekHex.value)) weekHexPicker.value = weekHex.value; updateWeekPreview(); });
weekName.addEventListener('input',  updateWeekPreview);
weekColor.addEventListener('input', updateWeekPreview);

function updateWeekPreview() {
  const hex   = weekHexPicker.value;
  weekPreviewSwatch.style.background = hex;
  weekPreviewSwatch.style.boxShadow  = `0 0 16px ${hex}66`;
  weekPreviewName.textContent  = weekName.value  || 'Week Name';
  weekPreviewTheme.textContent = weekColor.value || 'Color Theme';
  document.getElementById('weekPreviewCard').style.borderLeft = `3px solid ${hex}`;
}

weekForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const hex = /^#[0-9A-Fa-f]{6}$/.test(weekHex.value) ? weekHex.value : weekHexPicker.value;
  const wid = editingWeekId.value;
  if (wid) {
    const w = state.weeks.find(w => w.id === wid);
    if (w) { w.name = weekName.value.trim(); w.color = weekColor.value.trim(); w.hex = hex; w.date = weekDate.value.trim(); }
    showToast(`✓ "${weekName.value.trim()}" updated!`, 'success');
  } else {
    state.weeks.push({ id: 'week_' + Date.now(), name: weekName.value.trim(), color: weekColor.value.trim(), hex, date: weekDate.value.trim() });
    showToast(`✓ "${weekName.value.trim()}" created!`, 'success');
  }
  saveMeta(); rebuildAll(); closeWeekModal();
});

// ─────────────────────────────────────────────────
// Delete Week
// ─────────────────────────────────────────────────
async function deleteWeek(weekId) {
  const w   = state.weeks.find(w => w.id === weekId);
  if (!w) return;
  const cnt = photos.filter(p => p.weekId === weekId).length;
  const yes = await showConfirm(`Delete "${w.name}"?`, `This will permanently delete ${cnt} photo${cnt !== 1 ? 's' : ''} in this week.`, 'Delete Week');
  if (!yes) return;

  // Delete all photos in this week from IDB
  const weekPhotos = photos.filter(p => p.weekId === weekId);
  await Promise.all(weekPhotos.map(p => idbDelete(p.id)));

  state.weeks  = state.weeks.filter(wk => wk.id !== weekId);
  photos       = photos.filter(p  => p.weekId !== weekId);
  if (activeFilter === weekId) activeFilter = 'all';

  saveMeta(); rebuildAll();
  showToast(`"${w.name}" deleted`, '');
}

// ─────────────────────────────────────────────────
// Danger Zone
// ─────────────────────────────────────────────────
clearAllPhotosBtn.addEventListener('click', async () => {
  const yes = await showConfirm('Delete All Photos?', `This will permanently remove all ${photos.length} photos.`, 'Delete All');
  if (!yes) return;
  await idbClear();
  photos = [];
  rebuildAll(); showToast('All photos deleted', '');
});

clearAllWeeksBtn.addEventListener('click', async () => {
  const yes = await showConfirm('Delete Everything?', 'This will remove all weeks and all photos. The site will be reset.', 'Delete Everything');
  if (!yes) return;
  await idbClear();
  state.weeks  = [];
  photos       = [];
  activeFilter = 'all';
  saveMeta(); rebuildAll(); showToast('All data cleared', '');
});

// ─────────────────────────────────────────────────
// Upload Modal
// ─────────────────────────────────────────────────
let pendingFiles = [];

function openUpload() {
  pendingFiles = [];
  previewGrid.innerHTML = '';
  uploadForm.reset();
  uploadModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeUpload() {
  uploadModal.classList.remove('open');
  document.body.style.overflow = '';
}

$('openUploadBtn').addEventListener('click', openUpload);
$('heroUploadBtn').addEventListener('click', openUpload);
$('emptyUploadBtn').addEventListener('click', openUpload);
$('closeUploadBtn').addEventListener('click', closeUpload);
uploadModal.addEventListener('click', (e) => { if (e.target === uploadModal) closeUpload(); });

browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click',  (e) => { if (e.target !== browseBtn) fileInput.click(); });
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  handleFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));

function handleFiles(files) {
  files.filter(f => f.type.startsWith('image/')).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingFiles.push({ src: e.target.result, name: file.name });
      addPreviewThumb(e.target.result, pendingFiles.length - 1);
    };
    reader.readAsDataURL(file);
  });
}

function addPreviewThumb(src, idx) {
  const thumb = document.createElement('div');
  thumb.className    = 'preview-thumb';
  thumb.dataset.idx  = idx;
  thumb.innerHTML    = `<img src="${src}" alt="Preview" /><button class="preview-remove" type="button">✕</button>`;
  thumb.querySelector('.preview-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    pendingFiles.splice(idx, 1);
    thumb.remove();
    previewGrid.querySelectorAll('.preview-thumb').forEach((t, i) => { t.dataset.idx = i; });
  });
  previewGrid.appendChild(thumb);
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const wId  = weekSelect.value;
  const name = uploaderName.value.trim() || 'Anonymous';
  const cap  = photoCaption.value.trim();
  if (!wId)                       { showToast('Please select a week!', 'error'); return; }
  if (pendingFiles.length === 0)  { showToast('Please add at least one photo!', 'error'); return; }

  const btn = $('submitUpload');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Saving…';

  const newPhotos = pendingFiles.map(f => ({
    id:       'ph_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    weekId:   wId,
    src:      f.src,
    caption:  cap,
    uploader: name,
    date:     new Date().toISOString(),
  }));

  // Save all to IndexedDB
  await Promise.all(newPhotos.map(p => idbPut(p)));
  photos = [...photos, ...newPhotos];

  btn.disabled = false;
  btn.querySelector('span').textContent = 'Publish to Gallery';

  rebuildAll(); closeUpload();
  showToast(`✓ ${newPhotos.length} photo${newPhotos.length !== 1 ? 's' : ''} uploaded!`, 'success');
});

// ─────────────────────────────────────────────────
// Rebuild All
// ─────────────────────────────────────────────────
function rebuildAll() {
  rebuildFilterBar();
  rebuildWeekSelect();
  renderWeeks();
  renderGallery();
  renderWeeksManagerList();
  updateStats();
}

// ─────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────
async function init() {
  // 1. Open IndexedDB first
  await openIDB();

  // 2. Load weeks + settings from localStorage
  loadMeta();

  // 3. Load all photos from IndexedDB
  photos = await idbGetAll();

  // 4. Apply visual settings
  applyAccent(state.settings.accent || '#c8ff00');
  applyHeroFont(state.settings.heroFont || 'Space Grotesk');
  syncBgControls();
  applyBg();
  buildFontPicker();

  // 5. Seed sample weeks if first run
  if (state.weeks.length === 0) {
    [
      { name:'Week 1', color:'Crimson Red',   hex:'#E63946', date:'Mar 1 – Mar 7'  },
      { name:'Week 2', color:'Ocean Blue',    hex:'#4895EF', date:'Mar 8 – Mar 14' },
      { name:'Week 3', color:'Forest Green',  hex:'#2DC653', date:'Mar 15 – Mar 21'},
      { name:'Week 4', color:'Golden Yellow', hex:'#FFB703', date:'Mar 22 – Mar 28'},
    ].forEach(s => state.weeks.push({ id: 'w_' + Date.now() + Math.random(), ...s }));
    saveMeta();
  }

  // 6. Render everything
  rebuildAll();
  document.querySelectorAll('.gm-btn').forEach(b => b.classList.toggle('active', b.dataset.gm === galleryMode));
  document.querySelectorAll('.section-header, .stats-bar').forEach(el => addReveal(el));
}

document.addEventListener('DOMContentLoaded', init);
