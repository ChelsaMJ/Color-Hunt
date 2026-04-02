# 🎨 Color Hunt

A personal photo gallery web app built for collecting and showcasing weekly color-themed photography. Each week has a color theme — you upload your best shots tagged to that week, browse them in a stunning 3D carousel lightbox, and track your growing archive over time.

---

## ✨ Features

### 🖼️ Gallery
- **Masonry grid** layout with smooth hover overlays
- **4 display modes** — Grid, Coverflow, Stack, and Reel — switchable from the filter bar
- **Week filter** — filter photos by color week
- **Gallery info bar** — shows caption, uploader, and date for the active card in non-grid modes

### 💡 Lightbox — 3D Ring Carousel
- All photos arranged on a **true 3D rotating ring** (inspired by [@johnblazek's TweenMax pen](https://codepen.io/johnblazek/pen/EgWbPw))
- **Mouse-steered** — move your cursor left/right to spin the ring; up/down tilts it
- **Fly-in animation** — each card animates in from a random 3D position on open
- **Click any card** to snap it to the front
- **Arrow keys / nav buttons / swipe** to step through photos
- **Active card glow** — front card highlights with the week's accent colour
- **Info panel** — updates in real time as cards rotate to the front

### 📅 Weeks Manager
- Create **color weeks** with a name, hex color, and date range
- Each photo is tagged to a week
- Week badge shown in the gallery and lightbox info panel

### ⚙️ Settings Panel
- **Background behavior** — static, parallax scroll, or fixed
- **Hero font picker** — choose from curated Google Fonts
- **Dark aesthetic** — pure black base with accent color theming

### 💾 Data & Storage
- Photos stored in **IndexedDB** (survives page refreshes, no server needed)
- App state (weeks, settings, gallery mode) stored in **localStorage**
- Fully **offline-capable** — no backend required

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (custom properties, glassmorphism, animations) |
| Logic | Vanilla JavaScript (ES2020+) |
| 3D Animations | [GSAP 3](https://gsap.com/) (GreenSock) |
| Storage | IndexedDB + localStorage |
| Fonts | Google Fonts |

No frameworks. No build step. Just open `index.html`.

---

## 🚀 Running Locally

### Option 1 — Python (built-in)
```bash
python -m http.server 3000
# then open http://localhost:3000
```

### Option 2 — Node.js
```bash
npx serve .
```

### Option 3 — VS Code
Install the **Live Server** extension and click **Go Live**.

> ⚠️ Opening `index.html` directly as a `file://` URL may block IndexedDB in some browsers. Use a local server instead.

---

## 📁 Project Structure

```
Color Hunt/
├── index.html     # App shell — all HTML structure
├── styles.css     # All styling (design system, components, lightbox)
├── app.js         # All logic (gallery, lightbox, weeks, settings, DB)
└── README.md
```

---

## 🗂️ How to Use

1. **Create a Week** — click the `+` FAB (bottom-left) to add a color week with a name and hex color
2. **Upload Photos** — click **Upload** in the nav, fill in the form, pick your photo, and submit
3. **Browse** — switch gallery modes from the control bar; click any photo to open the 3D carousel lightbox
4. **Navigate the lightbox** — move your mouse, use arrow keys, or click the nav buttons
5. **Delete** — use the trash icon in the lightbox topbar

---

## 🎨 Design Notes

- Pure black (`#000`) background — no greys, no washed-out darks
- Accent color is **lime green** (`#c8ff00`) by default, dynamically overridden per week
- Glassmorphism panels with `backdrop-filter: blur()`
- All interactions use a custom cursor (`cursor: none` + JS-tracked dot)
- Smooth micro-animations throughout via CSS keyframes and GSAP

---

## 📸 Credits

- 3D carousel technique inspired by [John Blazek's TweenMax pen](https://codepen.io/johnblazek/pen/EgWbPw)
- 3D animations powered by [GSAP](https://gsap.com/)
- Icons from inline SVG (no icon library dependency)

---

*Made with ♥ for Color Hunters*
