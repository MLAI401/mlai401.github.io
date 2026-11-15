#!/usr/bin/env python3
"""
Re-theme the MLAI401 site to the CPP201 design (blue/green, light, academic).

  python3 cpp_theme.py <site_root>

1. style.css: CPP tokens in :root, Google-font import removed, and a
   "CPP201 theme layer" appended (flat background, white header bar,
   solid cards, navy headings, blue buttons/tabs, green eyebrows).
2. Every page / stylesheet / demo script: Tailwind-style colours
   (indigo, violet, cyan, sky, emerald, amber, rose, slate) mapped onto
   the CPP201 palette in one pass (no chained replacements), plus the
   same mapping for rgb()/rgba() triples.
3. Font names: Outfit / Plus Jakarta Sans -> system-ui (CPP's system
   stack); JetBrains Mono / Fira Code -> CPP's monospace stack.
Idempotent: running it twice changes nothing the second time.
"""
import os, re, sys

ROOT = sys.argv[1]
MARK = "/* ===== CPP201 theme layer"

HEX = {
    # slate neutrals
    "#0f172a": "#16202e", "#1e293b": "#16202e", "#334155": "#2c3644", "#475569": "#55606f",
    "#64748b": "#55606f", "#94a3b8": "#8a94a3", "#cbd5e1": "#c3cdda", "#e2e8f0": "#dbe2ec",
    "#f1f5f9": "#f1f4f9", "#f8fafc": "#f7f9fc",
    # indigo / blue  -> CPP blue
    "#4f46e5": "#1b4f9c", "#4338ca": "#0e2f5c", "#3730a3": "#0e2f5c", "#312e81": "#0e2f5c",
    "#6366f1": "#2461c0", "#818cf8": "#6f9be0", "#a5b4fc": "#9ec1f5", "#c7d2fe": "#c9daf5",
    "#e0e7ff": "#e8f0fc", "#eef2ff": "#e8f0fc",
    "#2563eb": "#2461c0", "#3b82f6": "#2461c0", "#1d4ed8": "#1b4f9c", "#1e40af": "#1b4f9c",
    "#1e3a8a": "#0e2f5c", "#60a5fa": "#6f9be0", "#93c5fd": "#9ec1f5", "#bfdbfe": "#c9daf5",
    "#dbeafe": "#e8f0fc", "#eff6ff": "#e8f0fc",
    # cyan / sky -> CPP blue-600 family
    "#0891b2": "#2461c0", "#06b6d4": "#3a78d4", "#0e7490": "#1b4f9c", "#155e75": "#0e2f5c",
    "#164e63": "#0e2f5c", "#22d3ee": "#6f9be0", "#67e8f9": "#9ec1f5", "#a5f3fc": "#c9daf5",
    "#cffafe": "#e8f0fc", "#ecfeff": "#eef4fd",
    "#0284c7": "#2461c0", "#0ea5e9": "#3a78d4", "#0369a1": "#1b4f9c", "#075985": "#0e2f5c",
    "#0c4a6e": "#0e2f5c", "#38bdf8": "#6f9be0", "#7dd3fc": "#9ec1f5", "#bae6fd": "#c9daf5",
    "#e0f2fe": "#e8f0fc", "#f0f9ff": "#eef4fd",
    # violet / pink -> CPP trace purple (#7c3aed is already CPP's)
    "#8b5cf6": "#7c3aed", "#a78bfa": "#a37bf0", "#c4b5fd": "#c9b0f7", "#ddd6fe": "#dccbfa",
    "#ede9fe": "#f1e9fd", "#f5f3ff": "#f1e9fd",
    "#db2777": "#7c3aed", "#ec4899": "#a37bf0", "#fdf2f8": "#f1e9fd", "#fce7f3": "#f1e9fd",
    # teal -> CPP green
    "#0d9488": "#3f8f2f", "#0f766e": "#3f8f2f", "#115e59": "#2a6a1f", "#14b8a6": "#5cae3c",
    "#5eead4": "#a6d690", "#99f6e4": "#c8e8bb", "#ccfbf1": "#eaf6e4", "#f0fdfa": "#eaf6e4",
    # emerald / green -> CPP success green
    "#10b981": "#2e8b47", "#059669": "#2e8b47", "#047857": "#2a7a3f", "#065f46": "#1f5e30",
    "#064e3b": "#1f5e30", "#34d399": "#5cae3c", "#6ee7b7": "#9fd3a9", "#a7f3d0": "#bfe5c9",
    "#d1fae5": "#e9f7ee", "#ecfdf5": "#e9f7ee",
    "#22c55e": "#2e8b47", "#16a34a": "#2e8b47", "#15803d": "#2a7a3f", "#166534": "#1f5e30",
    "#14532d": "#1f5e30", "#4ade80": "#5cae3c", "#86efac": "#9fd3a9", "#bbf7d0": "#bfe5c9",
    "#dcfce7": "#e9f7ee", "#f0fdf4": "#e9f7ee",
    # amber / yellow -> CPP warning
    "#f59e0b": "#d4911a", "#d97706": "#b9770e", "#b45309": "#b9770e", "#92400e": "#8a5a0b",
    "#78350f": "#6e4709", "#fbbf24": "#e0a83a", "#fcd34d": "#ecc77a", "#fde68a": "#f6dca8",
    "#fef3c7": "#fdf3e2", "#fffbeb": "#fdf3e2",
    "#eab308": "#d4911a", "#ca8a04": "#b9770e", "#a16207": "#8a5a0b", "#fef08a": "#f6dca8",
    "#fef9c3": "#fdf3e2", "#fefce8": "#fdf3e2",
    # red / rose -> CPP error
    "#ef4444": "#c0392b", "#dc2626": "#c0392b", "#e11d48": "#c0392b", "#f43f5e": "#c0392b",
    "#b91c1c": "#a93226", "#be123c": "#a93226", "#9f1239": "#922b21", "#991b1b": "#922b21",
    "#7f1d1d": "#7b241c", "#881337": "#7b241c", "#f87171": "#e07468", "#fb7185": "#e07468",
    "#fca5a5": "#f2b8b0", "#fda4af": "#f2b8b0", "#fecaca": "#f5c6c0", "#fecdd3": "#f5c6c0",
    "#fee2e2": "#fdecea", "#ffe4e6": "#fdecea", "#fef2f2": "#fdecea", "#fff1f2": "#fdecea",
}
RGB = {
    "79,70,229": "27,79,156", "67,56,202": "14,47,92", "99,102,241": "36,97,192",
    "37,99,235": "36,97,192", "59,130,246": "36,97,192", "29,78,216": "27,79,156",
    "6,182,212": "36,97,192", "8,145,178": "36,97,192", "34,211,238": "111,155,224",
    "14,165,233": "36,97,192", "2,132,199": "36,97,192",
    "139,92,246": "124,58,237", "219,39,119": "124,58,237", "236,72,153": "124,58,237",
    "16,185,129": "46,139,71", "5,150,105": "46,139,71", "34,197,94": "46,139,71",
    "20,184,166": "63,143,47", "13,148,136": "63,143,47",
    "245,158,11": "212,145,26", "217,119,6": "185,119,14", "234,179,8": "212,145,26",
    "244,63,94": "192,57,43", "239,68,68": "192,57,43", "225,29,72": "192,57,43", "220,38,38": "192,57,43",
    "15,23,42": "16,32,64", "51,65,85": "44,54,68", "71,85,105": "85,96,111", "100,116,139": "85,96,111",
    "148,163,184": "138,148,163", "203,213,225": "195,205,218", "226,232,240": "219,226,236",
    "248,250,252": "247,249,252", "6,9,19": "255,255,255",
}

HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b")
RGB_RE = re.compile(r"(rgba?\(\s*)(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*[,)])")
FONT_SUBS = [
    (re.compile(r"""(['"]?)Plus Jakarta Sans\1"""), "system-ui"),
    (re.compile(r"""(['"]?)Outfit\1(?=\s*[,;'")]|\s*$)"""), "system-ui"),
    (re.compile(r"""(['"])JetBrains Mono\1"""), "ui-monospace, SFMono-Regular, Consolas, Menlo"),
    (re.compile(r"""(['"])Fira Code\1"""), "ui-monospace, SFMono-Regular, Consolas, Menlo"),
]

def recolor(text):
    text = HEX_RE.sub(lambda m: HEX.get(m.group(0).lower(), m.group(0)), text)
    def rgb(m):
        k = "%s,%s,%s" % (m.group(2), m.group(3), m.group(4))
        if k not in RGB: return m.group(0)
        r, g, b = RGB[k].split(",")
        return m.group(1) + r + ", " + g + ", " + b + m.group(5)
    text = RGB_RE.sub(rgb, text)
    for rx, rep in FONT_SUBS:
        text = rx.sub(rep, text)
    return text

ROOT_TOKENS = """:root {
  /* ---- CPP201 design tokens (CPP201/assets/css/theme.css) ---- */
  --color-blue-900: #0e2f5c;
  --color-blue-700: #1b4f9c;
  --color-blue-600: #2461c0;
  --color-blue-100: #e8f0fc;
  --color-green-700: #3f8f2f;
  --color-green-600: #5cae3c;
  --color-green-100: #eaf6e4;
  --color-bg: #f7f9fc;
  --color-surface: #ffffff;
  --color-surface-alt: #f1f4f9;
  --color-text: #16202e;
  --color-text-muted: #55606f;
  --color-border: #dbe2ec;
  --color-success: #2e8b47;  --color-success-bg: #e9f7ee;
  --color-error: #c0392b;    --color-error-bg: #fdecea;
  --color-warning: #b9770e;  --color-warning-bg: #fdf3e2;
  --color-terminal-bg: #10151f;
  --color-terminal-text: #e3ecdf;
  --font-ui: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;

  /* ---- MLAI401 tokens, now pointing at the CPP palette ---- */
  --bg-base: var(--color-bg);
  --bg-surface: var(--color-surface);
  --bg-surface-hover: var(--color-surface);
  --bg-navbar: var(--color-surface);

  --primary: var(--color-blue-700);
  --primary-glow: rgba(27, 79, 156, 0.12);
  --secondary: var(--color-blue-600);
  --secondary-glow: rgba(36, 97, 192, 0.12);
  --accent: var(--color-green-700);
  --accent-pink: #7c3aed;
  --accent-purple: #7c3aed;
  --danger: var(--color-error);
  --success: var(--color-success);

  --text-primary: var(--color-text);
  --text-secondary: #3d4756;
  --text-muted: var(--color-text-muted);

  --border-light: var(--color-border);
  --border-focus: rgba(36, 97, 192, 0.45);

  --gradient-main: linear-gradient(135deg, var(--color-blue-700) 0%, var(--color-blue-600) 100%);
  --gradient-accent: linear-gradient(135deg, var(--color-blue-700) 0%, var(--color-green-700) 100%);
  --gradient-glow: linear-gradient(135deg, rgba(27, 79, 156, 0.03) 0%, rgba(63, 143, 47, 0.03) 100%);
  --gradient-text: linear-gradient(135deg, var(--color-blue-900) 0%, var(--color-blue-900) 100%);

  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.35s ease;

  --shadow-sm: 0 1px 3px rgba(16, 32, 64, 0.08);
  --shadow-md: 0 1px 3px rgba(16, 32, 64, 0.08);
  --shadow-lg: 0 6px 20px rgba(16, 32, 64, 0.10);
  --shadow-glow: 0 0 0 0 transparent;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}"""

THEME_LAYER = MARK + """ (cpp_theme.py) =====
   Overrides that make every MLAI401 page look like CPP201: flat light
   background, white header bar with pill nav links, solid white cards,
   navy headings, blue buttons and tabs, green eyebrow badges. */
body { font-family: var(--font-ui); background-color: var(--color-bg); color: var(--color-text); }
body::before, body::after, .ambient-glow-green { display: none !important; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-ui); letter-spacing: -0.01em; color: var(--color-blue-900); }
h1 { font-size: clamp(2rem, 4vw, 2.75rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); background: none; -webkit-text-fill-color: currentColor; color: var(--color-blue-900); }
.hero-title { font-size: clamp(2.25rem, 4.5vw, 3.25rem); }
code, pre, kbd, samp { font-family: var(--font-mono); }
::selection { background: var(--color-blue-100); }
::-webkit-scrollbar-thumb { background: #c3cdda; border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: #8a94a3; }

/* Cards: CPP .tre-bp-card / .topic-demo look */
.glass-panel { background: var(--color-surface); backdrop-filter: none; -webkit-backdrop-filter: none; border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); border-radius: var(--radius-md); }
.glass-panel:hover { background: var(--color-surface); border-color: #c3cdda; box-shadow: var(--shadow-sm); }

/* Header bar: CPP .site-header */
.navbar, .navbar-scrolled { background: var(--color-surface); backdrop-filter: none; -webkit-backdrop-filter: none; border-bottom: 1px solid var(--color-border); box-shadow: none; padding: 0; }
.logo { background: none; -webkit-text-fill-color: var(--color-blue-900); color: var(--color-blue-900); font-family: var(--font-ui); font-weight: 800; font-size: 1.2rem; gap: 12px; }
.logo-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-blue-700) 0%, var(--color-blue-700) 55%, var(--color-green-600) 100%); box-shadow: none; font-size: 1.2rem; }
.nav-links { gap: 4px; }
.nav-link { padding: 8px 14px; border-radius: var(--radius-sm); color: var(--color-text); font-weight: 600; font-size: 0.95rem; }
.nav-link::after { display: none; }
.nav-link:hover { background: var(--color-blue-100); color: var(--color-text); }
.nav-link.active { background: var(--color-blue-700); color: #fff; }
.nav-btn { border-radius: var(--radius-sm); background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-blue-700); padding: 8px 14px; }
.nav-btn:hover { background: var(--color-surface-alt); border-color: var(--color-border); box-shadow: none; color: var(--color-blue-700); }
@media (max-width: 768px) {
  .nav-links, .nav-links.active { background: var(--color-surface); backdrop-filter: none; -webkit-backdrop-filter: none; border-bottom: 1px solid var(--color-border); box-shadow: var(--shadow-sm); }
  .nav-link { display: block; }
}

/* Buttons: CPP .btn */
.btn { border-radius: var(--radius-sm); padding: 10px 18px; font-size: 15px; gap: 8px; }
.btn-primary { background: var(--color-blue-700); color: #fff; box-shadow: none; }
.btn-primary:hover { background: var(--color-blue-600); transform: none; box-shadow: none; }
.btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-blue-700); }
.btn-secondary:hover { background: var(--color-surface-alt); border-color: var(--color-border); transform: none; }

/* Eyebrows / badges: CPP green pill */
.hero-badge, .section-subtitle { color: var(--color-green-700); }
.hero-badge { background: var(--color-green-100); border: none; animation: none; letter-spacing: 0.06em; font-weight: 700; font-size: 0.8rem; }
.sl-topic-badge { background: var(--color-green-100); border: none; color: var(--color-green-700); }

/* Hero art and gradient text become solid CPP colours */
.hero-title, .stat-number { -webkit-text-fill-color: currentColor; background: none; }
.hero-title { color: var(--color-blue-900); }
.stat-number { color: var(--color-blue-700); }
.mesh-grid { background: linear-gradient(45deg, var(--color-blue-100), var(--color-green-100)); border: 2px solid var(--color-border); box-shadow: var(--shadow-sm); }
.mesh-grid::before { border-color: rgba(27, 79, 156, 0.25); }
.node-center { background: var(--color-blue-700); box-shadow: 0 0 0 8px var(--color-blue-100); }
.hero-glow-blob { display: none; }

/* Curriculum cards */
.curriculum-icon { background: var(--color-blue-100); border: 1px solid var(--color-border); color: var(--color-blue-700); box-shadow: none; }
.curriculum-card:hover .curriculum-icon { background: var(--color-blue-700); color: #fff; box-shadow: none; transform: none; }

/* Tabs: CPP .adt-topic-btn / pill tabs */
.playground-tabs { background: var(--color-surface-alt); border: 2px solid var(--color-border); }
.playground-tab { font-family: var(--font-ui); }
.playground-tab.active { background: var(--color-blue-700); box-shadow: none; }
.sl-topic-tab { font-family: var(--font-ui); background: var(--color-surface); border: 2px solid var(--color-border); color: var(--color-blue-900); }
.sl-topic-tab:hover { border-color: var(--color-blue-600); color: var(--color-blue-900); }
.sl-topic-tab.active { background: var(--color-blue-100); color: var(--color-blue-900); border-color: var(--color-blue-700); box-shadow: none; }
.sl-reading-btn { border-radius: var(--radius-sm); }

/* Footer: CPP .site-footer */
footer { background: var(--color-surface); backdrop-filter: none; -webkit-backdrop-filter: none; border-top: 1px solid var(--color-border); }
.footer-links a:hover { color: var(--color-blue-700); }
/* ===== end CPP201 theme layer ===== */
"""

def theme_style_css(path):
    s = open(path, encoding="utf-8").read()
    if MARK in s:
        return False
    s = re.sub(r"@import url\('https://fonts\.googleapis\.com/css2\?family=Outfit[^']*'\);\s*", "", s, count=1)
    a = s.index(":root {"); b = s.index("}", a) + 1
    s = s[:a] + ROOT_TOKENS + s[b:]
    s = recolor(s)
    s = s.rstrip() + "\n\n" + THEME_LAYER
    open(path, "w", encoding="utf-8").write(s)
    return True

SKIP_DIRS = {".git", "python_sandbox", "instructions", "reference", "profile", "node_modules"}
def targets():
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith(".")]
        for f in fns:
            if f.endswith((".html", ".css", ".js")) and not f.endswith((".bak", ".tmp")):
                yield os.path.join(dp, f)

if __name__ == "__main__":
    changed = []
    sp = os.path.join(ROOT, "style.css")
    if theme_style_css(sp):
        changed.append("style.css")
    for p in targets():
        if os.path.abspath(p) == os.path.abspath(sp):
            continue
        s = open(p, encoding="utf-8").read()
        t = recolor(s)
        if t != s:
            open(p, "w", encoding="utf-8").write(t)
            changed.append(os.path.relpath(p, ROOT))
    print(len(changed), "files changed")
    for c in changed: print("  ", c)
