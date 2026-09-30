# PinPaste · Clipboard Manager

[简体中文](README.md) | **English**

![Platform macOS](https://img.shields.io/badge/platform-macOS-lightgrey)
![Tauri 2](https://img.shields.io/badge/Tauri-2-blue)
![Data local only](https://img.shields.io/badge/data-local--only-orange)
![No backend](https://img.shields.io/badge/backend-none-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

> Everything you copy stays in a local SQLite file — summon it with ⌘ + ⇧ + V, hit Enter, and it lands at your cursor.

![Interface screenshot](https://cdn.jsdelivr.net/gh/isnotry/PinPaste@main/docs/screenshot-en.png)

**[Releases and versions](https://github.com/isnotry/PinPaste/releases)**

---

## What it is

PinPaste is a macOS desktop clipboard history tool. It runs in the background, records the text and images you copy, and lets you summon, search, favorite, and paste them back at any time.

It is a Tauri 2 shell (Rust backend + React 19 frontend). No server, no account, no network — all data lands in a single local SQLite file, and the window (440 × 620 by default) hides as soon as you are done.

## Features

- **Automatic capture** —— a background thread polls the clipboard every 700 ms, storing both text and images, skipping duplicates
- **Paste at the cursor** —— select an item and press Enter; the content is written back to the clipboard and ⌘ + V is simulated
- **Source tagging** —— every entry records the frontmost app at copy time (Safari, VS Code, …) and can be filtered by it
- **Favorites and groups** —— starred items are never auto-cleaned and can be filed into colored groups
- **Instant search** —— space-separated terms match with AND, case-insensitive, across content and name
- **Image history** —— images are saved as PNG, shown as thumbnails in the list, click to preview full size
- **Always on top** —— 📌 pins the window above everything else; the state persists across restarts
- **Auto clean** —— drops unfavorited entries older than 1 / 7 / 30 days (or off); above 1000 entries the oldest unfavorited ones go first
- **Quiet resident** —— lives in the menu bar tray, toggled by a global shortcut, hides on blur
- **Bilingual UI** —— 43 built-in translations, picked automatically from the system language

## Quick start

### Run the desktop app

```bash
npm install          # install frontend dependencies
npm run tauri dev    # start the full desktop app (frontend + Rust backend)
```

Requirements: Node.js 22+, a stable Rust toolchain, and Xcode Command Line Tools on macOS. The first time you use paste, macOS asks for Accessibility permission — grant it so PinPaste can simulate ⌘ + V inside other apps.

### Build an installer

```bash
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`. Ready-made `.dmg` builds are also on the [Releases](https://github.com/isnotry/PinPaste/releases) page — they are not signed with an Apple Developer certificate, so on first launch go to System Settings → Privacy & Security and click "Open Anyway" (or right-click the app and choose Open).

### Preview the UI in a browser

```bash
npm run dev          # open http://localhost:1420
```

Outside Tauri the app never calls the backend; it renders the demo data from `src/demo.ts`. Handy for previewing the UI and taking screenshots without installing Rust.

## UI reference

| Area            | Element                       | Purpose                                                          |
| --------------- | ----------------------------- | ---------------------------------------------------------------- |
| Header          | Search box                    | Filters the current tab as you type                              |
| Header          | 📌                            | Toggles always-on-top; state saved to `settings.pinned`          |
| Header          | ⚙️                            | Opens the settings panel                                         |
| Tabs            | ★ Favorites / Clipboard       | Favorited items / full clipboard history                         |
| Sidebar         | All                           | Clears filters and shows every entry                             |
| Sidebar         | Group name (Favorites tab)    | Filters by group; the left bar shows the group color             |
| Sidebar         | Current · App (Clipboard tab) | Shows only what you copied in the current frontmost app          |
| Sidebar         | Each source app               | Filters by source; list comes from `get_app_sources`             |
| List item       | Content / name                | Image entries show a thumbnail plus the file name                |
| List item       | Time · source                 | `MM-DD HH:mm`; the group name shows in the Favorites tab         |
| Item right side | ☆ / ★                         | Toggles favorite; favorites escape cleanup and the 1000-item cap |
| Settings panel  | Theme                         | System / Light / Dark                                            |
| Settings panel  | Auto clean                    | Off / 1 / 7 / 30 days                                            |
| Settings panel  | Language                      | 中文 / English                                                   |
| Settings panel  | Group manager                 | Rename, recolor, delete, and add groups                          |
| Panel footer    | Open source on GitHub         | Jumps to the source repository                                   |

## Keyboard shortcuts

| Key                  | Effect                                                    |
| -------------------- | --------------------------------------------------------- |
| `⌘ + ⇧ + V` (global) | Summons / hides the PinPaste window                       |
| `↑` / `↓`            | Moves the selection through the filtered list             |
| `Enter`              | Pastes the selected item at the current cursor            |
| `Backspace`          | Deletes the selected item (when the search box is empty)  |
| `Esc`                | Closes settings / edit dialog, otherwise hides the window |
| Double-click an item | Copies that item back to the clipboard                    |
| Right-click an item  | Opens the menu → Edit (content, group, delete)            |

When the window is not pinned it hides on blur, so the loop "copy elsewhere → summon → Enter" never needs a manual close.

## How it works

The monitoring loop (Rust background thread, one pass every 700 ms):

```text
Image: board.get_image() succeeds and hash differs from last  → store image
Text:  non-empty and differs from last after trim             → store text
Source: frontmost app name; skipped when it is PinPaste (never records its own write-back)
```

Auto clean and the size cap:

```text
Expiry:  created_at < now - days × 24h and favorite = 0  → delete (image file included)
         Default 30 days; choose 1 / 7 / 30, or 0 to disable; runs once at startup
Cap:     COUNT(items) > 1000 → delete the oldest unfavorited items, ascending by created_at
```

Favorites (`favorite = 1`) are exempt from both rules — once starred, an entry is never removed automatically.

## Data & privacy

No network, no account, no telemetry: everything is written to the local `app_data_dir` and disappears with it on uninstall.

| Location                           | Contents                                             |
| ---------------------------------- | ---------------------------------------------------- |
| `app_data_dir/pinpaste.db`         | SQLite database: `items` / `groups` / `settings`     |
| `app_data_dir/images/`             | Copied images, saved as PNG                          |
| `settings.auto_clean_days`         | Auto clean window in days (default 30)               |
| `settings.pinned`                  | Whether the window stays on top                      |
| `settings.lang`                    | Interface language                                   |
| localStorage `pinpaste-lang`       | Frontend language preference (falls back to browser) |
| localStorage `pinpaste-theme-mode` | Theme mode: `system` / `light` / `dark`              |

The only permission needed is **Accessibility**: pasting uses `enigo` to simulate ⌘ + V. Reading the clipboard itself needs nothing.

## Project layout

```text
pinpaste/
├── src/                        # React 19 + TypeScript frontend
│   ├── components/             # ItemList / ItemRow / EditDialog / ImageThumb / ImagePreview / SettingsPanel
│   ├── hooks/                  # useClipboardData (data layer) / useKeyboardNav (keys) / useLang (language)
│   ├── i18n.ts                 # Bilingual dictionary and lookup (43 entries)
│   ├── api.ts                  # Tauri command wrappers, all errors become ApiError
│   ├── demo.ts                 # Demo data used in browser preview (non-Tauri only)
│   ├── types.ts                # Shared frontend types
│   ├── theme.ts                # Theme resolution, persistence, system theme listener
│   ├── utils.ts                # Search matching and time formatting
│   ├── App.tsx                 # Main app
│   └── App.css                 # Global styles (design token system)
├── src-tauri/
│   ├── src/lib.rs              # Every Tauri command, monitor thread, SQLite access
│   ├── Cargo.toml              # Rust dependencies (rusqlite / arboard / enigo)
│   ├── tauri.conf.json         # Window, tray, and bundle configuration
│   └── capabilities/           # Permission configuration
├── docs/
│   └── design.md               # Design system notes (colors, spacing, component styles)
├── .github/workflows/ci.yml    # CI: lint / format / typecheck / test
├── CHANGELOG.md
├── CONTRIBUTING.md
└── overview.md
```

## Development notes

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Frontend only (demo data, no backend) |
| `npm run tauri dev`    | Full desktop app                      |
| `npm run tauri build`  | Build an installer                    |
| `npm run lint`         | ESLint check                          |
| `npm run format`       | Prettier format everything            |
| `npm run format:check` | Format check only (used by CI)        |
| `npm run typecheck`    | TypeScript type check                 |
| `npm run test`         | Vitest unit tests (43)                |

Conventions:

- No UI framework — everything uses the design tokens in `App.css`; read `docs/design.md` before touching colors or spacing
- A new Tauri command touches three places: `src-tauri/src/lib.rs`, `src-tauri/capabilities/`, and `src/api.ts`
- Rust commands receive camelCase arguments; `api.ts` already maps `group_id` → `groupId`
- The frontend never swallows errors: backend failures throw `ApiError`, and the UI decides between `console.error` and a toast
- CI runs the frontend gate only (lint / format / typecheck / test); Tauri packaging runs at release time

## Platform support

| Platform        | Status                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| macOS           | Full support: source app detection (NSWorkspace), global shortcut, tray, accessibility paste             |
| Windows / Linux | Compiles and runs; source app detection is not implemented yet (marked "Unknown"), everything else works |

Known limits: source detection is macOS-only, and the global shortcut is registered as `cmd+shift+v` — adjust it yourself on other platforms.

## License

[MIT](LICENSE) © 2026 isnotry
