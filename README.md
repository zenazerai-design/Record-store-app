# Zena Zerai: Portfolio

A small, warm record store of selected work. A single-page portfolio for **Zena Zerai, Senior Product Designer**, themed after a dim vinyl shop: amber chandeliers, sleeve-and-disc case studies, a slow-spinning Side B, and the high-contrast Studio Namma type voice.

## Stack

Plain HTML, CSS and a touch of JS, with no build step and no dependencies. Fonts are pulled from Google Fonts:

- **Instrument Serif** (display, italic): closest free match to Studio Namma's *PP Editorial New*
- **Inter** (body)
- **JetBrains Mono** (record-label kickers)

## Run it

Just open `index.html` in a browser. Or, if you prefer a local server (recommended so the image loads cleanly on every browser):

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## GitHub Pages (why you might see 404)

Publishing is controlled in the repository **Settings**, not by `git push` alone.

**Easiest setup (no Actions required):**

1. GitHub repo → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. **Branch:** `main`, **Folder:** `/ (root)` → **Save**.
4. Wait about one minute. The project URL is  
   `https://<user-or-org>.github.io/Record-store-app/`  
   (folder name must match the repository name, including capitals).

**If you use the included Actions workflow instead:**

1. **Source** must be **GitHub Actions** (not “Deploy from a branch” at the same time).
2. Open the **Actions** tab and ensure **Deploy to GitHub Pages** succeeded.
3. First run: check **Settings → Environments → `github-pages`** and approve any waiting deployment/waitlisted protection rules.

**Private repository:** GitHub often does **not** serve a **public** `github.io` site for **private** repos unless your plan/settings allow “GitHub Pages on private repositories.” If Pages stays blank or 404, try making the repo **public** under **Settings → General → Danger Zone** (only if that is acceptable), or host on Netlify/Vercel/Cloudflare Pages instead.

## File structure

```
.
├── index.html          # Markup: hero, marquee, works, about, contact
├── styles.css          # Theme, type, layout, motion
├── script.js           # Tap-to-flip, scroll reveals, nav lift
├── assets/
│   └── record-store.png  # Hero backdrop
└── README.md
```

## Sections

1. **Hero**: Dimmed record-store backdrop, big italic name, "33⅓ RPM" record-shop ticker.
2. **Marquee**: A slow scrolling banner ("Selected Works ✦ Senior Product Designer ✦ …").
3. **Works (The Catalogue)**: Case studies as flippable vinyl sleeves. Hover (or tap on mobile) to peek the disc and reveal liner notes and a tracklist.
4. **About (Liner Notes)**: A spinning vinyl on the left, the artist's bio and "what I do" tracklist on the right.
5. **Contact (End of Side B)**: Big italic call-to-action and the usual links.

## Customising

- **Case studies** live in `index.html` under `<ul class="crate">`. Each `<li class="record">` has a sleeve gradient (set inline via `--sleeve`), a sticker title block, and the back-side liner notes / tracklist.
- **Colours** are CSS variables at the top of `styles.css` (`--bg`, `--amber`, `--cream`, etc.).
- **Fonts** can be swapped by changing the `<link>` in `index.html` and the `--serif` / `--sans` / `--mono` variables.

## Accessibility

- Real semantic HTML (`<header>`, `<nav>`, `<section>`, `<footer>`).
- Records are keyboard-flippable (Enter / Space) with visible focus.
- Honours `prefers-reduced-motion`, which disables the marquee, the spinning vinyl, and reveal transitions.

## Notes

- The hero image is the user-provided record-store photo; it lives in `assets/record-store.png`.
- The film grain is an inline SVG (no extra request).
