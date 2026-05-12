import * as vscode from 'vscode';

const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u0800-\u083F\u0840-\u085F\u0860-\u086F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;

function containsRtl(text: string): boolean {
  return RTL_REGEX.test(text);
}

class MirrorPanel {
  public static current: MirrorPanel | undefined;
  private static readonly viewType = 'claudeCodeRtl.mirror';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static show(context: vscode.ExtensionContext, initialText?: string): MirrorPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    const targetColumn = column === vscode.ViewColumn.One ? vscode.ViewColumn.Beside : column;

    if (MirrorPanel.current) {
      MirrorPanel.current.panel.reveal(targetColumn, true);
      if (initialText) {
        MirrorPanel.current.push(initialText);
      }
      return MirrorPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      MirrorPanel.viewType,
      'Claude Code RTL',
      { viewColumn: targetColumn, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    MirrorPanel.current = new MirrorPanel(panel, context);
    if (initialText) {
      MirrorPanel.current.push(initialText);
    }
    return MirrorPanel.current;
  }

  private constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
    this.panel = panel;
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
    this.panel.webview.html = this.renderHtml();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg?.type) {
          case 'ready':
            this.postConfig();
            break;
          case 'copy':
            if (typeof msg.text === 'string') {
              await vscode.env.clipboard.writeText(msg.text);
              vscode.window.setStatusBarMessage('$(check) Claude Code RTL — copied', 1500);
            }
            break;
          case 'toast':
            if (typeof msg.text === 'string') {
              vscode.window.setStatusBarMessage(msg.text, 1500);
            }
            break;
        }
      },
      null,
      this.disposables
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('claudeCodeRtl')) {
          this.postConfig();
        }
      })
    );
  }

  public push(text: string) {
    if (!text) {
      return;
    }
    this.panel.webview.postMessage({ type: 'append', text, at: Date.now() });
  }

  public clear() {
    this.panel.webview.postMessage({ type: 'clear' });
  }

  public reveal() {
    this.panel.reveal(undefined, true);
  }

  private postConfig() {
    const cfg = vscode.workspace.getConfiguration('claudeCodeRtl');
    this.panel.webview.postMessage({
      type: 'config',
      fontFamily: cfg.get<string>('fontFamily', ''),
      fontSize: cfg.get<number>('fontSize', 15),
    });
  }

  private renderHtml(): string {
    const nonce = getNonce();
    const cspSource = this.panel.webview.cspSource;
    return /* html */ `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:; font-src ${cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Claude Code RTL</title>
  <style>
    :root {
      --pad: 14px;
      --radius: 10px;
      --border: var(--vscode-panel-border, rgba(128,128,128,0.25));
      --bg: var(--vscode-editor-background);
      --bg-soft: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-fg: var(--vscode-button-foreground);
      --accent-hover: var(--vscode-button-hoverBackground);
      --bubble: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      --code-bg: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.12));
    }

    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; height: 100%;
      background: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px var(--pad);
      border-bottom: 1px solid var(--border);
      background: var(--bg-soft);
      direction: ltr;
    }
    header .title {
      font-weight: 600;
      margin-inline-end: auto;
      letter-spacing: 0.2px;
    }
    header .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #19c37d;
      box-shadow: 0 0 0 0 rgba(25,195,125,0.5);
    }

    button {
      background: transparent;
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: background 120ms ease, transform 80ms ease;
      font-family: inherit;
    }
    button:hover { background: rgba(127,127,127,0.12); }
    button:active { transform: translateY(1px); }
    button.primary {
      background: var(--accent);
      color: var(--accent-fg);
      border-color: transparent;
    }
    button.primary:hover { background: var(--accent-hover); }

    .toolbar {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    main {
      flex: 1;
      overflow-y: auto;
      padding: var(--pad);
      direction: rtl;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--muted);
      gap: 8px;
      text-align: center;
      direction: rtl;
    }
    .empty .big { font-size: 42px; opacity: 0.5; }
    .empty .hint { max-width: 380px; line-height: 1.7; font-size: 13px; }
    .empty code {
      background: var(--code-bg);
      padding: 1px 6px; border-radius: 4px;
      font-family: var(--vscode-editor-font-family);
      direction: ltr; display: inline-block;
    }

    .bubble {
      background: var(--bubble);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      margin-bottom: 12px;
      position: relative;
      animation: pop 180ms ease-out;
    }
    @keyframes pop {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .bubble .meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 8px;
      direction: ltr;
    }
    .bubble .meta .actions { margin-inline-start: auto; display: flex; gap: 4px; }
    .bubble .meta .actions button { padding: 2px 8px; font-size: 11px; }

    .bubble .content {
      direction: rtl;
      unicode-bidi: plaintext;
      text-align: start;
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.85;
      font-family: var(--vscode-editor-font-family);
      font-size: 15px;
    }

    .bubble .content code,
    .bubble .content pre {
      font-family: var(--vscode-editor-font-family);
      background: var(--code-bg);
      border-radius: 6px;
      direction: ltr;
      unicode-bidi: embed;
      display: inline-block;
      padding: 0 6px;
      max-width: 100%;
    }
    .bubble .content pre {
      display: block;
      padding: 10px 12px;
      overflow-x: auto;
      white-space: pre;
      margin: 8px 0;
    }

    footer {
      border-top: 1px solid var(--border);
      padding: 8px var(--pad);
      font-size: 11px;
      color: var(--muted);
      display: flex;
      gap: 8px;
      align-items: center;
      direction: ltr;
    }
    footer .spacer { flex: 1; }
    footer kbd {
      background: var(--code-bg);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <span class="dot" title="Live"></span>
      <span class="title">Claude Code · RTL Mirror</span>
      <div class="toolbar">
        <button id="btn-paste" class="primary" title="Paste clipboard into the mirror">Paste</button>
        <button id="btn-clear" title="Clear all messages">Clear</button>
      </div>
    </header>

    <main id="stream">
      <div class="empty" id="empty">
        <div class="big">↹</div>
        <div class="hint">
          انسخ رد كلود ثم اضغط <strong>Paste</strong>،
          أو فعّل <strong>Auto-Watch</strong> من لوحة الأوامر:
          <br/><code>Claude Code RTL: Toggle Clipboard Auto-Watch</code>
        </div>
      </div>
    </main>

    <footer>
      <span>RTL ready · auto-detects Arabic / Hebrew / Persian</span>
      <span class="spacer"></span>
      <span><kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd> to paste here</span>
    </footer>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const stream = document.getElementById('stream');
    const empty = document.getElementById('empty');
    const btnPaste = document.getElementById('btn-paste');
    const btnClear = document.getElementById('btn-clear');

    let fontSize = 15;
    let fontFamily = '';

    function applyConfig() {
      document.documentElement.style.setProperty('--rtl-font-size', fontSize + 'px');
      const bubbles = document.querySelectorAll('.bubble .content');
      bubbles.forEach(b => {
        b.style.fontSize = fontSize + 'px';
        if (fontFamily) b.style.fontFamily = fontFamily;
      });
    }

    function timeNow() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    // Minimal markdown-ish: triple backticks => <pre>, single backticks => <code>
    function renderInline(text) {
      const escaped = escapeHtml(text);
      const withFences = escaped.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, (_, code) => {
        return '<pre>' + code.replace(/^\\n/, '') + '</pre>';
      });
      return withFences.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>');
    }

    function appendBubble(text) {
      if (empty) empty.remove();

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = '<span>' + timeNow() + '</span>'
        + '<span class="actions">'
        +   '<button data-action="copy">Copy</button>'
        +   '<button data-action="remove">Remove</button>'
        + '</span>';
      bubble.appendChild(meta);

      const content = document.createElement('div');
      content.className = 'content';
      content.innerHTML = renderInline(text);
      content.dataset.raw = text;
      if (fontFamily) content.style.fontFamily = fontFamily;
      content.style.fontSize = fontSize + 'px';
      bubble.appendChild(content);

      meta.querySelector('[data-action=copy]').addEventListener('click', () => {
        vscode.postMessage({ type: 'copy', text });
      });
      meta.querySelector('[data-action=remove]').addEventListener('click', () => {
        bubble.remove();
        if (!stream.querySelector('.bubble')) location.reload();
      });

      stream.appendChild(bubble);
      stream.scrollTop = stream.scrollHeight;
    }

    btnClear.addEventListener('click', () => location.reload());

    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          appendBubble(text);
        } else {
          vscode.postMessage({ type: 'toast', text: 'Clipboard is empty' });
        }
      } catch (e) {
        vscode.postMessage({ type: 'toast', text: 'Clipboard read blocked — use Ctrl/Cmd+V' });
      }
    });

    // Allow Ctrl/Cmd+V to paste straight into the panel.
    document.addEventListener('paste', (e) => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (text && text.trim()) {
        appendBubble(text);
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;
      switch (msg.type) {
        case 'append':
          if (typeof msg.text === 'string') appendBubble(msg.text);
          break;
        case 'clear':
          location.reload();
          break;
        case 'config':
          if (typeof msg.fontSize === 'number') fontSize = msg.fontSize;
          if (typeof msg.fontFamily === 'string') fontFamily = msg.fontFamily;
          applyConfig();
          break;
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  public dispose() {
    MirrorPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}

class ClipboardWatcher {
  private timer: NodeJS.Timeout | undefined;
  private lastSeen: string = '';
  private statusBar: vscode.StatusBarItem;

  constructor(
    private context: vscode.ExtensionContext,
    private onText: (text: string) => void
  ) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    this.statusBar.command = 'claudeCodeRtl.toggleAutoWatch';
    this.context.subscriptions.push(this.statusBar);
    this.refreshStatusBar(false);
    this.statusBar.show();
  }

  public start() {
    this.stop();
    const cfg = vscode.workspace.getConfiguration('claudeCodeRtl');
    const interval = cfg.get<number>('watchIntervalMs', 1200);
    this.refreshStatusBar(true);
    // Seed lastSeen so we don't immediately fire on whatever happens to be in the clipboard.
    vscode.env.clipboard.readText().then((t) => { this.lastSeen = t || ''; });

    this.timer = setInterval(async () => {
      try {
        const text = await vscode.env.clipboard.readText();
        if (!text || text === this.lastSeen) return;
        this.lastSeen = text;
        if (containsRtl(text)) {
          this.onText(text);
        }
      } catch {
        // ignore transient clipboard errors
      }
    }, interval);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.refreshStatusBar(false);
  }

  public toggle(): boolean {
    if (this.timer) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  public isRunning(): boolean {
    return this.timer !== undefined;
  }

  private refreshStatusBar(running: boolean) {
    this.statusBar.text = running ? '$(eye) RTL Watch' : '$(eye-closed) RTL Watch';
    this.statusBar.tooltip = running
      ? 'Clipboard auto-watch is ON — Arabic clipboard text is mirrored automatically. Click to disable.'
      : 'Clipboard auto-watch is OFF. Click to enable.';
  }

  public dispose() {
    this.stop();
    this.statusBar.dispose();
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function activate(context: vscode.ExtensionContext) {
  const watcher = new ClipboardWatcher(context, (text) => {
    const panel = MirrorPanel.show(context);
    panel.push(text);
  });
  context.subscriptions.push({ dispose: () => watcher.dispose() });

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeRtl.openMirror', () => {
      MirrorPanel.show(context);
    }),

    vscode.commands.registerCommand('claudeCodeRtl.mirrorClipboard', async () => {
      const text = await vscode.env.clipboard.readText();
      if (!text || !text.trim()) {
        vscode.window.showInformationMessage('Claude Code RTL: clipboard is empty.');
        return;
      }
      MirrorPanel.show(context, text);
    }),

    vscode.commands.registerCommand('claudeCodeRtl.mirrorSelection', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Claude Code RTL: no active editor.');
        return;
      }
      const text = editor.document.getText(editor.selection);
      if (!text.trim()) {
        vscode.window.showInformationMessage('Claude Code RTL: selection is empty.');
        return;
      }
      MirrorPanel.show(context, text);
    }),

    vscode.commands.registerCommand('claudeCodeRtl.toggleAutoWatch', async () => {
      const running = watcher.toggle();
      const cfg = vscode.workspace.getConfiguration('claudeCodeRtl');
      await cfg.update('autoWatchClipboard', running, vscode.ConfigurationTarget.Global);
      vscode.window.setStatusBarMessage(
        running ? '$(eye) RTL clipboard watch ON' : '$(eye-closed) RTL clipboard watch OFF',
        2000
      );
      if (running && !MirrorPanel.current) {
        MirrorPanel.show(context);
      }
    }),

    vscode.commands.registerCommand('claudeCodeRtl.clearMirror', () => {
      MirrorPanel.current?.clear();
    })
  );

  const cfg = vscode.workspace.getConfiguration('claudeCodeRtl');
  if (cfg.get<boolean>('autoWatchClipboard', false)) {
    watcher.start();
  }
  if (cfg.get<boolean>('openOnStartup', false)) {
    MirrorPanel.show(context);
  }
}

export function deactivate() {
  MirrorPanel.current?.dispose();
}
