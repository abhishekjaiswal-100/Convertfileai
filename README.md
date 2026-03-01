# ⚡ FileForge — Free File Converter & Compressor

Beautiful, 100% browser-based file conversion. No server needed.

## 📁 Folder Structure
```
fileforge/
├── index.html                  ← Main website
├── css/
│   └── style.css               ← All styling (glassmorphism 2026 design)
├── js/
│   └── main.js                 ← All JavaScript (all tools)
├── .github/
│   └── workflows/
│       └── deploy.yml          ← Auto-deploy to GitHub Pages
├── sitemap.xml                 ← Google SEO
├── robots.txt                  ← Search crawlers
└── README.md                   ← This file
```

## 🚀 Upload to GitHub from Laptop

### Step 1 — Clone your empty repo
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 2 — Copy all files into the folder
Copy the entire `fileforge` folder contents into your cloned repo folder.
Make sure to include the hidden `.github` folder!

**On Windows:** In File Explorer → View → Check "Hidden Items" to see `.github`
**On Mac:** Press `Cmd + Shift + .` to show hidden files

### Step 3 — Push to GitHub
```bash
git add .
git commit -m "Launch FileForge website"
git push origin main
```

### Step 4 — Enable GitHub Pages
```
1. Go to your repo on GitHub.com
2. Click Settings tab
3. Click Pages (left sidebar)
4. Under Source: select "GitHub Actions"
5. The deploy.yml workflow runs automatically
6. Your site goes live at: https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

---

## 💰 Google AdSense Setup

### After 2–4 weeks of being live:
1. Go to https://adsense.google.com
2. Sign in → Add your site URL
3. Wait for approval email
4. Once approved, open `index.html`
5. Find this comment at the top:
```html
<!-- Google AdSense — Uncomment after approval & replace publisher ID -->
<!--
<script async src="...?client=ca-pub-XXXXXXXXXXXXXXXXX"...></script>
-->
```
6. Remove the `<!--` and `-->` around the script tag
7. Replace `ca-pub-XXXXXXXXXXXXXXXXX` with your real Publisher ID
8. For each `📢 Ad · 728×90` placeholder in the page, replace with real AdSense `<ins>` tags
9. Push changes to GitHub — done!

---

## 🔧 Customize Your Website Name

Find and replace `FileForge` in:
- `index.html` (logo text, title, footer, meta tags)
- `README.md`

---

## 📈 After Launch SEO Checklist

- [ ] Submit to Google Search Console: https://search.google.com/search-console
- [ ] Submit sitemap: `https://yourdomain.com/sitemap.xml`
- [ ] Submit to Bing Webmaster Tools
- [ ] Update `sitemap.xml` with your real domain
- [ ] Update `robots.txt` with your real domain
- [ ] Update `index.html` meta tags with your real domain

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 | Structure & 2026 glassmorphism design |
| Vanilla JavaScript | All tool logic |
| PDF-lib (CDN) | PDF compress, merge, split, rotate |
| PDF.js (CDN) | PDF to image conversion |
| FFmpeg.wasm (CDN) | Audio & video conversion |
| GitHub Pages | Free hosting |
| GitHub Actions | Auto-deploy on push |
| Google AdSense | Monetization |

---

Made with ❤️ — Ready to earn!
