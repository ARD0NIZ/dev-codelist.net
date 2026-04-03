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
            sql: 'SQL', plaintext: 'Plain Text',
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
            txt: '📃',
        };
        return icons[ext] || '📄';
    }

    // ─── Initialise ─────────────────────────────────────────────────────────────
    function init() {
        state.files = JSON.parse(JSON.stringify(DEFAULT_FILES));
        renderTree();
        loadMonaco(function () {
            state.monacoReady = true;
            openFile(state.files.find(function (f) { return f.type === 'file'; }).id);
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
                }
            });
            monaco.editor.setTheme('dev-codelist');

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

            if (cb) cb();
        });
    }

    function updateStatusPos(pos) {
        var el = document.getElementById('status-pos');
        if (el) el.textContent = 'Ln ' + pos.lineNumber + ', Col ' + pos.column;
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
    function syncEditor() {
        if (!state.monacoReady) return;
        // Left pane
        var fileL = state.activeTabLeft ? getFile(state.activeTabLeft) : null;
        setEditorFile(state.editorLeft, fileL, 'left');
        // Right pane
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
            return m._associatedResource && m._associatedResource.path === '/' + file.id;
        });
        if (!existing) {
            existing = monaco.editor.createModel(file.content, lang, monaco.Uri.parse('file:///' + file.id));
        }
        editor.setModel(existing);

        // Keep model in sync with state
        existing.onDidChangeContent(function () {
            var f = getFile(file.id);
            if (f) f.content = existing.getValue();
        });
    }

    // ─── Status bar ─────────────────────────────────────────────────────────────
    function updateStatusBar() {
        var activeId = state.activePane === 'right' ? state.activeTabRight : state.activeTabLeft;
        var file = activeId ? getFile(activeId) : null;
        var langEl = document.getElementById('status-lang');
        var linesEl = document.getElementById('status-lines');
        if (langEl) langEl.textContent = file ? getLangLabel(getLang(file.name)) : 'No file';
        if (linesEl) linesEl.textContent = file ? (file.content.split('\n').length + ' lines') : '—';
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

        // Build path
        function getPath(f) {
            if (!f.parentId) return f.name;
            var parent = getFile(f.parentId);
            return parent ? parent.name + '/' + f.name : f.name;
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
        el.style.display = 'flex';
        el.classList.remove('hidden');
        setTimeout(function () { document.getElementById('modal-input').focus(); }, 50);
    }

    EditorApp.closeModal = function () {
        var el = document.getElementById('new-item-modal');
        el.style.display = 'none';
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
        document.getElementById('ctx-duplicate').style.display = isFolder ? 'none' : '';
        document.getElementById('ctx-download').style.display  = isFolder ? 'none' : '';

        var menu = document.getElementById('ctx-menu');
        menu.classList.remove('hidden');
        var W = window.innerWidth, H = window.innerHeight;
        var mw = 190, mh = isFolder ? 200 : 160;
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
                        return m._associatedResource && m._associatedResource.path === '/' + id;
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
        var dragging = false;
        var startX, startW;

        handle.addEventListener('mousedown', function (e) {
            dragging = true;
            startX = e.clientX;
            startW = sidebar.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var w = Math.min(Math.max(startW + (e.clientX - startX), 140), 480);
            sidebar.style.width = w + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (dragging) {
                dragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
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
        document.addEventListener('click', function (e) {
            var menu = document.getElementById('ctx-menu');
            if (!menu.classList.contains('hidden') && !menu.contains(e.target)) {
                hideContextMenu();
            }
        });

        // Modal: Enter to confirm
        document.getElementById('modal-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') EditorApp.confirmModal();
        });

        // Escape on document level always closes modal
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('new-item-modal');
                if (!modal.classList.contains('hidden')) EditorApp.closeModal();
            }
        });

        // Backdrop click closes modal
        document.getElementById('new-item-modal').addEventListener('click', function (e) {
            if (e.target === this) EditorApp.closeModal();
        });

        bindContextMenu();
        bindSidebarResize();
        bindSplitResize();
    }

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
