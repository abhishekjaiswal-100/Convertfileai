/* =============================================
   FileForge - Complete Application JS
   All tools: Image, PDF, Audio, Video
   ============================================= */

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatSize(bytes) {
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
  setTimeout(() => t.classList.remove('show'), 3600);
}

function makeDropZone(zoneEl, inputEl, onFiles) {
  zoneEl.addEventListener('click', () => inputEl.click());
  zoneEl.addEventListener('dragover', e => { e.preventDefault(); zoneEl.classList.add('dragover'); });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('dragover'));
  zoneEl.addEventListener('drop', e => {
    e.preventDefault(); zoneEl.classList.remove('dragover');
    onFiles([...e.dataTransfer.files]);
  });
  inputEl.addEventListener('change', () => onFiles([...inputEl.files]));
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// ─────────────────────────────────────────────
//  APP ROUTER
// ─────────────────────────────────────────────
const App = {
  currentPage: 'home',
  theme: localStorage.getItem('ff-theme') || 'light',

  init() {
    this.applyTheme(this.theme);
    this.bindThemeToggle();
    this.bindNav();
    this.bindCategoryTabs();
    this.bindMobileMenu();
    // Check URL hash on load
    const hash = location.hash.replace('#', '');
    if (hash) this.showPage(hash);
    else this.showPage('home');
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
    $$('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === id);
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
    const zone = $('#img-zone'), input = $('#img-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.addFiles(files));
    $('#img-convert-btn')?.addEventListener('click', () => this.convertAll());
    $('#img-download-btn')?.addEventListener('click', () => this.downloadAll());
    $('#img-clear-btn')?.addEventListener('click', () => this.clear());
    const slider = $('#img-quality'), val = $('#img-quality-val');
    slider?.addEventListener('input', () => { val.textContent = slider.value + '%'; });
  },

  addFiles(incoming) {
    const valid = incoming.filter(f => f.type.startsWith('image/'));
    if (!valid.length) { showToast('Upload valid image files (JPG, PNG, WebP, GIF, BMP)', '⚠️'); return; }
    this.files.push(...valid);
    this.render();
    $('#img-actions')?.classList.remove('hidden');
    showToast(`${valid.length} image(s) added`, '🖼️');
  },

  render() {
    const list = $('#img-file-list');
    if (!list) return;
    list.innerHTML = '';
    this.files.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      const url = URL.createObjectURL(f);
      div.innerHTML = `
        <div class="file-thumb"><img src="${url}" alt="${f.name}" /></div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-meta">${formatSize(f.size)} · ${f.type.split('/')[1].toUpperCase()}</div>
        </div>
        <div class="file-status" id="img-st-${i}"><span class="status-wait">Waiting</span></div>
        <button class="file-remove" onclick="ImageConverter.remove(${i})">✕</button>
      `;
      list.appendChild(div);
    });
  },

  remove(i) {
    this.files.splice(i, 1);
    this.render();
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
        if (st) st.innerHTML = `<span class="status-done">✓ ${formatSize(blob.size)} ${saved > 0 ? '(-'+saved+'%)' : ''}</span>`;
      } catch {
        if (st) st.innerHTML = '<span class="status-error">✕ Failed</span>';
      }
    }
    $('#img-download-btn')?.classList.remove('hidden');
    showToast('All images converted!', '🎉');
  },

  doConvert(file, fmt, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (fmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(), fmt, quality);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  downloadAll() {
    this.results.forEach(({ blob, name }) => downloadBlob(blob, name));
  }
};

// ─────────────────────────────────────────────
//  IMAGE COMPRESSOR
// ─────────────────────────────────────────────
const ImageCompressor = {
  files: [],
  results: [],

  init() {
    const zone = $('#imgc-zone'), input = $('#imgc-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.addFiles(files));
    $('#imgc-compress-btn')?.addEventListener('click', () => this.compressAll());
    $('#imgc-download-btn')?.addEventListener('click', () => this.downloadAll());
    $('#imgc-clear-btn')?.addEventListener('click', () => this.clear());
    const slider = $('#imgc-quality'), val = $('#imgc-quality-val');
    slider?.addEventListener('input', () => { val.textContent = slider.value + '%'; });
  },

  addFiles(incoming) {
    const valid = incoming.filter(f => f.type.match(/image\/(jpeg|png|webp)/));
    if (!valid.length) { showToast('Upload JPG, PNG, or WebP images', '⚠️'); return; }
    this.files.push(...valid);
    this.render();
    $('#imgc-actions')?.classList.remove('hidden');
    showToast(`${valid.length} image(s) ready to compress`, '🗜️');
  },

  render() {
    const list = $('#imgc-file-list'); if (!list) return;
    list.innerHTML = '';
    this.files.forEach((f, i) => {
      const div = document.createElement('div'); div.className = 'file-item';
      const url = URL.createObjectURL(f);
      div.innerHTML = `
        <div class="file-thumb"><img src="${url}" alt="${f.name}" /></div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${formatSize(f.size)}</div></div>
        <div class="file-status" id="imgc-st-${i}"><span class="status-wait">Waiting</span></div>
        <button class="file-remove" onclick="ImageCompressor.remove(${i})">✕</button>
      `;
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
      const saved = Math.round((1 - blob.size / this.files[i].size) * 100);
      this.results.push({ blob, name: 'compressed_' + this.files[i].name });
      if (st) st.innerHTML = `<span class="status-done">✓ -${saved}% → ${formatSize(blob.size)}</span>`;
    }
    $('#imgc-download-btn')?.classList.remove('hidden');
    showToast('Compression complete!', '🗜️');
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
    this.initCompress();
    this.initMerge();
    this.initSplit();
    this.initRotate();
    this.initToImages();
  },

  // --- COMPRESS ---
  initCompress() {
    const zone = $('#pdfc-zone'), input = $('#pdfc-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.handleCompress(files));
  },

  handleCompress(files) {
    const valid = files.filter(f => f.name.endsWith('.pdf') || f.type === 'application/pdf');
    if (!valid.length) { showToast('Please upload PDF files', '⚠️'); return; }
    const list = $('#pdfc-list'); if (!list) return;
    list.innerHTML = valid.map(f => `
      <div class="file-item">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${formatSize(f.size)}</div></div>
        <button class="btn btn-primary" style="padding:10px 20px;font-size:0.85rem"
          onclick="PDFTools.compressPDF('${URL.createObjectURL(f)}','${f.name}',${f.size})">
          🗜️ Compress
        </button>
      </div>
    `).join('');
    showToast(`${valid.length} PDF(s) loaded`, '📄');
  },

  async compressPDF(url, name, origSize) {
    showToast('Compressing PDF…', '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const bytes = await (await fetch(url)).arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const out = await doc.save({ useObjectStreams: false });
      const blob = new Blob([out], { type: 'application/pdf' });
      const saved = Math.max(0, Math.round((1 - blob.size / origSize) * 100));
      downloadBlob(blob, 'compressed_' + name);
      showToast(`Done! Saved ~${saved}% · ${formatSize(blob.size)}`, '🎉');
    } catch { showToast('Compression failed. Try a different PDF.', '❌'); }
  },

  // --- MERGE ---
  initMerge() {
    const zone = $('#pdfm-zone'), input = $('#pdfm-input');
    if (!zone) return;
    makeDropZone(zone, input, files => {
      this.mergeFiles.push(...files.filter(f => f.name.endsWith('.pdf')));
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
      </div>
    `).join('');
    $('#pdfm-merge-btn')?.classList.toggle('hidden', this.mergeFiles.length < 2);
  },

  async doMerge() {
    if (this.mergeFiles.length < 2) { showToast('Add at least 2 PDFs', '⚠️'); return; }
    showToast('Merging PDFs…', '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const merged = await PDFDocument.create();
      for (const f of this.mergeFiles) {
        const doc = await PDFDocument.load(await f.arrayBuffer());
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const blob = new Blob([await merged.save()], { type: 'application/pdf' });
      downloadBlob(blob, 'merged.pdf');
      showToast('PDFs merged successfully!', '🎉');
    } catch { showToast('Merge failed', '❌'); }
  },

  // --- SPLIT ---
  initSplit() {
    const zone = $('#pdfs-zone'), input = $('#pdfs-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.loadSplit(files[0]));
  },

  async loadSplit(file) {
    if (!file?.name.endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const bytes = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(bytes);
    const total = doc.getPageCount();
    const info = $('#pdfs-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:20px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${total} pages · ${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">✂️ Split Options</div>
        <div class="options-row">
          <div class="option-group">
            <label class="option-label">Page Range (e.g. 1-3)</label>
            <input class="option-input" id="split-range" placeholder="Leave empty to split all pages" />
          </div>
          <button class="btn btn-primary" onclick="PDFTools.splitAllPages('${URL.createObjectURL(file)}',${total},'${file.name}')">✂️ Split All Pages</button>
        </div>
      </div>
    `;
    showToast(`${total} pages loaded`, '📑');
  },

  async splitAllPages(url, total, name) {
    showToast(`Splitting ${total} pages…`, '⏳');
    const { PDFDocument } = PDFLib;
    const bytes = await (await fetch(url)).arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    for (let i = 0; i < total; i++) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(doc, [i]);
      newDoc.addPage(page);
      const blob = new Blob([await newDoc.save()], { type: 'application/pdf' });
      downloadBlob(blob, `${name.replace('.pdf','')}-page-${i+1}.pdf`);
      await new Promise(r => setTimeout(r, 350));
    }
    showToast('All pages split and downloaded!', '🎉');
  },

  // --- ROTATE ---
  initRotate() {
    const zone = $('#pdfr-zone'), input = $('#pdfr-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.loadRotate(files[0]));
  },

  loadRotate(file) {
    if (!file?.name.endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const info = $('#pdfr-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:20px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">🔄 Rotation</div>
        <div class="options-row">
          <div class="option-group">
            <label class="option-label">Rotate By</label>
            <select class="option-select" id="rotate-deg">
              <option value="90">90° Clockwise</option>
              <option value="180">180°</option>
              <option value="270">270° (Counter-clockwise)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="PDFTools.rotatePDF('${URL.createObjectURL(file)}','${file.name}')">🔄 Rotate & Download</button>
        </div>
      </div>
    `;
    showToast('PDF loaded', '📄');
  },

  async rotatePDF(url, name) {
    showToast('Rotating PDF…', '⏳');
    try {
      const { PDFDocument, degrees } = PDFLib;
      const deg = parseInt($('#rotate-deg')?.value || 90);
      const bytes = await (await fetch(url)).arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const blob = new Blob([await doc.save()], { type: 'application/pdf' });
      downloadBlob(blob, 'rotated_' + name);
      showToast('PDF rotated!', '🎉');
    } catch { showToast('Rotation failed', '❌'); }
  },

  // --- PDF TO IMAGES ---
  initToImages() {
    const zone = $('#pdfimg-zone'), input = $('#pdfimg-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.loadToImages(files[0]));
  },

  loadToImages(file) {
    if (!file?.name.endsWith('.pdf')) { showToast('Upload a PDF file', '⚠️'); return; }
    const info = $('#pdfimg-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item" style="margin-bottom:20px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-panel-title">🖼️ Output Settings</div>
        <div class="options-row">
          <div class="option-group">
            <label class="option-label">Image Format</label>
            <select class="option-select" id="pdfimg-fmt">
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="PDFTools.convertToImages('${URL.createObjectURL(file)}','${file.name}')">🖼️ Convert Pages to Images</button>
        </div>
      </div>
    `;
    showToast('PDF loaded — ready to convert', '📄');
  },

  async convertToImages(url, name) {
    if (typeof pdfjsLib === 'undefined') { showToast('PDF.js still loading, try again in a moment', '⏳'); return; }
    showToast('Converting pages to images…', '⏳');
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
      showToast('All pages converted!', '🎉');
    } catch { showToast('Conversion failed. Try again.', '❌'); }
  }
};

// ─────────────────────────────────────────────
//  AUDIO CONVERTER (FFmpeg.wasm)
// ─────────────────────────────────────────────
const AudioConverter = {
  file: null,
  ffmpeg: null,
  loaded: false,

  init() {
    const zone = $('#audio-zone'), input = $('#audio-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.loadFile(files[0]));
    $('#audio-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    const exts = /\.(mp3|wav|ogg|aac|flac|m4a|opus)$/i;
    if (!file || (!file.type.startsWith('audio/') && !exts.test(file.name))) {
      showToast('Upload a valid audio file (MP3, WAV, OGG, AAC, FLAC)', '⚠️'); return;
    }
    this.file = file;
    const info = $('#audio-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎵</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <audio controls src="${URL.createObjectURL(file)}" style="width:100%;margin-top:14px;border-radius:10px"></audio>
    `;
    $('#audio-actions')?.classList.remove('hidden');
    showToast('Audio loaded', '🎵');
  },

  async loadFFmpeg() {
    if (this.loaded) return;
    showToast('Loading FFmpeg (~20MB, first time only)…', '⏳');
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    const { createFFmpeg } = FFmpeg;
    this.ffmpeg = createFFmpeg({ log: false });
    await this.ffmpeg.load();
    this.loaded = true;
  },

  async convert() {
    if (!this.file) return;
    const format = $('#audio-format')?.value || 'mp3';
    const statusEl = $('#audio-status');
    try {
      await this.loadFFmpeg();
      if (statusEl) statusEl.textContent = 'Converting…';
      const ext = this.file.name.split('.').pop();
      this.ffmpeg.FS('writeFile', `in.${ext}`, await FFmpeg.fetchFile(this.file));
      await this.ffmpeg.run('-i', `in.${ext}`, `out.${format}`);
      const data = this.ffmpeg.FS('readFile', `out.${format}`);
      const blob = new Blob([data.buffer], { type: 'audio/' + format });
      downloadBlob(blob, this.file.name.replace(/\.[^.]+$/, '') + '.' + format);
      if (statusEl) statusEl.textContent = '';
      showToast('Audio converted!', '🎉');
    } catch (e) {
      if (statusEl) statusEl.textContent = '';
      showToast('Conversion failed. Try a different browser or file.', '❌');
    }
  }
};

// ─────────────────────────────────────────────
//  VIDEO CONVERTER (FFmpeg.wasm)
// ─────────────────────────────────────────────
const VideoConverter = {
  file: null,
  ffmpeg: null,
  loaded: false,

  init() {
    const zone = $('#video-zone'), input = $('#video-input');
    if (!zone) return;
    makeDropZone(zone, input, files => this.loadFile(files[0]));
    $('#video-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    if (!file || !file.type.startsWith('video/')) { showToast('Upload a valid video file', '⚠️'); return; }
    if (file.size > 500 * 1024 * 1024) { showToast('Max file size is 500MB for browser conversion', '⚠️'); return; }
    this.file = file;
    const info = $('#video-info'); if (!info) return;
    info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎬</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${formatSize(file.size)}</div></div>
      </div>
      <video controls src="${URL.createObjectURL(file)}" style="width:100%;border-radius:14px;margin-top:14px;max-height:280px" preload="metadata"></video>
    `;
    $('#video-actions')?.classList.remove('hidden');
    showToast('Video loaded', '🎬');
  },

  async loadFFmpeg() {
    if (this.loaded) return;
    showToast('Loading FFmpeg (~20MB)…', '⏳');
    if (!window.FFmpeg) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const statusEl = $('#video-status');
    const { createFFmpeg } = FFmpeg;
    this.ffmpeg = createFFmpeg({
      log: false,
      progress: ({ ratio }) => {
        if (statusEl) statusEl.textContent = `Converting: ${Math.round(ratio * 100)}%`;
      }
    });
    await this.ffmpeg.load();
    this.loaded = true;
  },

  async convert() {
    if (!this.file) return;
    const format = $('#video-format')?.value || 'mp4';
    const statusEl = $('#video-status');
    try {
      await this.loadFFmpeg();
      if (statusEl) statusEl.textContent = 'Starting…';
      const ext = this.file.name.split('.').pop();
      this.ffmpeg.FS('writeFile', `in.${ext}`, await FFmpeg.fetchFile(this.file));
      const args = format === 'gif'
        ? ['-i', `in.${ext}`, '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0', `out.gif`]
        : ['-i', `in.${ext}`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', `out.${format}`];
      await this.ffmpeg.run(...args);
      const data = this.ffmpeg.FS('readFile', `out.${format}`);
      const blob = new Blob([data.buffer], { type: `video/${format}` });
      downloadBlob(blob, this.file.name.replace(/\.[^.]+$/, '') + '.' + format);
      if (statusEl) statusEl.textContent = '';
      showToast('Video converted!', '🎉');
    } catch {
      if (statusEl) statusEl.textContent = '';
      showToast('Conversion failed. Large files may need a desktop app.', '❌');
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
