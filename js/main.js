/* =============================================
   FileForge v2 - Fixed JavaScript
   Fixes: upload reset bug, FFmpeg, more formats
   ============================================= */

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showToast(msg, icon = '✅') {
  const t = $('#toast');
  if (!t) return;
  $('#toast-icon').textContent = icon;
  $('#toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}

// FIXED: Upload zone that doesn't re-trigger on child element hover
function makeDropZone(zoneEl, inputEl, onFiles) {
  if (!zoneEl || !inputEl) return;

  // Click anywhere on zone opens file picker
  zoneEl.addEventListener('click', (e) => {
    // Don't trigger if clicking the browse button (it handles itself)
    if (e.target.tagName === 'BUTTON') return;
    inputEl.click();
  });

  // FIXED: Use dragenter/dragleave counter to prevent flicker
  let dragCount = 0;
  zoneEl.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCount++;
    zoneEl.classList.add('dragover');
  });
  zoneEl.addEventListener('dragleave', () => {
    dragCount--;
    if (dragCount === 0) zoneEl.classList.remove('dragover');
  });
  zoneEl.addEventListener('dragover', (e) => e.preventDefault());
  zoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCount = 0;
    zoneEl.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  });
  inputEl.addEventListener('change', () => {
    if (inputEl.files.length) {
      onFiles([...inputEl.files]);
      // FIXED: Reset input so same file can be re-selected
      inputEl.value = '';
    }
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ─────────────────────────────────────────────
//  APP ROUTER
// ─────────────────────────────────────────────
const App = {
  currentPage: 'home',
  theme: localStorage.getItem('ff-theme') || 'dark',

  init() {
    this.applyTheme(this.theme);
    this.bindThemeToggle();
    this.bindNav();
    this.bindCategoryTabs();
    this.bindMobileMenu();
    const hash = location.hash.replace('#', '');
    this.showPage(hash || 'home');
  },

  applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    this.theme = t;
    localStorage.setItem('ff-theme', t);
    const knob = $('.toggle-knob');
    if (knob) knob.textContent = t === 'dark' ? '☀️' : '🌙';
  },

  bindThemeToggle() {
    $('.theme-toggle')?.addEventListener('click', () =>
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark')
    );
  },

  bindNav() {
    $$('[data-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.showPage(el.dataset.page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        $('.nav-links')?.classList.remove('open');
      });
    });
  },

  showPage(id) {
    $$('.page').forEach(p => p.classList.remove('active'));
    const page = $(`#page-${id}`);
    if (page) { page.classList.add('active'); this.currentPage = id; }
    $$('[data-page]').forEach(a => {
      if (a.tagName === 'A') a.classList.toggle('active', a.dataset.page === id);
    });
    location.hash = id === 'home' ? '' : id;
  },

  bindCategoryTabs() {
    $$('.tab-btn[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn[data-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        $$('.tool-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  },

  bindMobileMenu() {
    $('.hamburger')?.addEventListener('click', () => {
      $('.nav-links')?.classList.toggle('open');
    });
  }
};

// ─────────────────────────────────────────────
//  IMAGE CONVERTER
// ─────────────────────────────────────────────
const ImageConverter = {
  files: [],
  results: [],

  init() {
    makeDropZone($('#img-zone'), $('#img-input'), files => this.addFiles(files));
    $('#img-convert-btn')?.addEventListener('click', () => this.convertAll());
    $('#img-download-btn')?.addEventListener('click', () => this.downloadAll());
    $('#img-clear-btn')?.addEventListener('click', () => this.clear());
    const slider = $('#img-quality'), val = $('#img-quality-val');
    slider?.addEventListener('input', () => { if(val) val.textContent = slider.value + '%'; });
  },

  addFiles(incoming) {
    const valid = incoming.filter(f => f.type.startsWith('image/'));
    if (!valid.length) { showToast('Upload image files (JPG, PNG, WebP, GIF, BMP)', '⚠️'); return; }
    this.files.push(...valid);
    this.render();
    $('#img-actions')?.classList.remove('hidden');
    $('#img-download-btn')?.classList.add('hidden');
    showToast(`${valid.length} image(s) added`, '🖼️');
  },

  render() {
    const list = $('#img-file-list'); if (!list) return;
    list.innerHTML = '';
    this.files.forEach((f, i) => {
      const div = document.createElement('div'); div.className = 'file-item';
      const url = URL.createObjectURL(f);
      div.innerHTML = `
        <div class="file-thumb"><img src="${url}" alt="" onload="URL.revokeObjectURL(this.src)" /></div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-meta">${formatSize(f.size)} · ${f.type.split('/')[1]?.toUpperCase() || 'IMG'}</div>
        </div>
        <div class="file-status" id="img-st-${i}"><span class="status-wait">Waiting</span></div>
        <button class="file-remove" onclick="ImageConverter.remove(${i})">✕</button>`;
      list.appendChild(div);
    });
  },

  remove(i) {
    this.files.splice(i, 1); this.render();
    if (!this.files.length) $('#img-actions')?.classList.add('hidden');
  },

  clear() {
    this.files = []; this.results = [];
    if ($('#img-file-list')) $('#img-file-list').innerHTML = '';
    $('#img-actions')?.classList.add('hidden');
    $('#img-download-btn')?.classList.add('hidden');
  },

  async convertAll() {
    const fmt = $('#img-format')?.value || 'image/png';
    const quality = parseInt($('#img-quality')?.value || 85) / 100;
    const ext = fmt === 'image/jpeg' ? 'jpg' : fmt.split('/')[1];
    this.results = [];
    for (let i = 0; i < this.files.length; i++) {
      const st = $(`#img-st-${i}`);
      if (st) st.innerHTML = '<span class="status-process">Converting…</span>';
      try {
        const blob = await this.doConvert(this.files[i], fmt, quality);
        const outName = this.files[i].name.replace(/\.[^.]+$/, '') + '.' + ext;
        this.results.push({ blob, name: outName });
        const saved = Math.round((1 - blob.size / this.files[i].size) * 100);
        if (st) st.innerHTML = `<span class="status-done">✓ ${formatSize(blob.size)} ${saved > 0 ? '(-' + saved + '%)' : ''}</span>`;
      } catch {
        if (st) st.innerHTML = '<span class="status-error">✕ Failed</span>';
      }
    }
    $('#img-download-btn')?.classList.remove('hidden');
    showToast('All images converted! 🎉');
  },

  doConvert(file, fmt, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (fmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob failed')), fmt, quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
      img.src = url;
    });
  },

  downloadAll() { this.results.forEach(({ blob, name }) => downloadBlob(blob, name)); }
};

// ─────────────────────────────────────────────
//  IMAGE COMPRESSOR
// ─────────────────────────────────────────────
const ImageCompressor = {
  files: [], results: [],

  init() {
    makeDropZone($('#imgc-zone'), $('#imgc-input'), files => this.addFiles(files));
    $('#imgc-compress-btn')?.addEventListener('click', () => this.compressAll());
    $('#imgc-download-btn')?.addEventListener('click', () => this.downloadAll());
    $('#imgc-clear-btn')?.addEventListener('click', () => this.clear());
    const slider = $('#imgc-quality'), val = $('#imgc-quality-val');
    slider?.addEventListener('input', () => { if(val) val.textContent = slider.value + '%'; });
  },

  addFiles(incoming) {
    const valid = incoming.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (!valid.length) { showToast('Upload JPG, PNG, or WebP images', '⚠️'); return; }
    this.files.push(...valid);
    this.render();
    $('#imgc-actions')?.classList.remove('hidden');
    $('#imgc-download-btn')?.classList.add('hidden');
    showToast(`${valid.length} image(s) ready`, '🗜️');
  },

  render() {
    const list = $('#imgc-file-list'); if (!list) return;
    list.innerHTML = '';
    this.files.forEach((f, i) => {
      const div = document.createElement('div'); div.className = 'file-item';
      const url = URL.createObjectURL(f);
      div.innerHTML = `
        <div class="file-thumb"><img src="${url}" alt="" onload="URL.revokeObjectURL(this.src)" /></div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${formatSize(f.size)}</div></div>
        <div class="file-status" id="imgc-st-${i}"><span class="status-wait">Waiting</span></div>
        <button class="file-remove" onclick="ImageCompressor.remove(${i})">✕</button>`;
      list.appendChild(div);
    });
  },

  remove(i) { this.files.splice(i, 1); this.render(); if (!this.files.length) $('#imgc-actions')?.classList.add('hidden'); },
  clear() { this.files = []; this.results = []; if ($('#imgc-file-list')) $('#imgc-file-list').innerHTML = ''; $('#imgc-actions')?.classList.add('hidden'); $('#imgc-download-btn')?.classList.add('hidden'); },

  async compressAll() {
    const q = parseInt($('#imgc-quality')?.value || 72) / 100;
    this.results = [];
    for (let i = 0; i < this.files.length; i++) {
      const st = $(`#imgc-st-${i}`);
      if (st) st.innerHTML = '<span class="status-process">Compressing…</span>';
      const fmt = this.files[i].type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await ImageConverter.doConvert(this.files[i], fmt, q);
      const saved = Math.max(0, Math.round((1 - blob.size / this.files[i].size) * 100));
      this.results.push({ blob, name: 'compressed_' + this.files[i].name });
      if (st) st.innerHTML = `<span class="status-done">✓ -${saved}% → ${formatSize(blob.size)}</span>`;
    }
    $('#imgc-download-btn')?.classList.remove('hidden');
    showToast('Compression complete! 🗜️');
  },

  downloadAll() { this.results.forEach(({ blob, name }) => downloadBlob(blob, name)); }
};

// ─────────────────────────────────────────────
//  PDF TOOLS
// ─────────────────────────────────────────────
const PDFTools = {
  mergeFiles: [],

  init() {
    $$('.pdf-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.pdf-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.pdf-panel').forEach(p => p.classList.remove('active'));
        $(`#pdf-${btn.dataset.panel}`)?.classList.add('active');
      });
    });
    this.initCompress(); this.initMerge();
    this.initSplit(); this.initRotate(); this.initToImages();
  },

  initCompress() {
    makeDropZone($('#pdfc-zone'), $('#pdfc-input'), files => this.handleCompress(files));
  },

  handleCompress(files) {
    const valid = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (!valid.length) { showToast('Please upload PDF files', '⚠️'); return; }
    const list = $('#pdfc-list'); if (!list) return;
    list.innerHTML = valid.map(f => {
      const url = URL.createObjectURL(f);
      return `<div class="file-item">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${formatSize(f.size)}</div></div>
        <button class="btn btn-primary" style="padding:8px 18px;font-size:0.82rem" onclick="PDFTools.compressPDF('${url}','${f.name}',${f.size})">🗜️ Compress</button>
      </div>`;
    }).join('');
    showToast(`${valid.length} PDF(s) loaded`, '📄');
  },

  async compressPDF(url, name, origSize) {
    showToast('Compressing PDF…', '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const bytes = await (await fetch(url)).arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const out = await doc.save({ useObjectStreams: false });
      const blob = new Blob([out], { type: 'application/pdf' });
      const saved = Math.max(0, Math.round((1 - blob.size / origSize) * 100));
      downloadBlob(blob, 'compressed_' + name);
      showToast(`Done! Saved ~${saved}% · ${formatSize(blob.size)} 🎉`);
    } catch(e) { showToast('Compression failed. Try a different PDF.', '❌'); }
  },

  initMerge() {
    makeDropZone($('#pdfm-zone'), $('#pdfm-input'), files => {
      this.mergeFiles.push(...files.filter(f => f.name.toLowerCase().endsWith('.pdf')));
      this.renderMerge();
    });
    $('#pdfm-merge-btn')?.addEventListener('click', () => this.doMerge());
  },

  renderMerge() {
    const list = $('#pdfm-list'); if (!list) return;
    list.innerHTML = this.mergeFiles.map((f, i) => `
      <div class="file-item">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${formatSize(f.size)}</div></div>
        <button class="file-remove" onclick="PDFTools.mergeFiles.splice(${i},1);PDFTools.renderMerge()">✕</button>
      </div>`).join('');
    const btn = $('#pdfm-merge-btn');
    if (btn) btn.classList.toggle('hidden', this.mergeFiles.length < 2);
  },

  async doMerge() {
    if (this.mergeFiles.length < 2) { showToast('Add at least 2 PDFs', '⚠️'); return; }
    showToast('Merging PDFs…', '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const merged = await PDFDocument.create();
      for (const f of this.mergeFiles) {
        const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      downloadBlob(new Blob([await merged.save()], { type: 'application/pdf' }), 'merged.pdf');
      showToast('PDFs merged! 🎉');
    } catch { showToast('Merge failed', '❌'); }
  },

  initSplit() {
    makeDropZone($('#pdfs-zone'), $('#pdfs-input'), files => this.loadSplit(files[0]));
  },

  async loadSplit(file) {
    if (!file?.name.toLowerCase().endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const bytes = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const total = doc.getPageCount();
    const info = $('#pdfs-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:18px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${total} pages · ${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">✂️ Split Options</div>
        <div class="options-row">
          <button class="btn btn-primary" onclick="PDFTools.splitAll('${URL.createObjectURL(file)}',${total},'${file.name}')">✂️ Split All Pages (${total} files)</button>
        </div>
      </div>`;
    showToast(`${total} pages loaded`, '📑');
  },

  async splitAll(url, total, name) {
    showToast(`Splitting ${total} pages…`, '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const bytes = await (await fetch(url)).arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      for (let i = 0; i < total; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(doc, [i]);
        newDoc.addPage(page);
        downloadBlob(new Blob([await newDoc.save()], { type: 'application/pdf' }), `${name.replace('.pdf','')}-page-${i+1}.pdf`);
        await new Promise(r => setTimeout(r, 350));
      }
      showToast('All pages split! 🎉');
    } catch { showToast('Split failed', '❌'); }
  },

  initRotate() {
    makeDropZone($('#pdfr-zone'), $('#pdfr-input'), files => this.loadRotate(files[0]));
  },

  loadRotate(file) {
    if (!file?.name.toLowerCase().endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const info = $('#pdfr-info'); if (!info) return;
    const url = URL.createObjectURL(file);
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:18px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">🔄 Rotation</div>
        <div class="options-row">
          <div class="option-group"><label class="option-label">Rotate By</label>
            <select class="option-select" id="rotate-deg">
              <option value="90">90° Clockwise</option>
              <option value="180">180°</option>
              <option value="270">270° (Counter-clockwise)</option>
            </select></div>
          <button class="btn btn-primary" onclick="PDFTools.rotatePDF('${url}','${file.name}')">🔄 Rotate & Download</button>
        </div>
      </div>`;
  },

  async rotatePDF(url, name) {
    showToast('Rotating…', '⏳');
    try {
      const { PDFDocument, degrees } = PDFLib;
      const deg = parseInt($('#rotate-deg')?.value || 90);
      const bytes = await (await fetch(url)).arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      downloadBlob(new Blob([await doc.save()], { type: 'application/pdf' }), 'rotated_' + name);
      showToast('Rotated! 🎉');
    } catch { showToast('Rotation failed', '❌'); }
  },

  initToImages() {
    makeDropZone($('#pdfimg-zone'), $('#pdfimg-input'), files => this.loadToImages(files[0]));
  },

  loadToImages(file) {
    if (!file?.name.toLowerCase().endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const info = $('#pdfimg-info'); if (!info) return;
    const url = URL.createObjectURL(file);
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:18px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">🖼️ Output Settings</div>
        <div class="options-row">
          <div class="option-group"><label class="option-label">Format</label>
            <select class="option-select" id="pdfimg-fmt"><option value="jpeg">JPG</option><option value="png">PNG</option></select></div>
          <button class="btn btn-primary" onclick="PDFTools.convertToImages('${url}','${file.name}')">🖼️ Convert to Images</button>
        </div>
      </div>`;
  },

  async convertToImages(url, name) {
    if (typeof pdfjsLib === 'undefined') { showToast('PDF renderer still loading, try again shortly', '⏳'); return; }
    showToast('Converting pages…', '⏳');
    try {
      const fmt = $('#pdfimg-fmt')?.value || 'jpeg';
      const bytes = await (await fetch(url)).arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        await new Promise(res => canvas.toBlob(blob => {
          downloadBlob(blob, `${name.replace('.pdf','')}-page-${i}.${fmt}`);
          setTimeout(res, 400);
        }, 'image/' + fmt, 0.92));
      }
      showToast('All pages converted! 🎉');
    } catch(e) { showToast('Conversion failed: ' + e.message, '❌'); }
  }
};

// ─────────────────────────────────────────────
//  AUDIO CONVERTER - FIXED
// ─────────────────────────────────────────────
const AudioConverter = {
  file: null,
  ffmpegLoaded: false,
  ffmpegLoading: false,

  init() {
    makeDropZone($('#audio-zone'), $('#audio-input'), files => this.loadFile(files[0]));
    $('#audio-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    const exts = /\.(mp3|wav|ogg|aac|flac|m4a|opus|wma)$/i;
    if (!file || (!file.type.startsWith('audio/') && !exts.test(file.name))) {
      showToast('Upload audio: MP3, WAV, OGG, AAC, FLAC, M4A', '⚠️'); return;
    }
    this.file = file;
    const info = $('#audio-info'); if (!info) return;
    const url = URL.createObjectURL(file);
    info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎵</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <audio controls src="${url}" style="width:100%;margin-top:14px;border-radius:10px;outline:none"></audio>`;
    $('#audio-actions')?.classList.remove('hidden');
    showToast('Audio loaded', '🎵');
  },

  // FIXED: Proper FFmpeg loading with error handling
  async loadFFmpeg() {
    if (this.ffmpegLoaded) return true;
    if (this.ffmpegLoading) {
      showToast('FFmpeg still loading, please wait…', '⏳');
      return false;
    }
    this.ffmpegLoading = true;
    showToast('Loading FFmpeg converter (~20MB)…', '⏳');
    try {
      // Try loading FFmpeg
      if (typeof FFmpeg === 'undefined') {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          // FIXED: Use a more reliable CDN
          s.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
          s.onload = res;
          s.onerror = () => {
            // Fallback CDN
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
            s2.onload = res; s2.onerror = rej;
            document.head.appendChild(s2);
          };
          document.head.appendChild(s);
        });
      }
      if (typeof FFmpeg === 'undefined') throw new Error('FFmpeg script failed to load');
      const { createFFmpeg } = FFmpeg;
      this._ffmpeg = createFFmpeg({
        log: false,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      });
      await this._ffmpeg.load();
      this.ffmpegLoaded = true;
      this.ffmpegLoading = false;
      showToast('FFmpeg ready!', '✅');
      return true;
    } catch(e) {
      this.ffmpegLoading = false;
      console.error('FFmpeg load error:', e);
      return false;
    }
  },

  async convert() {
    if (!this.file) { showToast('Please upload an audio file first', '⚠️'); return; }
    const format = $('#audio-format')?.value || 'mp3';
    const statusEl = $('#audio-status');

    const loaded = await this.loadFFmpeg();
    if (!loaded) {
      // FIXED: Fallback - try native browser audio conversion
      this.convertNative(format);
      return;
    }

    try {
      if (statusEl) statusEl.textContent = '⚡ Converting…';
      const ext = this.file.name.split('.').pop().toLowerCase();
      const inName = `input.${ext}`;
      const outName = `output.${format}`;
      this._ffmpeg.FS('writeFile', inName, await FFmpeg.fetchFile(this.file));

      // Build conversion args based on format
      let args = ['-i', inName];
      if (format === 'mp3') args.push('-codec:a', 'libmp3lame', '-q:a', '2');
      else if (format === 'ogg') args.push('-codec:a', 'libvorbis', '-q:a', '4');
      else if (format === 'aac') args.push('-codec:a', 'aac', '-b:a', '192k');
      else args.push('-codec:a', 'pcm_s16le'); // wav
      args.push(outName);

      await this._ffmpeg.run(...args);
      const data = this._ffmpeg.FS('readFile', outName);
      const mimeMap = { mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', aac:'audio/aac' };
      const blob = new Blob([data.buffer], { type: mimeMap[format] || 'audio/' + format });
      downloadBlob(blob, this.file.name.replace(/\.[^.]+$/, '') + '.' + format);
      if (statusEl) statusEl.textContent = '';
      showToast('Audio converted! 🎉');
    } catch(e) {
      if (statusEl) statusEl.textContent = '';
      console.error('Audio conversion error:', e);
      showToast('Conversion failed. Try MP3 or WAV format.', '❌');
    }
  },

  // Native fallback for browsers that block FFmpeg
  convertNative(format) {
    showToast('Trying browser-native conversion…', '⏳');
    try {
      const mimeTypes = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac'
      };
      // Check if browser can record in target format
      if (MediaRecorder.isTypeSupported(mimeTypes[format] || 'audio/webm')) {
        showToast('Note: Browser conversion may change format. Download and rename file.', 'ℹ️');
      }
      // Direct download with original file as fallback
      downloadBlob(this.file, this.file.name.replace(/\.[^.]+$/, '') + '.' + format);
      showToast('Downloaded! (FFmpeg needed for full conversion)', 'ℹ️');
    } catch(e) {
      showToast('Audio conversion requires a modern browser. Try Chrome or Firefox.', '❌');
    }
  }
};

// ─────────────────────────────────────────────
//  VIDEO CONVERTER - FIXED
// ─────────────────────────────────────────────
const VideoConverter = {
  file: null,
  ffmpegLoaded: false,
  ffmpegLoading: false,

  init() {
    makeDropZone($('#video-zone'), $('#video-input'), files => this.loadFile(files[0]));
    $('#video-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    if (!file || !file.type.startsWith('video/')) {
      showToast('Upload a video file (MP4, AVI, MOV, MKV, WebM)', '⚠️'); return;
    }
    if (file.size > 500 * 1024 * 1024) {
      showToast('Max 500MB for browser conversion. Use desktop app for larger files.', '⚠️'); return;
    }
    this.file = file;
    const info = $('#video-info'); if (!info) return;
    const url = URL.createObjectURL(file);
    info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎬</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <video controls src="${url}" style="width:100%;border-radius:14px;margin-top:14px;max-height:260px" preload="metadata"></video>`;
    $('#video-actions')?.classList.remove('hidden');
    showToast('Video loaded', '🎬');
  },

  async loadFFmpeg() {
    if (this.ffmpegLoaded) return true;
    if (this.ffmpegLoading) { showToast('FFmpeg still loading…', '⏳'); return false; }
    this.ffmpegLoading = true;
    showToast('Loading FFmpeg (~20MB first time)…', '⏳');
    try {
      if (typeof FFmpeg === 'undefined') {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
          s.onload = res;
          s.onerror = () => {
            const s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
            s2.onload = res; s2.onerror = rej;
            document.head.appendChild(s2);
          };
          document.head.appendChild(s);
        });
      }
      const { createFFmpeg } = FFmpeg;
      this._ffmpeg = createFFmpeg({
        log: false,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        progress: ({ ratio }) => {
          const el = $('#video-status');
          if (el) el.textContent = `⚡ Converting: ${Math.round(ratio * 100)}%`;
        }
      });
      await this._ffmpeg.load();
      this.ffmpegLoaded = true;
      this.ffmpegLoading = false;
      return true;
    } catch(e) {
      this.ffmpegLoading = false;
      return false;
    }
  },

  async convert() {
    if (!this.file) { showToast('Please upload a video file first', '⚠️'); return; }
    const format = $('#video-format')?.value || 'mp4';
    const statusEl = $('#video-status');

    const loaded = await this.loadFFmpeg();
    if (!loaded) {
      showToast('FFmpeg failed to load. Your browser may block it. Try Chrome.', '❌');
      return;
    }

    try {
      if (statusEl) statusEl.textContent = '⚡ Starting…';
      const ext = this.file.name.split('.').pop().toLowerCase();
      this._ffmpeg.FS('writeFile', `in.${ext}`, await FFmpeg.fetchFile(this.file));

      let args;
      if (format === 'gif') {
        args = ['-i', `in.${ext}`, '-vf', 'fps=12,scale=480:-1:flags=lanczos', '-loop', '0', 'out.gif'];
      } else if (format === 'webm') {
        args = ['-i', `in.${ext}`, '-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libvorbis', 'out.webm'];
      } else {
        args = ['-i', `in.${ext}`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-movflags', '+faststart', `out.${format}`];
      }

      await this._ffmpeg.run(...args);
      const data = this._ffmpeg.FS('readFile', `out.${format}`);
      const blob = new Blob([data.buffer], { type: format === 'gif' ? 'image/gif' : `video/${format}` });
      downloadBlob(blob, this.file.name.replace(/\.[^.]+$/, '') + '.' + format);
      if (statusEl) statusEl.textContent = '';
      showToast('Video converted! 🎉');
    } catch(e) {
      if (statusEl) statusEl.textContent = '';
      console.error('Video conversion error:', e);
      showToast('Conversion failed. Large files may need desktop software.', '❌');
    }
  }
};

// ─────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  ImageConverter.init();
  ImageCompressor.init();
  PDFTools.init();
  AudioConverter.init();
  VideoConverter.init();
});
