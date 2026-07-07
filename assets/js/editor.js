/**
 * EditorApp — Browser-based multi-file code editor
 * Powered by Monaco Editor (VS Code engine)
 * No data is persisted — everything resets on reload.
 */
(function () {
    'use strict';

    // ─── Default file tree loaded on every visit ──────────────────────────────
    var DEFAULT_FILES = [
        {
            id: 'f-html', type: 'file', name: 'index.html', parentId: null,
            content: [
                '<!DOCTYPE html>',
                '<html lang="en">',
                '<head>',
                '    <meta charset="UTF-8">',
                '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                '    <title>My Page</title>',
                '    <link rel="stylesheet" href="style.css">',
                '</head>',
                '<body>',
                '',
                '    <h1>Hello World!</h1>',
                '    <p>Edit me in the code editor.</p>',
                '',
                '    <script src="script.js"><\/script>',
                '</body>',
                '</html>',
            ].join('\n')
        },
        {
            id: 'f-css', type: 'file', name: 'style.css', parentId: null,
            content: [
                '/* Reset */',
                '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
                '',
                'body {',
                '    font-family: system-ui, sans-serif;',
                '    background: #030305;',
                '    color: #fff;',
                '    min-height: 100vh;',
                '    display: flex;',
                '    align-items: center;',
                '    justify-content: center;',
                '}',
                '',
                'h1 {',
                '    font-size: 3rem;',
                '    background: linear-gradient(90deg, #5024F4, #9D7FFF);',
                '    -webkit-background-clip: text;',
                '    -webkit-text-fill-color: transparent;',
                '}',
            ].join('\n')
        },
        {
            id: 'f-js', type: 'file', name: 'script.js', parentId: null,
            content: [
                '// Your JavaScript goes here',
                '',
                'document.addEventListener("DOMContentLoaded", function () {',
                '    console.log("Page loaded!");',
                '});',
            ].join('\n')
        },
        {
            id: 'folder-utils', type: 'folder', name: 'utils', parentId: null,
            expanded: true
        },
        {
            id: 'f-util', type: 'file', name: 'helpers.js', parentId: 'folder-utils',
            content: [
                '/**',
                ' * Utility helpers',
                ' */',
                '',
                'export function clamp(value, min, max) {',
                '    return Math.min(Math.max(value, min), max);',
                '}',
                '',
                'export function debounce(fn, delay) {',
                '    let timer;',
                '    return function (...args) {',
                '        clearTimeout(timer);',
                '        timer = setTimeout(() => fn.apply(this, args), delay);',
                '    };',
                '}',
            ].join('\n')
        }
    ];

    // ─── State ─────────────────────────────────────────────────────────────────
    var state = {
        files: [],              // flat list of {id, type, name, parentId, content, expanded}
        openTabs: [],           // array of file ids
        activeTabLeft: null,    // id of active file in left pane
        activeTabRight: null,   // id of active file in right pane (split mode)
        splitMode: false,
        wordWrap: false,
        monacoReady: false,
        editorLeft: null,
        editorRight: null,
        activePane: 'left',
        ctxTargetId: null,
    };

    var idCounter = 0;
    function genId() { return 'item-' + (++idCounter) + '-' + Date.now(); }

    // ─── Language detection ─────────────────────────────────────────────────────
    var LANG_MAP = {
        js: 'javascript', mjs: 'javascript', cjs: 'javascript',
        ts: 'typescript', tsx: 'typescript',
        jsx: 'javascript',
        html: 'html', htm: 'html',
        css: 'css', scss: 'scss', sass: 'scss', less: 'less',
        json: 'json', jsonc: 'json',
        md: 'markdown', markdown: 'markdown',
        xml: 'xml', svg: 'xml',
        yaml: 'yaml', yml: 'yaml',
        sh: 'shell', bash: 'shell', zsh: 'shell',
        py: 'python',
        rb: 'ruby',
        php: 'php',
        java: 'java',
        c: 'c', h: 'c',
        cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
        cs: 'csharp',
        go: 'go',
        rs: 'rust',
        sql: 'sql',
        bdfd: 'bdfd',
        txt: 'plaintext',
    };

    function getLang(filename) {
        var ext = (filename.split('.').pop() || '').toLowerCase();
        return LANG_MAP[ext] || 'plaintext';
    }

    function getLangLabel(lang) {
        var labels = {
            javascript: 'JavaScript', typescript: 'TypeScript', html: 'HTML',
            css: 'CSS', scss: 'SCSS', less: 'Less', json: 'JSON',
            markdown: 'Markdown', xml: 'XML', yaml: 'YAML', shell: 'Shell',
            python: 'Python', ruby: 'Ruby', php: 'PHP', java: 'Java',
            c: 'C', cpp: 'C++', csharp: 'C#', go: 'Go', rust: 'Rust',
            sql: 'SQL', bdfd: 'BDFD', plaintext: 'Plain Text',
        };
        return labels[lang] || lang;
    }

    function getFileIcon(name) {
        var ext = (name.split('.').pop() || '').toLowerCase();
        var icons = {
            html: '🌐', htm: '🌐',
            css: '🎨', scss: '🎨', sass: '🎨', less: '🎨',
            js: '📜', mjs: '📜', cjs: '📜',
            ts: '🔷', tsx: '🔷',
            jsx: '⚛️',
            json: '📋',
            md: '📝', markdown: '📝',
            xml: '📄', svg: '🖼️',
            yaml: '⚙️', yml: '⚙️',
            sh: '💻', bash: '💻', zsh: '💻',
            py: '🐍',
            rb: '💎',
            php: '🐘',
            java: '☕',
            go: '🦫',
            rs: '🦀',
            sql: '🗃️',
            db: '🗄️',
            bdfd: '🤖',
            txt: '📃',
        };
        return icons[ext] || '📄';
    }

    // ─── Initialise ─────────────────────────────────────────────────────────────
    function init() {
        var preload = null;
        try { preload = JSON.parse(sessionStorage.getItem('editor-preload') || 'null'); } catch (e) {}
        if (preload && Array.isArray(preload) && preload.length) {
            sessionStorage.removeItem('editor-preload');
            state.files = preload.map(function (f) {
                return { id: genId(), type: 'file', name: f.name, parentId: null, content: f.content };
            });
        } else {
            state.files = JSON.parse(JSON.stringify(DEFAULT_FILES));
        }
        renderTree();
        loadMonaco(function () {
            state.monacoReady = true;
            var firstFile = state.files.find(function (f) { return f.type === 'file'; });
            if (firstFile) openFile(firstFile.id);
        });
        bindGlobalEvents();
    }

    // ─── Monaco Loader ──────────────────────────────────────────────────────────
    function loadMonaco(cb) {
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            // Theme
            monaco.editor.defineTheme('dev-codelist', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', foreground: 'e2e8f0', background: '030305' },
                    { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
                    { token: 'string', foreground: '9D7FFF' },
                    { token: 'number', foreground: '7B4FFF' },
                    { token: 'keyword', foreground: '5024F4', fontStyle: 'bold' },
                    { token: 'tag', foreground: '7B4FFF' },
                    { token: 'variable', foreground: 'a78bfa' },
                    { token: 'attribute.name', foreground: '9D7FFF' },
                    { token: 'attribute.value', foreground: 'a78bfa' },
                ],
                colors: {
                    'editor.background': '#030305',
                    'editor.foreground': '#e2e8f0',
                    'editorLineNumber.foreground': '#2d3748',
                    'editorLineNumber.activeForeground': '#5024F4',
                    'editor.selectionBackground': '#5024F430',
                    'editor.inactiveSelectionBackground': '#5024F420',
                    'editorCursor.foreground': '#7B4FFF',
                    'editor.lineHighlightBackground': '#0a0a14',
                    'editorWidget.background': '#0a0a0c',
                    'editorWidget.border': '#1a1a2e',
                    'editorSuggestWidget.background': '#0a0a0c',
                    'editorSuggestWidget.border': '#1a1a2e',
                    'editorSuggestWidget.selectedBackground': '#5024F430',
                    'scrollbar.shadow': '#00000000',
                    'scrollbarSlider.background': '#ffffff0f',
                    'scrollbarSlider.hoverBackground': '#ffffff1a',
                    'scrollbarSlider.activeBackground': '#5024F440',
                    'minimap.background': '#030305',
                    'statusBar.background': '#030305',
                    'tab.activeBackground': '#0a0a12',
                    'tab.inactiveBackground': '#030305',
                    'editorBracketMatch.background': '#5024F425',
                    'editorBracketMatch.border': '#9D7FFF',
                }
            });
            monaco.editor.setTheme('dev-codelist');

            // ─── BDFD Language ────────────────────────────────────────────────
            monaco.languages.register({ id: 'bdfd' });
            monaco.languages.setMonarchTokensProvider('bdfd', {
                defaultToken: '',
                brackets: [
                    { open: '{', close: '}', token: 'delimiter.curly' },
                    { open: '[', close: ']', token: 'delimiter.square' },
                    { open: '(', close: ')', token: 'delimiter.parenthesis' },
                ],
                tokenizer: {
                    root: [
                        [/#.*$/, 'comment'],
                        [/\$[a-zA-Z_]\w*(?=\[)/, { token: 'tag', next: '@funcargs' }],
                        [/\$[a-zA-Z_]\w*/, 'tag'],
                        [/\{[a-zA-Z]+:(?:[^}]*)\}/, 'keyword'],
                        [/\{[a-zA-Z]+\}/, 'keyword'],
                        [/\{[a-zA-Z_]\w*\}/, 'variable'],
                        [/"/, { token: 'string.quote', next: '@string_double' }],
                        [/'/, { token: 'string.quote', next: '@string_single' }],
                        [/\d+/, 'number'],
                        [/[=!<>]=/, 'operator.keyword'],
                        [/[&]{2}|[|]{2}/, 'operator.keyword'],
                        [/[+\-*/%^]/, 'operator'],
                        [/[;]/, 'delimiter'],
                        [/[,.]/, 'delimiter'],
                    ],
                    funcargs: [
                        [/#.*$/, 'comment'],
                        [/\$[a-zA-Z_]\w*(?=\[)/, { token: 'tag', next: '@funcargs' }],
                        [/\$[a-zA-Z_]\w*/, 'tag'],
                        [/\]/, { token: 'delimiter.square', next: '@pop' }],
                        [/;/, 'delimiter'],
                        [/"/, { token: 'string.quote', next: '@string_double' }],
                        [/'/, { token: 'string.quote', next: '@string_single' }],
                        [/\d+/, 'number'],
                        [/\{[a-zA-Z_]\w*\}/, 'variable'],
                        [/[=!<>]=/, 'operator.keyword'],
                        [/[&]{2}|[|]{2}/, 'operator.keyword'],
                        [/[+\-*/%^]/, 'operator'],
                        [/[ \t\r\n]+/, 'white'],
                        [/[^\]\[$; \t\r\n]+/, ''],
                    ],
                    string_double: [
                        [/[^\\"]+/, 'string'],
                        [/\\./, 'string.escape'],
                        [/"/, { token: 'string.quote', next: '@pop' }],
                    ],
                    string_single: [
                        [/[^\\']+/, 'string'],
                        [/\\./, 'string.escape'],
                        [/'/, { token: 'string.quote', next: '@pop' }],
                    ],
                }
            });

            var commonOpts = {
                theme: 'dev-codelist',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                lineHeight: 22,
                fontLigatures: true,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                renderWhitespace: 'selection',
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'line',
                padding: { top: 16, bottom: 16 },
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                matchBrackets: 'never',
                wordWrap: 'off',
                suggest: { showStatusBar: true },
            };

            state.editorLeft = monaco.editor.create(
                document.getElementById('monaco-container-left'),
                Object.assign({}, commonOpts, { model: null })
            );
            state.editorRight = monaco.editor.create(
                document.getElementById('monaco-container-right'),
                Object.assign({}, commonOpts, { model: null })
            );

            // Cursor position → status bar
            state.editorLeft.onDidChangeCursorPosition(function (e) {
                if (state.activePane === 'left') updateStatusPos(e.position);
            });
            state.editorRight.onDidChangeCursorPosition(function (e) {
                if (state.activePane === 'right') updateStatusPos(e.position);
            });

            // Track active pane
            state.editorLeft.onDidFocusEditorText(function () { state.activePane = 'left'; });
            state.editorRight.onDidFocusEditorText(function () { state.activePane = 'right'; });

            // Custom bracket matching (works inside strings/template literals too)
            setupBracketHighlight(state.editorLeft);
            setupBracketHighlight(state.editorRight);

            if (cb) cb();
        });
    }

    function updateStatusPos(pos) {
        var el = document.getElementById('status-pos');
        if (el) el.textContent = 'Ln ' + pos.lineNumber + ', Col ' + pos.column;
    }

    // ─── Custom bracket highlighting (works in strings & template literals) ────
    function setupBracketHighlight(editor) {
        var PAIRS = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
        var OPEN  = { '(': true, '[': true, '{': true };
        var CLOSE = { ')': true, ']': true, '}': true };
        var decorIds = [];

        editor.onDidChangeCursorPosition(function () {
            var model = editor.getModel();
            if (!model) { decorIds = editor.deltaDecorations(decorIds, []); return; }

            var pos     = editor.getPosition();
            var line    = model.getLineContent(pos.lineNumber);
            var col     = pos.column - 1; // 0-based

            var bChar = null, bCol = -1;
            var before = col > 0 ? line[col - 1] : null;
            var after  = col < line.length ? line[col] : null;

            if (before && (OPEN[before] || CLOSE[before])) { bChar = before; bCol = col - 1; }
            else if (after && (OPEN[after]  || CLOSE[after]))  { bChar = after;  bCol = col; }

            if (!bChar) { decorIds = editor.deltaDecorations(decorIds, []); return; }

            var match = findBracketMatch(model, pos.lineNumber, bCol, bChar, PAIRS, OPEN, CLOSE);
            if (!match) { decorIds = editor.deltaDecorations(decorIds, []); return; }

            decorIds = editor.deltaDecorations(decorIds, [
                {
                    range: new monaco.Range(pos.lineNumber, bCol + 1, pos.lineNumber, bCol + 2),
                    options: { inlineClassName: 'bracket-match-hl' }
                },
                {
                    range: new monaco.Range(match.line, match.col + 1, match.line, match.col + 2),
                    options: { inlineClassName: 'bracket-match-hl' }
                }
            ]);
        });
    }

    function findBracketMatch(model, startLine, startCol, bChar, PAIRS, OPEN, CLOSE) {
        var target = PAIRS[bChar];
        var forward = !!OPEN[bChar];
        var depth = 1;
        var totalLines = model.getLineCount();
        var line, c, content, start, ch;

        if (forward) {
            for (line = startLine; line <= totalLines; line++) {
                content = model.getLineContent(line);
                start = (line === startLine) ? startCol + 1 : 0;
                for (c = start; c < content.length; c++) {
                    ch = content[c];
                    if (ch === bChar)  depth++;
                    else if (ch === target) { depth--; if (depth === 0) return { line: line, col: c }; }
                }
            }
        } else {
            for (line = startLine; line >= 1; line--) {
                content = model.getLineContent(line);
                start = (line === startLine) ? startCol - 1 : content.length - 1;
                for (c = start; c >= 0; c--) {
                    ch = content[c];
                    if (ch === bChar)  depth++;
                    else if (ch === target) { depth--; if (depth === 0) return { line: line, col: c }; }
                }
            }
        }
        return null;
    }

    // ─── File tree rendering ────────────────────────────────────────────────────
    function renderTree() {
        var container = document.getElementById('file-tree');
        container.innerHTML = '';
        var roots = state.files.filter(function (f) { return !f.parentId; });
        roots.forEach(function (item) { renderTreeItem(container, item, 0); });
    }

    function renderTreeItem(parent, item, depth) {
        var row = document.createElement('div');
        row.className = 'tree-row' +
            (item.type === 'file' && item.id === state.activeTabLeft ? ' tree-row-active' : '');
        row.dataset.id = item.id;
        row.style.paddingLeft = (12 + depth * 16) + 'px';

        if (item.type === 'folder') {
            var chevron = document.createElement('span');
            chevron.className = 'tree-chevron' + (item.expanded ? ' expanded' : '');
            chevron.innerHTML = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            row.appendChild(chevron);

            var icon = document.createElement('span');
            icon.className = 'tree-folder-icon';
            icon.textContent = item.expanded ? '📂' : '📁';
            row.appendChild(icon);
        } else {
            var spacer = document.createElement('span');
            spacer.style.width = '16px';
            spacer.style.flexShrink = '0';
            row.appendChild(spacer);

            var fileIcon = document.createElement('span');
            fileIcon.className = 'tree-file-icon';
            fileIcon.textContent = getFileIcon(item.name);
            row.appendChild(fileIcon);
        }

        var label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = item.name;
        row.appendChild(label);

        // Click → open file / toggle folder
        row.addEventListener('click', function (e) {
            e.stopPropagation();
            if (item.type === 'folder') {
                item.expanded = !item.expanded;
                renderTree();
            } else {
                openFile(item.id);
            }
        });

        // Right-click → context menu
        row.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, item.id);
        });

        parent.appendChild(row);

        // Render children
        if (item.type === 'folder' && item.expanded) {
            var children = state.files.filter(function (f) { return f.parentId === item.id; });
            children.forEach(function (child) { renderTreeItem(parent, child, depth + 1); });
        }
    }

    // ─── Open files / tabs ──────────────────────────────────────────────────────
    function openFile(id) {
        var file = getFile(id);
        if (!file || file.type !== 'file') return;

        if (state.openTabs.indexOf(id) === -1) {
            state.openTabs.push(id);
        }

        if (state.splitMode && state.activePane === 'right') {
            state.activeTabRight = id;
        } else {
            state.activeTabLeft = id;
            state.activePane = 'left';
        }

        renderTabs();
        renderTree();
        syncEditor();
        updateStatusBar();
    }

    function closeTab(id) {
        var idx = state.openTabs.indexOf(id);
        state.openTabs.splice(idx, 1);

        if (state.activeTabLeft === id) {
            state.activeTabLeft = state.openTabs[Math.max(0, idx - 1)] || state.openTabs[0] || null;
        }
        if (state.activeTabRight === id) {
            state.activeTabRight = null;
        }

        renderTabs();
        renderTree();
        syncEditor();
        updateStatusBar();
    }

    function renderTabs() {
        var list = document.getElementById('tab-list');
        list.innerHTML = '';
        state.openTabs.forEach(function (id) {
            var file = getFile(id);
            if (!file) return;

            var tab = document.createElement('div');
            var isActiveLeft = id === state.activeTabLeft;
            var isActiveRight = id === state.activeTabRight;
            tab.className = 'editor-tab' +
                (isActiveLeft ? ' tab-active-left' : '') +
                (isActiveRight ? ' tab-active-right' : '');
            tab.dataset.id = id;

            var icon = document.createElement('span');
            icon.className = 'tab-icon';
            icon.textContent = getFileIcon(file.name);
            tab.appendChild(icon);

            var name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = file.name;
            tab.appendChild(name);

            var close = document.createElement('button');
            close.className = 'tab-close';
            close.innerHTML = '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            close.title = 'Close';
            close.addEventListener('click', function (e) {
                e.stopPropagation();
                closeTab(id);
            });
            tab.appendChild(close);

            tab.addEventListener('click', function () {
                if (state.splitMode) {
                    // Click on tab: open in focused pane
                    openFile(id);
                } else {
                    state.activeTabLeft = id;
                    state.activePane = 'left';
                    renderTabs();
                    renderTree();
                    syncEditor();
                    updateStatusBar();
                }
            });

            list.appendChild(tab);
        });
    }

    // ─── Monaco model sync ──────────────────────────────────────────────────────
    var _modelChangeDisposers = new WeakMap();

    function syncEditor() {
        if (!state.monacoReady) return;
        var fileL = state.activeTabLeft ? getFile(state.activeTabLeft) : null;
        var isDb = fileL && fileL.name.toLowerCase().endsWith('.db');
        var monacoLeft = document.getElementById('monaco-container-left');
        var dbViewer = document.getElementById('db-viewer');
        if (isDb) {
            monacoLeft.style.display = 'none';
            dbViewer.classList.remove('hidden');
            state.editorLeft.setModel(null);
            renderDbViewer(fileL);
        } else {
            closeActiveDb();
            monacoLeft.style.display = '';
            dbViewer.classList.add('hidden');
            setEditorFile(state.editorLeft, fileL, 'left');
        }
        // Right pane (always Monaco)
        var fileR = state.splitMode && state.activeTabRight ? getFile(state.activeTabRight) : null;
        setEditorFile(state.editorRight, fileR, 'right');
    }

    function setEditorFile(editor, file, pane) {
        if (!file) {
            editor.setModel(null);
            return;
        }
        var lang = getLang(file.name);
        var existing = monaco.editor.getModels().find(function (m) {
            return m.uri && m.uri.path === '/' + file.id;
        });
        if (!existing) {
            existing = monaco.editor.createModel(file.content, lang, monaco.Uri.parse('file:///' + file.id));
        }
        editor.setModel(existing);

        // Keep model in sync with state — only add listener once per model
        if (!_modelChangeDisposers.has(existing)) {
            var disposable = existing.onDidChangeContent(function () {
                var f = getFile(file.id);
                if (f) f.content = existing.getValue();
            });
            _modelChangeDisposers.set(existing, disposable);
            existing.onDidDispose(function () {
                var d = _modelChangeDisposers.get(existing);
                if (d) { d.dispose(); _modelChangeDisposers.delete(existing); }
            });
        }
    }

    // ─── Status bar ─────────────────────────────────────────────────────────────
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function updateStatusBar() {
        var activeId = state.activePane === 'right' ? state.activeTabRight : state.activeTabLeft;
        var file = activeId ? getFile(activeId) : null;
        var langEl = document.getElementById('status-lang');
        var linesEl = document.getElementById('status-lines');
        var isDb = file && file.name.toLowerCase().endsWith('.db');
        if (langEl) langEl.textContent = isDb ? 'SQLite' : (file ? getLangLabel(getLang(file.name)) : 'No file');
        if (linesEl) linesEl.textContent = isDb ? (file.dbBuffer ? formatBytes(file.dbBuffer.byteLength) : '—') : (file ? (file.content.split('\n').length + ' lines') : '—');
    }

    // ─── Split view ─────────────────────────────────────────────────────────────
    window.EditorApp = window.EditorApp || {};

    EditorApp.toggleSplit = function () {
        state.splitMode = !state.splitMode;
        var right = document.getElementById('monaco-container-right');
        var divider = document.getElementById('split-divider');
        right.classList.toggle('hidden', !state.splitMode);
        divider.classList.toggle('hidden', !state.splitMode);
        if (!state.splitMode) {
            state.activeTabRight = null;
            state.activePane = 'left';
        } else {
            // Default: open same file in right pane
            state.activeTabRight = state.activeTabLeft;
            state.activePane = 'right';
        }
        renderTabs();
        syncEditor();
    };

    // ─── Word wrap ──────────────────────────────────────────────────────────────
    EditorApp.toggleWrap = function () {
        state.wordWrap = !state.wordWrap;
        var wrap = state.wordWrap ? 'on' : 'off';
        state.editorLeft && state.editorLeft.updateOptions({ wordWrap: wrap });
        state.editorRight && state.editorRight.updateOptions({ wordWrap: wrap });
    };

    // ─── Format document ────────────────────────────────────────────────────────
    EditorApp.formatDoc = function () {
        var editor = state.activePane === 'right' ? state.editorRight : state.editorLeft;
        if (editor) editor.getAction('editor.action.formatDocument').run();
    };

    // ─── Download active file ────────────────────────────────────────────────────
    EditorApp.downloadActive = function () {
        var id = state.activePane === 'right' ? state.activeTabRight : state.activeTabLeft;
        if (!id) return;
        var file = getFile(id);
        if (file) downloadFile(file.name, file.content);
    };

    function downloadFile(name, content) {
        var blob = new Blob([content], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ─── Download all as ZIP ─────────────────────────────────────────────────────
    EditorApp.downloadAll = function (triggerBtn) {
        // Minimal ZIP builder (no external lib needed for text files)
        var files = state.files.filter(function (f) { return f.type === 'file'; });
        if (!files.length) return;

        // Visual feedback on whichever button triggered the call
        var label = document.getElementById('sidebar-dl-label');
        if (label) {
            label.textContent = 'Preparing ZIP…';
            setTimeout(function () { label.textContent = 'Download all (.zip)'; }, 1800);
        }
        if (triggerBtn && triggerBtn.classList.contains('sidebar-icon-btn--zip')) {
            var origColor = triggerBtn.style.color;
            triggerBtn.style.color = '#7B4FFF';
            setTimeout(function () { triggerBtn.style.color = origColor; }, 1800);
        }

        // Build path (walks up the full parent chain)
        function getPath(f) {
            if (!f.parentId) return f.name;
            var parent = getFile(f.parentId);
            if (!parent) return f.name;
            return getPath(parent) + '/' + f.name;
        }

        var parts = [];
        var centralDir = [];
        var offset = 0;

        files.forEach(function (f) {
            var path = getPath(f);
            var content = f.content;
            var enc = new TextEncoder ? new TextEncoder().encode(content) : encodeUtf8Bytes(content);
            var pathBytes = new TextEncoder ? new TextEncoder().encode(path) : encodeUtf8Bytes(path);

            var local = buildLocalFileHeader(pathBytes, enc);
            parts.push(local, enc);
            centralDir.push(buildCentralDirEntry(pathBytes, enc, offset));
            offset += local.length + enc.length;
        });

        var cdSize = centralDir.reduce(function (a, b) { return a + b.length; }, 0);
        var eocd = buildEOCD(files.length, cdSize, offset);

        var all = [];
        parts.forEach(function (p) { all.push(p); });
        centralDir.forEach(function (p) { all.push(p); });
        all.push(eocd);

        var total = all.reduce(function (a, b) { return a + b.length; }, 0);
        var buf = new Uint8Array(total);
        var pos = 0;
        all.forEach(function (part) { buf.set(part, pos); pos += part.length; });

        var blob = new Blob([buf], { type: 'application/zip' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'code-editor-files.zip';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    function crc32(data) {
        var table = crc32.table || (function () {
            var t = [];
            for (var i = 0; i < 256; i++) {
                var c = i;
                for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                t[i] = c;
            }
            return (crc32.table = t);
        })();
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function encodeUtf8Bytes(str) {
        var encoded = encodeURIComponent(str);
        var bytes = [];
        for (var i = 0; i < encoded.length; i++) {
            var c = encoded.charAt(i);
            if (c === '%') {
                bytes.push(parseInt(encoded.charAt(i + 1) + encoded.charAt(i + 2), 16));
                i += 2;
            } else {
                bytes.push(c.charCodeAt(0));
            }
        }
        return new Uint8Array(bytes);
    }

    function u16le(v) { return [v & 0xFF, (v >> 8) & 0xFF]; }
    function u32le(v) { return [v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF]; }

    function buildLocalFileHeader(pathBytes, data) {
        var crc = crc32(data);
        var arr = [
            0x50, 0x4B, 0x03, 0x04, // signature
            0x14, 0x00,             // version needed
            0x00, 0x00,             // flags
            0x00, 0x00,             // compression (stored)
            0x00, 0x00, 0x00, 0x00, // mod time/date
        ].concat(u32le(crc))
         .concat(u32le(data.length))
         .concat(u32le(data.length))
         .concat(u16le(pathBytes.length))
         .concat([0x00, 0x00]);     // extra field length
        return new Uint8Array(arr.concat(Array.from(pathBytes)));
    }

    function buildCentralDirEntry(pathBytes, data, localOffset) {
        var crc = crc32(data);
        var arr = [
            0x50, 0x4B, 0x01, 0x02,
            0x14, 0x00,
            0x14, 0x00,
            0x00, 0x00,
            0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ].concat(u32le(crc))
         .concat(u32le(data.length))
         .concat(u32le(data.length))
         .concat(u16le(pathBytes.length))
         .concat([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
         .concat(u32le(localOffset));
        return new Uint8Array(arr.concat(Array.from(pathBytes)));
    }

    function buildEOCD(count, cdSize, cdOffset) {
        return new Uint8Array([
            0x50, 0x4B, 0x05, 0x06,
            0x00, 0x00, 0x00, 0x00,
        ].concat(u16le(count))
         .concat(u16le(count))
         .concat(u32le(cdSize))
         .concat(u32le(cdOffset))
         .concat([0x00, 0x00]));
    }

    // ─── Download folder as ZIP ──────────────────────────────────────────────────
    EditorApp.downloadFolder = function (id) {
        var folder = getFile(id);
        if (!folder || folder.type !== 'folder') return;

        function collectFiles(folderId) {
            var result = [];
            state.files.filter(function (f) { return f.parentId === folderId; }).forEach(function (item) {
                if (item.type === 'file') result.push(item);
                else result = result.concat(collectFiles(item.id));
            });
            return result;
        }

        function getPathInFolder(file) {
            if (file.parentId === id) return folder.name + '/' + file.name;
            var parent = getFile(file.parentId);
            return parent ? getPathInFolder(parent) + '/' + file.name : folder.name + '/' + file.name;
        }

        var files = collectFiles(id);
        if (!files.length) return;

        var enc = new TextEncoder();
        var parts = [], centralDir = [], offset = 0;

        files.forEach(function (f) {
            var path = getPathInFolder(f);
            var data = enc.encode(f.content);
            var pathBytes = enc.encode(path);
            var local = buildLocalFileHeader(pathBytes, data);
            parts.push(local, data);
            centralDir.push(buildCentralDirEntry(pathBytes, data, offset));
            offset += local.length + data.length;
        });

        var cdSize = centralDir.reduce(function (a, b) { return a + b.length; }, 0);
        var eocd = buildEOCD(files.length, cdSize, offset);
        var all = [];
        parts.forEach(function (p) { all.push(p); });
        centralDir.forEach(function (p) { all.push(p); });
        all.push(eocd);
        var total = all.reduce(function (a, b) { return a + b.length; }, 0);
        var buf = new Uint8Array(total);
        var pos = 0;
        all.forEach(function (part) { buf.set(part, pos); pos += part.length; });

        var blob = new Blob([buf], { type: 'application/zip' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = folder.name + '.zip';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // ─── Upload ───────────────────────────────────────────────────────────────────
    EditorApp.triggerUploadFiles = function () {
        document.getElementById('upload-files-input').value = '';
        document.getElementById('upload-files-input').click();
    };

    EditorApp.triggerUploadFolder = function () {
        document.getElementById('upload-folder-input').value = '';
        document.getElementById('upload-folder-input').click();
    };

    function readFileAsText(file) {
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result || ''); };
            reader.onerror = function () { resolve(''); };
            reader.readAsText(file);
        });
    }

    function readFileAsArrayBuffer(file) {
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result || null); };
            reader.onerror = function () { resolve(null); };
            reader.readAsArrayBuffer(file);
        });
    }

    function addFileFromPath(relativePath, content, forceParentId, extra) {
        var parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
        if (!parts.length) return;

        var currentParentId = (forceParentId !== undefined) ? forceParentId : null;
        for (var i = 0; i < parts.length - 1; i++) {
            var folderName = parts[i];
            (function (fn, pid) {
                var existing = state.files.find(function (f) {
                    return f.type === 'folder' && f.name === fn && f.parentId === pid;
                });
                if (!existing) {
                    existing = { id: genId(), type: 'folder', name: fn, parentId: pid, expanded: true };
                    state.files.push(existing);
                }
                currentParentId = existing.id;
            })(folderName, currentParentId);
        }

        var fileName = parts[parts.length - 1];
        var existingFile = state.files.find(function (f) {
            return f.type === 'file' && f.name === fileName && f.parentId === currentParentId;
        });
        if (existingFile) {
            existingFile.content = content;
            if (extra) Object.assign(existingFile, extra);
            if (state.monacoReady && !extra) {
                var model = monaco.editor.getModels().find(function (m) {
                    return m.uri && m.uri.path === '/' + existingFile.id;
                });
                if (model) model.setValue(content);
            }
        } else {
            var newEntry = { id: genId(), type: 'file', name: fileName, parentId: currentParentId, content: content };
            if (extra) Object.assign(newEntry, extra);
            state.files.push(newEntry);
        }
    }

    function extractZip(file) {
        if (!window.JSZip) {
            alert('ZIP support not available. Please upload individual files.');
            return Promise.resolve();
        }
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (e) {
                JSZip.loadAsync(e.target.result).then(function (zip) {
                    var promises = [];
                    zip.forEach(function (relativePath, zipEntry) {
                        if (!zipEntry.dir) {
                            promises.push(
                                zipEntry.async('string').then(function (content) {
                                    addFileFromPath(relativePath, content, null);
                                })
                            );
                        }
                    });
                    Promise.all(promises).then(resolve);
                }).catch(function () {
                    alert('Could not read ZIP file.');
                    resolve();
                });
            };
            reader.onerror = function () { resolve(); };
            reader.readAsArrayBuffer(file);
        });
    }

    function handleFileUpload(files) {
        var promises = [];
        Array.from(files).forEach(function (file) {
            var relativePath = file.webkitRelativePath || file.name;
            if (file.name.toLowerCase().endsWith('.zip')) {
                promises.push(extractZip(file));
            } else if (file.name.toLowerCase().endsWith('.db')) {
                promises.push(
                    readFileAsArrayBuffer(file).then(function (buffer) {
                        addFileFromPath(relativePath, '', null, { dbBuffer: buffer });
                    })
                );
            } else {
                promises.push(
                    readFileAsText(file).then(function (content) {
                        addFileFromPath(relativePath, content, null);
                    })
                );
            }
        });
        Promise.all(promises).then(function () {
            renderTree();
            updateStatusBar();
        });
    }

    // ─── Drag & Drop ──────────────────────────────────────────────────────────────
    function bindDragDrop() {
        var overlay = document.getElementById('drag-overlay');
        var dragCounter = 0;

        function hasFiles(dt) {
            return dt && dt.types && Array.from(dt.types).indexOf('Files') !== -1;
        }

        document.addEventListener('dragenter', function (e) {
            if (!hasFiles(e.dataTransfer)) return;
            e.preventDefault();
            dragCounter++;
            overlay.style.display = 'flex';
        });

        document.addEventListener('dragleave', function (e) {
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                overlay.style.display = 'none';
            }
        });

        document.addEventListener('dragover', function (e) {
            if (hasFiles(e.dataTransfer)) e.preventDefault();
        });

        document.addEventListener('drop', function (e) {
            if (!hasFiles(e.dataTransfer)) return;
            e.preventDefault();
            dragCounter = 0;
            overlay.style.display = 'none';
            handleDropItems(e.dataTransfer.items);
        });
    }

    function readAllEntries(reader) {
        return new Promise(function (resolve) {
            var all = [];
            function batch() {
                reader.readEntries(function (entries) {
                    if (!entries.length) { resolve(all); return; }
                    all = all.concat(Array.from(entries));
                    batch();
                }, function () { resolve(all); });
            }
            batch();
        });
    }

    function processDropEntry(entry, pathPrefix) {
        var fullPath = pathPrefix ? pathPrefix + '/' + entry.name : entry.name;
        if (entry.isFile) {
            return new Promise(function (resolve) {
                entry.file(function (file) {
                    if (file.name.toLowerCase().endsWith('.zip')) {
                        extractZip(file).then(function () { renderTree(); resolve(); });
                    } else {
                        readFileAsText(file).then(function (content) {
                            addFileFromPath(fullPath, content, null);
                            resolve();
                        });
                    }
                }, resolve);
            });
        } else if (entry.isDirectory) {
            return readAllEntries(entry.createReader()).then(function (entries) {
                return Promise.all(entries.map(function (e) {
                    return processDropEntry(e, fullPath);
                }));
            });
        }
        return Promise.resolve();
    }

    function handleDropItems(items) {
        if (!items || !items.length) return;
        var promises = [];
        Array.from(items).forEach(function (item) {
            var entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) promises.push(processDropEntry(entry, null));
        });
        Promise.all(promises).then(function () {
            renderTree();
            updateStatusBar();
        });
    }

    // ─── New file/folder ─────────────────────────────────────────────────────────
    var _modalMode = 'file';
    var _modalParent = null;

    EditorApp.newFile = function (parentId) {
        _modalMode = 'file';
        _modalParent = parentId || null;
        openModal('New File', 'filename.js');
    };

    EditorApp.newFolder = function (parentId) {
        _modalMode = 'folder';
        _modalParent = parentId || null;
        openModal('New Folder', 'folder-name');
    };

    function openModal(title, placeholder) {
        var el = document.getElementById('new-item-modal');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-input').value = '';
        document.getElementById('modal-input').placeholder = placeholder;
        el.classList.remove('hidden');
        setTimeout(function () { document.getElementById('modal-input').focus(); }, 50);
    }

    EditorApp.closeModal = function () {
        var el = document.getElementById('new-item-modal');
        el.classList.add('hidden');
    };

    EditorApp.confirmModal = function () {
        var name = document.getElementById('modal-input').value.trim();
        if (!name) {
            var inp = document.getElementById('modal-input');
            inp.classList.add('modal-input-error');
            inp.focus();
            setTimeout(function () { inp.classList.remove('modal-input-error'); }, 1200);
            return;
        }
        EditorApp.closeModal();
        if (_modalMode === 'file') {
            var f = { id: genId(), type: 'file', name: name, parentId: _modalParent, content: '' };
            state.files.push(f);
            renderTree();
            openFile(f.id);
        } else {
            var folder = { id: genId(), type: 'folder', name: name, parentId: _modalParent, expanded: true };
            state.files.push(folder);
            renderTree();
        }
    };

    // ─── Clear all ───────────────────────────────────────────────────────────────
    EditorApp.clearAll = function () {
        if (!confirm('Delete all files? This cannot be undone.')) return;
        monaco.editor.getModels().forEach(function (m) { m.dispose(); });
        state.files = [];
        state.openTabs = [];
        state.activeTabLeft = null;
        state.activeTabRight = null;
        state.splitMode = false;
        document.getElementById('monaco-container-right').classList.add('hidden');
        document.getElementById('split-divider').classList.add('hidden');
        renderTree();
        renderTabs();
        if (state.editorLeft) state.editorLeft.setValue('');
    };

    // ─── Reset ──────────────────────────────────────────────────────────────────
    EditorApp.resetAll = function () {
        if (!confirm('Reset all files to defaults? All unsaved changes will be lost.')) return;
        // Dispose all models
        monaco.editor.getModels().forEach(function (m) { m.dispose(); });
        state.files = JSON.parse(JSON.stringify(DEFAULT_FILES));
        state.openTabs = [];
        state.activeTabLeft = null;
        state.activeTabRight = null;
        state.splitMode = false;
        document.getElementById('monaco-container-right').classList.add('hidden');
        document.getElementById('split-divider').classList.add('hidden');
        renderTree();
        renderTabs();
        openFile(state.files.find(function (f) { return f.type === 'file'; }).id);
    };

    // ─── Context menu ────────────────────────────────────────────────────────────
    function showContextMenu(x, y, id) {
        state.ctxTargetId = id;
        var item = getFile(id);
        var isFolder = item && item.type === 'folder';

        // Show/hide folder-specific items
        document.getElementById('ctx-new-file-here').style.display  = isFolder ? '' : 'none';
        document.getElementById('ctx-new-folder-here').style.display = isFolder ? '' : 'none';
        document.getElementById('ctx-sep-folder').style.display      = isFolder ? '' : 'none';
        // Duplicate & Download don't make sense on folders
        document.getElementById('ctx-duplicate').style.display      = isFolder ? 'none' : '';
        document.getElementById('ctx-download').style.display       = isFolder ? 'none' : '';
        document.getElementById('ctx-download-folder').style.display = isFolder ? '' : 'none';

        var menu = document.getElementById('ctx-menu');
        menu.classList.remove('hidden');
        var W = window.innerWidth, H = window.innerHeight;
        var mw = 190, mh = isFolder ? 232 : 160;
        menu.style.left = Math.min(x, W - mw - 8) + 'px';
        menu.style.top  = Math.min(y, H - mh - 8) + 'px';
    }

    function hideContextMenu() {
        document.getElementById('ctx-menu').classList.add('hidden');
        state.ctxTargetId = null;
    }

    function bindContextMenu() {
        document.getElementById('ctx-new-file-here').addEventListener('click', function () {
            var id = state.ctxTargetId;
            hideContextMenu();
            var item = getFile(id);
            // If it's a folder use its id; if it's a file use its parentId
            var parentId = item && item.type === 'folder' ? id : (item ? item.parentId : null);
            EditorApp.newFile(parentId);
        });
        document.getElementById('ctx-new-folder-here').addEventListener('click', function () {
            var id = state.ctxTargetId;
            hideContextMenu();
            var item = getFile(id);
            var parentId = item && item.type === 'folder' ? id : (item ? item.parentId : null);
            EditorApp.newFolder(parentId);
        });
        document.getElementById('ctx-rename').addEventListener('click', function () {
            hideContextMenu();
            startInlineRename(state.ctxTargetId);
        });
        document.getElementById('ctx-duplicate').addEventListener('click', function () {
            var f = getFile(state.ctxTargetId);
            if (!f || f.type !== 'file') { hideContextMenu(); return; }
            var copy = Object.assign({}, f, { id: genId(), name: 'copy_' + f.name, content: f.content });
            state.files.push(copy);
            hideContextMenu();
            renderTree();
        });
        document.getElementById('ctx-download').addEventListener('click', function () {
            var f = getFile(state.ctxTargetId);
            if (f && f.type === 'file') downloadFile(f.name, f.content);
            hideContextMenu();
        });
        document.getElementById('ctx-download-folder').addEventListener('click', function () {
            var id = state.ctxTargetId;
            hideContextMenu();
            EditorApp.downloadFolder(id);
        });
        document.getElementById('ctx-delete').addEventListener('click', function () {
            var id = state.ctxTargetId;
            hideContextMenu();
            deleteItem(id);
        });
    }

    function deleteItem(id) {
        // Remove item and its children recursively
        function collectIds(itemId) {
            var ids = [itemId];
            state.files.filter(function (f) { return f.parentId === itemId; })
                .forEach(function (c) { ids = ids.concat(collectIds(c.id)); });
            return ids;
        }
        var toRemove = collectIds(id);
        state.files = state.files.filter(function (f) { return toRemove.indexOf(f.id) === -1; });
        state.openTabs = state.openTabs.filter(function (t) { return toRemove.indexOf(t) === -1; });
        if (toRemove.indexOf(state.activeTabLeft) !== -1) state.activeTabLeft = state.openTabs[0] || null;
        if (toRemove.indexOf(state.activeTabRight) !== -1) state.activeTabRight = null;
        renderTree();
        renderTabs();
        syncEditor();
        updateStatusBar();
    }

    // ─── Inline rename ───────────────────────────────────────────────────────────
    function startInlineRename(id) {
        var row = document.querySelector('.tree-row[data-id="' + id + '"]');
        if (!row) return;
        var label = row.querySelector('.tree-label');
        if (!label) return;
        var file = getFile(id);
        if (!file) return;

        var input = document.getElementById('inline-rename');
        var rect = label.getBoundingClientRect();
        input.style.top = rect.top + 'px';
        input.style.left = rect.left + 'px';
        input.style.width = Math.max(rect.width + 40, 120) + 'px';
        input.value = file.name;
        input.classList.remove('hidden');
        input.focus();
        input.select();

        function commit() {
            var newName = input.value.trim();
            input.classList.add('hidden');
            if (newName && newName !== file.name) {
                file.name = newName;
                // Update monaco model language if open
                if (state.monacoReady) {
                    var model = monaco.editor.getModels().find(function (m) {
                        return m.uri && m.uri.path === '/' + id;
                    });
                    if (model) monaco.editor.setModelLanguage(model, getLang(newName));
                }
                renderTree();
                renderTabs();
                updateStatusBar();
            }
            input.removeEventListener('blur', commit);
            input.removeEventListener('keydown', onKey);
        }

        function onKey(e) {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { input.classList.add('hidden'); }
        }

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', onKey);
    }

    // ─── Sidebar drag-to-resize ──────────────────────────────────────────────────
    function bindSidebarResize() {
        var handle = document.getElementById('sidebar-resize');
        var sidebar = document.getElementById('editor-sidebar');
        var editorMain = document.querySelector('.editor-main');
        var dragging = false;
        var startX = 0, startW = 0;

        function startDrag(clientX) {
            dragging = true;
            startX = clientX;
            startW = sidebar.getBoundingClientRect().width;
            editorMain.style.pointerEvents = 'none';
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        function moveDrag(clientX) {
            if (!dragging) return;
            var w = Math.max(140, Math.min(480, startW + (clientX - startX)));
            sidebar.style.width = w + 'px';
            sidebar.style.minWidth = w + 'px';
        }

        function endDrag() {
            if (!dragging) return;
            dragging = false;
            editorMain.style.pointerEvents = '';
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        // Mouse
        handle.addEventListener('mousedown', function (e) { e.preventDefault(); startDrag(e.clientX); });
        document.addEventListener('mousemove', function (e) { moveDrag(e.clientX); });
        document.addEventListener('mouseup', endDrag);

        // Touch & Stylus
        handle.addEventListener('touchstart', function (e) { e.preventDefault(); startDrag(e.touches[0].clientX); }, { passive: false });
        document.addEventListener('touchmove', function (e) { if (dragging) { e.preventDefault(); moveDrag(e.touches[0].clientX); } }, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    // ─── Split pane drag-to-resize ───────────────────────────────────────────────
    function bindSplitResize() {
        var handle = document.getElementById('split-divider');
        var container = document.getElementById('editor-split-container');
        var left = document.getElementById('monaco-container-left');
        var dragging = false;
        var startX, startW;

        handle.addEventListener('mousedown', function (e) {
            dragging = true;
            startX = e.clientX;
            startW = left.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var total = container.offsetWidth - 5;
            var w = Math.min(Math.max(startW + (e.clientX - startX), 200), total - 200);
            left.style.flex = 'none';
            left.style.width = w + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (dragging) {
                dragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // ─── Global events ───────────────────────────────────────────────────────────
    function bindGlobalEvents() {
        // Close context menu on outside click
        function closeMenuIfOutside(e) {
            var menu = document.getElementById('ctx-menu');
            if (!menu.classList.contains('hidden') && !menu.contains(e.target)) {
                hideContextMenu();
            }
        }
        document.addEventListener('click', closeMenuIfOutside);

        // Modal: Enter to confirm
        document.getElementById('modal-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') EditorApp.confirmModal();
        });

        // Escape on document level closes modal OR context menu
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('new-item-modal');
                if (!modal.classList.contains('hidden')) { EditorApp.closeModal(); return; }
                var menu = document.getElementById('ctx-menu');
                if (!menu.classList.contains('hidden')) { hideContextMenu(); return; }
            }
        });

        // Backdrop click closes modal
        document.getElementById('new-item-modal').addEventListener('click', function (e) {
            if (e.target === this) EditorApp.closeModal();
        });

        // Upload input handlers
        document.getElementById('upload-files-input').addEventListener('change', function () {
            if (!this.files.length) return;
            handleFileUpload(this.files);
            this.value = '';
        });
        document.getElementById('upload-folder-input').addEventListener('change', function () {
            if (!this.files.length) return;
            handleFileUpload(this.files);
            this.value = '';
        });

        bindContextMenu();
        bindSidebarResize();
        bindSplitResize();
        bindDragDrop();
    }

    // ─── DB Viewer ───────────────────────────────────────────────────────────────
    var _sqlJs = null;
    var _sqlJsPromise = null;
    var _activeDb = null;
    var _dbViewerState = { fileId: null, activeTable: null, offset: 0, viewMode: 'data' };
    var DB_PAGE_SIZE = 200;

    function getSqlJs() {
        if (_sqlJs) return Promise.resolve(_sqlJs);
        if (_sqlJsPromise) return _sqlJsPromise;
        _sqlJsPromise = initSqlJs({
            locateFile: function (f) {
                return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/' + f;
            }
        }).then(function (SQL) { _sqlJs = SQL; return SQL; });
        return _sqlJsPromise;
    }

    function closeActiveDb() {
        if (_activeDb) {
            try { _activeDb.close(); } catch (e) {}
            _activeDb = null;
        }
    }

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderDbViewer(file) {
        var tableListEl = document.getElementById('db-table-list');
        var contentEl = document.getElementById('db-table-content');
        if (!file.dbBuffer) {
            contentEl.innerHTML = '<div class="db-empty-state">No data in this file.</div>';
            return;
        }
        // Reset state when switching to a different db file
        if (file.id !== _dbViewerState.fileId) {
            _dbViewerState.fileId = file.id;
            _dbViewerState.activeTable = null;
            _dbViewerState.offset = 0;
            _dbViewerState.viewMode = 'data';
        }
        contentEl.innerHTML = '<div class="db-loading">Loading database…</div>';
        getSqlJs().then(function (SQL) {
            // Guard: user may have switched tabs while loading
            var active = state.activeTabLeft ? getFile(state.activeTabLeft) : null;
            if (!active || active.id !== file.id) return;
            closeActiveDb();
            try {
                _activeDb = new SQL.Database(new Uint8Array(file.dbBuffer));
            } catch (e) {
                contentEl.innerHTML = '<div class="db-error">Could not parse database: ' + escHtml(e.message) + '</div>';
                return;
            }
            var res = _activeDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
            var tables = res[0] ? res[0].values.map(function (r) { return r[0]; }) : [];
            // Render table list sidebar
            tableListEl.innerHTML = '';
            if (tables.length === 0) {
                tableListEl.innerHTML = '<p class="db-loading" style="padding:12px 10px;">No tables</p>';
            } else {
                tables.forEach(function (tbl) {
                    var btn = document.createElement('button');
                    btn.className = 'db-table-btn';
                    btn.textContent = tbl;
                    btn.title = tbl;
                    btn.onclick = function () {
                        _dbViewerState.activeTable = tbl;
                        _dbViewerState.offset = 0;
                        renderTableData();
                    };
                    tableListEl.appendChild(btn);
                });
            }
            // Auto-select first table if none selected or previous no longer exists
            if (tables.length > 0) {
                if (!_dbViewerState.activeTable || tables.indexOf(_dbViewerState.activeTable) === -1) {
                    _dbViewerState.activeTable = tables[0];
                    _dbViewerState.offset = 0;
                }
                renderTableData();
            } else {
                contentEl.innerHTML = '<div class="db-empty-state">This database contains no tables.</div>';
            }
        }).catch(function (e) {
            contentEl.innerHTML = '<div class="db-error">sql.js failed to load: ' + escHtml(e.message) + '</div>';
        });
    }

    function renderTableData() {
        if (!_activeDb || !_dbViewerState.activeTable) return;
        var tableName = _dbViewerState.activeTable;
        var offset = _dbViewerState.offset;
        var tableListEl = document.getElementById('db-table-list');
        var contentEl = document.getElementById('db-table-content');
        // Update active button
        tableListEl.querySelectorAll('.db-table-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.textContent === tableName);
        });
        // Safe table name (double-quote escaping)
        var safeTable = tableName.replace(/"/g, '""');
        var countRes = _activeDb.exec('SELECT COUNT(*) FROM "' + safeTable + '"');
        var total = countRes[0] ? Number(countRes[0].values[0][0]) : 0;
        var schemaRes = _activeDb.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
        var schemaSql = schemaRes[0] ? schemaRes[0].values[0][0] : '';
        var html = '<div class="db-table-header">';
        html += '<span class="db-table-name">&#128228; ' + escHtml(tableName) + '</span>';
        html += '<span class="db-row-count">' + total.toLocaleString() + ' rows</span>';
        html += '<div class="db-view-toggle">';
        html += '<button class="db-toggle-btn' + (_dbViewerState.viewMode === 'data' ? ' active' : '') + '" onclick="EditorApp._dbSetView(\'data\')">Data</button>';
        html += '<button class="db-toggle-btn' + (_dbViewerState.viewMode === 'schema' ? ' active' : '') + '" onclick="EditorApp._dbSetView(\'schema\')">Schema</button>';
        html += '</div></div>';
        if (_dbViewerState.viewMode === 'schema') {
            html += '<div class="db-schema-view"><pre>' + escHtml(schemaSql || '-- schema not available') + '</pre></div>';
        } else {
            var dataRes = _activeDb.exec('SELECT * FROM "' + safeTable + '" LIMIT ' + DB_PAGE_SIZE + ' OFFSET ' + offset);
            var columns = dataRes[0] ? dataRes[0].columns : [];
            var rows = dataRes[0] ? dataRes[0].values : [];
            if (columns.length === 0) {
                html += '<div class="db-empty-state">No columns found.</div>';
            } else {
                html += '<div class="db-scroll-wrapper"><table class="db-data-table"><thead><tr>';
                columns.forEach(function (col) { html += '<th>' + escHtml(String(col)) + '</th>'; });
                html += '</tr></thead><tbody>';
                rows.forEach(function (row) {
                    html += '<tr>';
                    row.forEach(function (cell) {
                        html += '<td>' + (cell === null ? '<span class="db-null">NULL</span>' : escHtml(String(cell))) + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                var start = total > 0 ? offset + 1 : 0;
                var end = Math.min(offset + DB_PAGE_SIZE, total);
                html += '<div class="db-pagination">';
                html += '<button class="db-page-btn" onclick="EditorApp._dbPrev()"' + (offset === 0 ? ' disabled' : '') + '>&#8592; Prev</button>';
                html += '<span class="db-page-info">' + (total > 0 ? start + '\u2013' + end + ' of ' + total.toLocaleString() : 'empty table') + '</span>';
                html += '<button class="db-page-btn" onclick="EditorApp._dbNext()"' + (offset + DB_PAGE_SIZE >= total ? ' disabled' : '') + '>Next &#8594;</button>';
                html += '</div>';
            }
        }
        contentEl.innerHTML = html;
    }

    EditorApp._dbSetView = function (mode) {
        _dbViewerState.viewMode = mode;
        renderTableData();
    };
    EditorApp._dbPrev = function () {
        _dbViewerState.offset = Math.max(0, _dbViewerState.offset - DB_PAGE_SIZE);
        renderTableData();
    };
    EditorApp._dbNext = function () {
        _dbViewerState.offset += DB_PAGE_SIZE;
        renderTableData();
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────────
    function getFile(id) {
        return state.files.find(function (f) { return f.id === id; }) || null;
    }

    // ─── Boot ────────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
