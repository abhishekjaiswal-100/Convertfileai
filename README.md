# ⚡ FileForge — Free File Converter & Compressor

A beautiful, 100% browser-based file conversion and compression website.
No server required. Deploys free on GitHub Pages.

## 🚀 Features

- **Image Converter** — JPG ↔ PNG ↔ WebP ↔ BMP ↔ GIF (batch support)
- **Image Compressor** — Reduce size up to 90% without quality loss
- **PDF Compress** — Reduce PDF file size
- **PDF Merge** — Combine multiple PDFs into one
- **PDF Split** — Extract pages or split into individual files
- **PDF Rotate** — Rotate pages 90°/180°/270°
- **PDF to Images** — Convert PDF pages to JPG/PNG
- **Audio Converter** — MP3, WAV, OGG, AAC, FLAC (via FFmpeg.wasm)
- **Video Converter** — MP4, AVI, MOV, WebM, GIF (via FFmpeg.wasm)

## 🌐 Deploy to GitHub Pages (Free)

### Step 1: Create GitHub Repository
```
1. Go to https://github.com/new
2. Name it: fileforge (or your website name)
3. Set to Public
4. Click "Create repository"
```

### Step 2: Upload Files
```bash
git clone https://github.com/YOUR_USERNAME/fileforge.git
# Copy all files from this folder into the cloned folder
git add .
git commit -m "Initial FileForge launch"
git push origin main
```

### Step 3: Enable GitHub Pages
```
1. Go to your repo on GitHub
2. Click Settings → Pages
3. Source: Select "GitHub Actions"
4. The workflow in .github/workflows/deploy.yml will auto-deploy
5. Your site will be live at: https://YOUR_USERNAME.github.io/fileforge/
```

### Step 4: Connect Custom Domain (When Ready)
```
1. Buy domain (Namecheap, GoDaddy, Cloudflare, etc.)
2. In GitHub repo → Settings → Pages → Custom domain
3. Add your domain e.g. fileforge.com
4. In your domain DNS settings, add:
   - CNAME record: www → YOUR_USERNAME.github.io
   - A records (for apex domain):
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
5. Check "Enforce HTTPS" in GitHub Pages settings
```

## 💰 Google AdSense Setup

### Step 1: Apply for AdSense
```
1. Go to https://adsense.google.com
2. Sign in with Google account
3. Enter your website URL (GitHub Pages URL first)
4. Fill in payment info
5. Wait for approval (usually 2-4 weeks)
   NOTE: Site must have real content and some traffic
```

### Step 2: Add Your Ad Code
Once approved, replace the ad slot placeholders in index.html:

Find this comment in index.html:
```html
<!-- Google AdSense — Replace ca-pub-XXXXXXXXXX with your Publisher ID -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script> -->
```

Uncomment it and replace `ca-pub-XXXXXXXXXX` with your real publisher ID.

Then for each ad slot, replace the placeholder div with your actual AdSense ins tag:
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
     data-ad-slot="YOUR_AD_SLOT_ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

### AdSense Approval Tips
- Make sure Privacy Policy, Terms, and About pages are complete ✅
- Have at least some traffic before applying
- Ensure content is original and useful ✅
- Site must be live for a few weeks

## 📁 File Structure

```
fileforge/
├── index.html          ← Main app (all pages inside)
├── css/
│   └── style.css       ← All styles
├── js/
│   └── main.js         ← All JavaScript logic
├── sitemap.xml         ← For Google indexing
├── robots.txt          ← For search crawlers
├── .github/
│   └── workflows/
│       └── deploy.yml  ← Auto-deploy to GitHub Pages
└── README.md           ← This file
```

## 🔧 Customization

### Change Website Name
Find `FileForge` in index.html and replace with your domain name.

### Add More Tools
Copy a tool card in the tools grid and a new page section.

### Colors
Edit CSS variables in `css/style.css` under `:root {}` and `[data-theme="dark"] {}`.

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 / CSS3 | UI & Layout |
| Vanilla JavaScript | App logic |
| CSS Glassmorphism | 2026 visual design |
| PDF-lib | PDF manipulation |
| PDF.js | PDF to image |
| FFmpeg.wasm | Audio & video conversion |
| GitHub Pages | Free hosting |
| GitHub Actions | Auto-deploy |
| Google AdSense | Monetization |

## 📈 SEO Checklist
- [x] Meta title & description
- [x] Open Graph tags
- [x] sitemap.xml
- [x] robots.txt
- [x] Semantic HTML
- [ ] Submit sitemap to Google Search Console
- [ ] Submit to Bing Webmaster Tools

## 📮 Submit to Google Search Console

1. Go to https://search.google.com/search-console
2. Add your domain
3. Verify ownership (HTML file or DNS)
4. Submit sitemap: `https://yourdomain.com/sitemap.xml`

---

Made with ❤️ — Ready to earn with Google AdSense!
