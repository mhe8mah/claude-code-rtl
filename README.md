# Claude Code RTL

> A tiny VS Code extension that fixes Arabic / Hebrew / Persian replies from **Claude Code** (and any other LTR webview) by mirroring them into a clean, theme-aware right-to-left panel.

![status](https://img.shields.io/badge/status-active-19c37d) ![license](https://img.shields.io/badge/license-MIT-blue)

## Why

Claude Code's chat panel renders its content **left-to-right**. When the reply is in Arabic, the *words* are correct but the *line direction* is wrong — punctuation jumps, mixed code/text breaks, and the screen becomes painful to read.

`Claude Code RTL` does **not** patch Claude Code itself. Instead it gives you a beautiful side panel that takes any text (clipboard, selection, manual paste) and re-renders it with proper:

- `direction: rtl`
- `unicode-bidi: plaintext` — so each paragraph follows its own natural direction
- LTR islands for inline `code` and ```` ``` ```` fenced blocks
- VS Code theme colors, fonts, and sizing

Result: Arabic that finally reads the way it should — without leaving VS Code.

## Install

From source (until published to the Marketplace):

```bash
git clone https://github.com/mhe8mah/claude-code-rtl.git
cd claude-code-rtl
npm install
npm run compile
# Then press F5 in VS Code to launch the Extension Development Host,
# or package it:
npx vsce package
code --install-extension claude-code-rtl-0.1.0.vsix
```

## Use

Open the Command Palette (`Ctrl/Cmd+Shift+P`) and run any of:

| Command | What it does |
| --- | --- |
| `Claude Code RTL: Open Mirror Panel` | Opens the side panel |
| `Claude Code RTL: Mirror Clipboard Now` | Pushes whatever is in your clipboard into the panel |
| `Claude Code RTL: Mirror Editor Selection` | Pushes the current editor selection |
| `Claude Code RTL: Toggle Clipboard Auto-Watch` | Auto-mirrors any RTL text copied to the clipboard |
| `Claude Code RTL: Clear Mirror Panel` | Wipes the panel |

There's also a status-bar toggle (👁 *RTL Watch*) — one click turns the auto-watcher on or off.

### Typical flow with Claude Code

1. Ask Claude Code something in Arabic.
2. Select the reply in Claude's panel and **Copy**.
3. Switch to the *Claude Code RTL* panel and hit **Paste** (or just `Ctrl/Cmd+V`).
4. Read comfortably. Done.

Even better — enable **Auto-Watch** once and it just keeps mirroring every Arabic copy you make.

## Settings

```jsonc
"claudeCodeRtl.autoWatchClipboard": false,    // start the clipboard watcher automatically
"claudeCodeRtl.watchIntervalMs":    1200,     // polling interval
"claudeCodeRtl.fontFamily":         "",       // override the panel font (empty = editor font)
"claudeCodeRtl.fontSize":           15,
"claudeCodeRtl.openOnStartup":      false
```

## How it works

- **Mirror Panel** is a VS Code webview locked to `dir="rtl"`, with `unicode-bidi: plaintext` on every bubble — so paragraph direction is decided per-paragraph from the first strong character. English lines inside an Arabic reply still render LTR.
- **Code blocks** are explicitly flipped back to LTR with `unicode-bidi: embed`, so snippets read normally.
- **Clipboard auto-watch** polls `vscode.env.clipboard` at the configured interval, detects RTL characters via a small Unicode regex (Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic, Arabic Extended-A, Presentation Forms A/B), and only mirrors content that actually needs flipping.
- All styling uses VS Code's CSS variables — the panel follows your theme automatically.

## Limitations

VS Code's extension API doesn't allow one extension to modify another extension's webview DOM. That's why this works as a **companion panel** rather than a patch on Claude Code itself. In practice, paste-or-auto-watch is just as fast.

## Contributing

Issues and PRs welcome. Open one at the [GitHub repo](https://github.com/mhe8mah/claude-code-rtl/issues).

## License

MIT — see [LICENSE](LICENSE).
