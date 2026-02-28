// =============================================
//  FileForge - Main Application Controller
// =============================================

const App = {
  currentPage: 'home',
  theme: localStorage.getItem('theme') || 'light',

  init() {
    this.applyTheme(this.theme);
    this.bindThemeToggle();
    this.bindNavigation();
    this.bindCategoryTabs();
    this.bindMobileMenu();
    this.showPage('home');
    this.initAds();
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.theme = theme;
    localStorage.setItem('theme', theme);
    const sunIcon = document.querySelector('.theme-icon.sun');
    const moonIcon = document.querySelector('.theme-icon.moon');
    if (sunIcon) sunIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
  },

  bindThemeToggle() {
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    });
  },

  bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage(el.dataset.nav);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // close mobile menu if open
        document.querySelector('.nav-links')?.classList.remove('mobile-open');
      });
    });
  },

  showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + id);
    if (page) { page.classList.add('active'); this.currentPage = id; }
  },

  bindCategoryTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        document.querySelectorAll('.tool-card').forEach(card => {
          if (cat === 'all' || card.dataset.cat === cat) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  },

  bindMobileMenu() {
    document.querySelector('.hamburger')?.addEventListener('click', () => {
      document.querySelector('.nav-links')?.classList.toggle('mobile-open');
    });
  },

  showToast(msg, icon = '✅') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('.toast-icon').textContent = icon;
    toast.querySelector('.toast-msg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  },

  initAds() {
    // Google AdSense init - replace with real publisher ID
    // window.adsbygoogle = window.adsbygoogle || [];
    // (adsbygoogle = window.adsbygoogle || []).push({});
  }
};

// =============================================
//  Image Converter Tool
// =============================================
const ImageConverter = {
  files: [],

  init() {
    const zone = document.getElementById('img-upload-zone');
    const input = document.getElementById('img-input');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('dragover');
      this.addFiles([...e.dataTransfer.files]);
    });
    input.addEventListener('change', () => this.addFiles([...input.files]));

    document.getElementById('img-convert-btn')?.addEventListener('click', () => this.convertAll());
    document.getElementById('img-download-all')?.addEventListener('click', () => this.downloadAll());
    document.getElementById('img-clear-btn')?.addEventListener('click', () => this.clearAll());

    // slider
    const slider = document.getElementById('img-quality');
    const sliderVal = document.getElementById('img-quality-val');
    slider?.addEventListener('input', () => { if(sliderVal) sliderVal.textContent = slider.value + '%'; });
  },

  addFiles(newFiles) {
    const validTypes = ['image/jpeg','image/png','image/webp','image/gif','image/bmp','image/tiff'];
    const valid = newFiles.filter(f => validTypes.includes(f.type));
    if (!valid.length) { App.showToast('Please upload valid image files', '⚠️'); return; }
    this.files.push(...valid);
    this.renderFileList();
    document.getElementById('img-action-bar')?.classList.remove('hidden');
    App.showToast(`${valid.length} image(s) added`, '🖼️');
  },

  renderFileList() {
    const list = document.getElementById('img-file-list');
    if (!list) return;
    list.innerHTML = '';
    this.files.forEach((f, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'file-item'; item.dataset.index = i;
        item.innerHTML = `
          <div class="file-thumb"><img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" /></div>
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-meta">${this.formatSize(f.size)} · ${f.type.split('/')[1].toUpperCase()}</div>
          </div>
          <div class="file-status" id="img-status-${i}">
            <span class="status-text status-waiting">Waiting</span>
          </div>
          <button onclick="ImageConverter.removeFile(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;padding:4px">✕</button>
        `;
        list.appendChild(item);
      };
      reader.readAsDataURL(f);
    });
  },

  removeFile(i) {
    this.files.splice(i, 1);
    this.renderFileList();
    if (!this.files.length) document.getElementById('img-action-bar')?.classList.add('hidden');
  },

  clearAll() {
    this.files = [];
    document.getElementById('img-file-list').innerHTML = '';
    document.getElementById('img-action-bar')?.classList.add('hidden');
    this.convertedBlobs = [];
  },

  convertedBlobs: [],

  async convertAll() {
    const fmt = document.getElementById('img-format')?.value || 'image/png';
    const quality = parseInt(document.getElementById('img-quality')?.value || 85) / 100;
    const ext = fmt.split('/')[1];
    this.convertedBlobs = [];

    for (let i = 0; i < this.files.length; i++) {
      this.setStatus(i, 'processing');
      try {
        const blob = await this.convertImage(this.files[i], fmt, quality);
        this.convertedBlobs.push({ blob, name: this.files[i].name.replace(/\.\w+$/, '') + '.' + (ext === 'jpeg' ? 'jpg' : ext) });
        this.setStatus(i, 'done', `→ ${this.formatSize(blob.size)}`);
      } catch(e) {
        this.setStatus(i, 'error', 'Failed');
      }
    }
    document.getElementById('img-download-all')?.classList.remove('hidden');
    App.showToast('All images converted!', '🎉');
  },

  convertImage(file, format, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => blob ? resolve(blob) : reject('Convert failed'), format, quality);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  downloadAll() {
    this.convertedBlobs.forEach(({ blob, name }) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  },

  setStatus(i, state, extra = '') {
    const el = document.getElementById(`img-status-${i}`);
    if (!el) return;
    const states = {
      'processing': `<div class="progress-bar-wrap"><div class="progress-bar" style="width:60%;animation:none"></div></div><span class="status-text status-processing">Converting…</span>`,
      'done': `<span class="status-text status-done">✓ Done ${extra}</span>`,
      'error': `<span class="status-text" style="color:var(--accent-4)">✕ Error</span>`,
      'waiting': `<span class="status-text status-waiting">Waiting</span>`
    };
    el.innerHTML = states[state] || '';
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(2) + ' MB';
  }
};

// =============================================
//  Image Compressor Tool
// =============================================
const ImageCompressor = {
  files: [],
  convertedBlobs: [],

  init() {
    const zone = document.getElementById('imgc-upload-zone');
    const input = document.getElementById('imgc-input');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('dragover');
      this.addFiles([...e.dataTransfer.files]);
    });
    input.addEventListener('change', () => this.addFiles([...input.files]));
    document.getElementById('imgc-compress-btn')?.addEventListener('click', () => this.compressAll());
    document.getElementById('imgc-download-all')?.addEventListener('click', () => this.downloadAll());
    document.getElementById('imgc-clear-btn')?.addEventListener('click', () => this.clearAll());

    const slider = document.getElementById('imgc-quality');
    const val = document.getElementById('imgc-quality-val');
    slider?.addEventListener('input', () => { if(val) val.textContent = slider.value + '%'; });
  },

  addFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (!valid.length) { App.showToast('Upload valid images', '⚠️'); return; }
    this.files.push(...valid);
    this.renderFileList();
    document.getElementById('imgc-action-bar')?.classList.remove('hidden');
  },

  renderFileList() {
    const list = document.getElementById('imgc-file-list');
    if (!list) return; list.innerHTML = '';
    this.files.forEach((f, i) => {
      const reader = new FileReader();
      reader.onload = e => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
          <div class="file-thumb"><img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" /></div>
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-meta">${ImageConverter.formatSize(f.size)}</div>
          </div>
          <div class="file-status" id="imgc-status-${i}">
            <span class="status-text status-waiting">Waiting</span>
          </div>
          <button onclick="ImageCompressor.removeFile(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;padding:4px">✕</button>
        `;
        list.appendChild(item);
      };
      reader.readAsDataURL(f);
    });
  },

  removeFile(i) { this.files.splice(i,1); this.renderFileList(); },
  clearAll() { this.files = []; this.convertedBlobs = []; document.getElementById('imgc-file-list').innerHTML = ''; document.getElementById('imgc-action-bar')?.classList.add('hidden'); },

  async compressAll() {
    const quality = parseInt(document.getElementById('imgc-quality')?.value || 75) / 100;
    this.convertedBlobs = [];
    for (let i = 0; i < this.files.length; i++) {
      const el = document.getElementById(`imgc-status-${i}`);
      if(el) el.innerHTML = `<span class="status-text status-processing">Compressing…</span>`;
      const fmt = this.files[i].type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await ImageConverter.convertImage(this.files[i], fmt, quality);
      const saved = Math.round((1 - blob.size/this.files[i].size) * 100);
      this.convertedBlobs.push({ blob, name: 'compressed_' + this.files[i].name });
      if(el) el.innerHTML = `<span class="status-text status-done">✓ -${saved}% (${ImageConverter.formatSize(blob.size)})</span>`;
    }
    document.getElementById('imgc-download-all')?.classList.remove('hidden');
    App.showToast('Compression complete!', '🗜️');
  },

  downloadAll() { this.convertedBlobs.forEach(({blob,name}) => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }); }
};

// =============================================
//  PDF Tools (using PDF-lib via CDN)
// =============================================
const PDFTools = {
  currentTool: 'compress',

  init() {
    document.querySelectorAll('.pdf-sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pdf-sub-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.pdf-tool-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('pdf-panel-' + btn.dataset.tool)?.classList.remove('hidden');
        this.currentTool = btn.dataset.tool;
      });
    });

    this.initCompress();
    this.initMerge();
    this.initSplit();
    this.initRotate();
    this.initPdfToImg();
  },

  initCompress() {
    const zone = document.getElementById('pdfc-zone');
    const input = document.getElementById('pdfc-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.handlePdfCompress([...e.dataTransfer.files]); });
    input.addEventListener('change', () => this.handlePdfCompress([...input.files]));
  },

  handlePdfCompress(files) {
    const valid = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!valid.length) { App.showToast('Please upload PDF files', '⚠️'); return; }
    const info = document.getElementById('pdfc-info');
    if (info) {
      info.innerHTML = valid.map(f => `
        <div class="file-item">
          <div class="file-thumb" style="font-size:2rem">📄</div>
          <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${ImageConverter.formatSize(f.size)}</div></div>
          <button class="btn btn-primary" onclick="PDFTools.compressPDF('${URL.createObjectURL(f)}','${f.name}',${f.size})">Compress & Download</button>
        </div>
      `).join('');
    }
    App.showToast(`${valid.length} PDF(s) ready`, '📄');
  },

  async compressPDF(url, name, origSize) {
    App.showToast('Compressing PDF…', '⏳');
    try {
      const { PDFDocument } = PDFLib;
      const resp = await fetch(url);
      const bytes = await resp.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const compressed = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([compressed], { type: 'application/pdf' });
      const saved = Math.round((1 - blob.size / origSize) * 100);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'compressed_' + name; a.click();
      App.showToast(`Done! Saved ~${saved}% · ${ImageConverter.formatSize(blob.size)}`, '🎉');
    } catch(e) {
      App.showToast('PDF compression failed. Try a different file.', '❌');
    }
  },

  initMerge() {
    const zone = document.getElementById('pdfm-zone');
    const input = document.getElementById('pdfm-input');
    if (!zone || !input) return;
    let mergeFiles = [];
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('dragover');
      mergeFiles.push(...[...e.dataTransfer.files].filter(f => f.name.endsWith('.pdf')));
      renderMergeList();
    });
    input.addEventListener('change', () => {
      mergeFiles.push(...[...input.files].filter(f => f.name.endsWith('.pdf')));
      renderMergeList();
    });

    const renderMergeList = () => {
      const list = document.getElementById('pdfm-list');
      if (!list) return;
      list.innerHTML = mergeFiles.length ? mergeFiles.map((f,i) => `
        <div class="file-item">
          <div class="file-thumb">📄</div>
          <div class="file-info"><div class="file-name">${f.name}</div><div class="file-meta">${ImageConverter.formatSize(f.size)}</div></div>
          <button onclick="this.parentElement.remove();mergeFiles.splice(${i},1)" style="background:none;border:none;cursor:pointer;color:var(--text-muted)">✕</button>
        </div>
      `).join('') : '';
      document.getElementById('pdfm-merge-btn')?.classList.toggle('hidden', mergeFiles.length < 2);
    };

    document.getElementById('pdfm-merge-btn')?.addEventListener('click', async () => {
      if (mergeFiles.length < 2) { App.showToast('Add at least 2 PDFs', '⚠️'); return; }
      App.showToast('Merging PDFs…', '⏳');
      try {
        const { PDFDocument } = PDFLib;
        const merged = await PDFDocument.create();
        for (const f of mergeFiles) {
          const bytes = await f.arrayBuffer();
          const doc = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        const out = await merged.save();
        const blob = new Blob([out], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'merged.pdf'; a.click();
        App.showToast('PDFs merged successfully!', '🎉');
      } catch(e) { App.showToast('Merge failed', '❌'); }
    });
  },

  initSplit() {
    const zone = document.getElementById('pdfs-zone');
    const input = document.getElementById('pdfs-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', async e => { e.preventDefault(); zone.classList.remove('dragover'); await this.loadSplitPDF([...e.dataTransfer.files][0]); });
    input.addEventListener('change', async () => await this.loadSplitPDF(input.files[0]));
  },

  async loadSplitPDF(file) {
    if (!file || !file.name.endsWith('.pdf')) { App.showToast('Please upload a PDF', '⚠️'); return; }
    const bytes = await file.arrayBuffer();
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.load(bytes);
    const total = doc.getPageCount();
    const info = document.getElementById('pdfs-info');
    if (info) info.innerHTML = `
      <div class="file-item" style="margin-bottom:16px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${total} pages · ${ImageConverter.formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-title">📑 Split Options</div>
        <div class="options-row">
          <div class="option-group"><label class="option-label">Split by range</label>
            <input class="option-input" id="split-range" placeholder="e.g. 1-3,4-6" /></div>
          <button class="btn btn-primary" onclick="PDFTools.splitPDF(${total})">Split & Download</button>
        </div>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:12px">Or download each page individually:</p>
        <button class="btn btn-secondary mt-8" onclick="PDFTools.splitAllPages('${URL.createObjectURL(file)}',${total})">Split All Pages</button>
      </div>
    `;
    this._splitFile = file;
    App.showToast(`${total} pages loaded`, '📑');
  },

  async splitAllPages(url, total) {
    App.showToast('Splitting pages…', '⏳');
    const { PDFDocument } = PDFLib;
    const resp = await fetch(url);
    const bytes = await resp.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    for (let i = 0; i < total; i++) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(doc, [i]);
      newDoc.addPage(page);
      const out = await newDoc.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `page-${i+1}.pdf`; a.click();
      await new Promise(r => setTimeout(r, 300));
    }
    App.showToast('All pages split!', '🎉');
  },

  initRotate() {
    const zone = document.getElementById('pdfr-zone');
    const input = document.getElementById('pdfr-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.handleRotate([...e.dataTransfer.files][0]); });
    input.addEventListener('change', () => this.handleRotate(input.files[0]));
  },

  handleRotate(file) {
    if (!file?.name.endsWith('.pdf')) { App.showToast('Upload a PDF', '⚠️'); return; }
    const info = document.getElementById('pdfr-info');
    if (info) info.innerHTML = `
      <div class="file-item" style="margin-bottom:16px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${ImageConverter.formatSize(file.size)}</div></div>
      </div>
      <div class="options-panel">
        <div class="options-title">🔄 Rotate Options</div>
        <div class="options-row">
          <div class="option-group"><label class="option-label">Rotation</label>
            <select class="option-select" id="rotate-deg">
              <option value="90">90° Clockwise</option>
              <option value="180">180°</option>
              <option value="270">270° (90° CCW)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="PDFTools.rotatePDF('${URL.createObjectURL(file)}','${file.name}')">Rotate & Download</button>
        </div>
      </div>
    `;
    App.showToast('PDF loaded', '📄');
  },

  async rotatePDF(url, name) {
    App.showToast('Rotating…', '⏳');
    try {
      const { PDFDocument, degrees } = PDFLib;
      const deg = parseInt(document.getElementById('rotate-deg')?.value || 90);
      const resp = await fetch(url);
      const bytes = await resp.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const out = await doc.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'rotated_' + name; a.click();
      App.showToast('PDF rotated!', '🎉');
    } catch(e) { App.showToast('Rotation failed', '❌'); }
  },

  initPdfToImg() {
    const zone = document.getElementById('pdfimg-zone');
    const input = document.getElementById('pdfimg-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.showPdfToImgPanel([...e.dataTransfer.files][0]); });
    input.addEventListener('change', () => this.showPdfToImgPanel(input.files[0]));
  },

  showPdfToImgPanel(file) {
    if (!file?.name.endsWith('.pdf')) { App.showToast('Upload a PDF', '⚠️'); return; }
    const info = document.getElementById('pdfimg-info');
    if (info) info.innerHTML = `
      <div class="file-item" style="margin-bottom:16px">
        <div class="file-thumb">📄</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${ImageConverter.formatSize(file.size)}</div></div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:16px">⚠️ PDF to image conversion requires rendering each page. For best results, use a desktop browser.</p>
      <div class="options-panel">
        <div class="options-row">
          <div class="option-group"><label class="option-label">Output Format</label>
            <select class="option-select" id="pdfimg-fmt">
              <option value="jpeg">JPG</option><option value="png">PNG</option>
            </select></div>
          <button class="btn btn-primary" onclick="PDFTools.convertPdfToImages('${URL.createObjectURL(file)}','${file.name}')">Convert Pages to Images</button>
        </div>
      </div>
    `;
  },

  async convertPdfToImages(url, name) {
    if (typeof pdfjsLib === 'undefined') {
      App.showToast('PDF renderer loading. Try again in a moment.', '⏳');
      return;
    }
    App.showToast('Converting PDF pages…', '⏳');
    try {
      const fmt = document.getElementById('pdfimg-fmt')?.value || 'jpeg';
      const resp = await fetch(url);
      const bytes = await resp.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        canvas.toBlob(blob => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = `${name.replace('.pdf','')}-page-${i}.${fmt}`; a.click();
        }, 'image/' + fmt, 0.92);
        await new Promise(r => setTimeout(r, 400));
      }
      App.showToast('All pages converted!', '🎉');
    } catch(e) { App.showToast('Conversion failed', '❌'); }
  }
};

// =============================================
//  Audio Converter (using FFmpeg.wasm)
// =============================================
const AudioConverter = {
  ffmpeg: null,
  file: null,

  async init() {
    const zone = document.getElementById('audio-zone');
    const input = document.getElementById('audio-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.loadFile([...e.dataTransfer.files][0]); });
    input.addEventListener('change', () => this.loadFile(input.files[0]));
    document.getElementById('audio-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    const validAudio = ['audio/mpeg','audio/wav','audio/ogg','audio/aac','audio/flac','audio/mp4'];
    if (!file || (!validAudio.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i))) {
      App.showToast('Upload a valid audio file', '⚠️'); return;
    }
    this.file = file;
    const info = document.getElementById('audio-file-info');
    if (info) info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎵</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${ImageConverter.formatSize(file.size)}</div></div>
      </div>
      <audio controls src="${URL.createObjectURL(file)}" style="width:100%;margin-top:12px;border-radius:8px"></audio>
    `;
    document.getElementById('audio-action-bar')?.classList.remove('hidden');
    App.showToast('Audio loaded', '🎵');
  },

  async convert() {
    if (!this.file) return;
    const format = document.getElementById('audio-format')?.value || 'mp3';
    App.showToast('Loading FFmpeg (first time may take a moment)…', '⏳');

    try {
      if (!this.ffmpeg) {
        const { createFFmpeg, fetchFile } = FFmpeg;
        this.ffmpeg = createFFmpeg({ log: false });
        await this.ffmpeg.load();
      }
      const inName = 'input.' + this.file.name.split('.').pop();
      const outName = 'output.' + format;
      this.ffmpeg.FS('writeFile', inName, await FFmpeg.fetchFile(this.file));
      await this.ffmpeg.run('-i', inName, outName);
      const data = this.ffmpeg.FS('readFile', outName);
      const blob = new Blob([data.buffer], { type: 'audio/' + format });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = this.file.name.replace(/\.\w+$/, '') + '.' + format;
      a.click();
      App.showToast('Audio converted!', '🎉');
    } catch(e) {
      App.showToast('Audio conversion failed. Try a different browser.', '❌');
    }
  }
};

// =============================================
//  Video Converter (using FFmpeg.wasm)
// =============================================
const VideoConverter = {
  ffmpeg: null,
  file: null,

  init() {
    const zone = document.getElementById('video-zone');
    const input = document.getElementById('video-input');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); this.loadFile([...e.dataTransfer.files][0]); });
    input.addEventListener('change', () => this.loadFile(input.files[0]));
    document.getElementById('video-convert-btn')?.addEventListener('click', () => this.convert());
  },

  loadFile(file) {
    if (!file || !file.type.startsWith('video/')) { App.showToast('Upload a valid video file', '⚠️'); return; }
    if (file.size > 200 * 1024 * 1024) { App.showToast('Max file size is 200MB for browser conversion', '⚠️'); return; }
    this.file = file;
    const info = document.getElementById('video-file-info');
    if (info) info.innerHTML = `
      <div class="file-item">
        <div class="file-thumb">🎬</div>
        <div class="file-info"><div class="file-name">${file.name}</div><div class="file-meta">${ImageConverter.formatSize(file.size)}</div></div>
      </div>
      <video controls src="${URL.createObjectURL(file)}" style="width:100%;border-radius:12px;margin-top:12px;max-height:260px" preload="metadata"></video>
    `;
    document.getElementById('video-action-bar')?.classList.remove('hidden');
    App.showToast('Video loaded', '🎬');
  },

  async convert() {
    if (!this.file) return;
    const format = document.getElementById('video-format')?.value || 'mp4';
    const statusEl = document.getElementById('video-status');
    if (statusEl) statusEl.textContent = 'Loading FFmpeg…';
    App.showToast('Video conversion may take several minutes for large files', '⏳');

    try {
      if (!this.ffmpeg) {
        const { createFFmpeg } = FFmpeg;
        this.ffmpeg = createFFmpeg({ log: false,
          progress: ({ ratio }) => {
            if (statusEl) statusEl.textContent = `Converting: ${Math.round(ratio*100)}%`;
          }
        });
        await this.ffmpeg.load();
      }
      const ext = this.file.name.split('.').pop();
      this.ffmpeg.FS('writeFile', `in.${ext}`, await FFmpeg.fetchFile(this.file));
      const args = format === 'gif'
        ? ['-i', `in.${ext}`, '-vf', 'fps=10,scale=480:-1', '-loop', '0', `out.${format}`]
        : ['-i', `in.${ext}`, '-c:v', 'libx264', '-c:a', 'aac', `out.${format}`];
      await this.ffmpeg.run(...args);
      const data = this.ffmpeg.FS('readFile', `out.${format}`);
      const blob = new Blob([data.buffer], { type: `video/${format}` });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = this.file.name.replace(/\.\w+$/, '') + '.' + format; a.click();
      if (statusEl) statusEl.textContent = '';
      App.showToast('Video converted!', '🎉');
    } catch(e) {
      if (statusEl) statusEl.textContent = '';
      App.showToast('Video conversion failed. File may be too large or unsupported.', '❌');
    }
  }
};

// =============================================
//  Boot
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  ImageConverter.init();
  ImageCompressor.init();
  PDFTools.init();
  AudioConverter.init();
  VideoConverter.init();
});
