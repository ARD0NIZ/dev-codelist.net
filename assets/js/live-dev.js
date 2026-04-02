/**
 * Live Server Compatibility Layer
 *
 * Dieses Script erkennt automatisch, ob die Seite über den VS Code Live Server
 * geöffnet wird (also Liquid-Tags NICHT verarbeitet wurden). In dem Fall werden
 * alle {% include X.html %} Tags per fetch() geladen und eingebettet.
 *
 * Auf GitHub Pages / Jekyll wird dieses Script zwar geladen, findet aber keine
 * unverarbeiteten Liquid-Tags und tut daher nichts.
 */
(function () {
    function loadIncludes() {
        var body = document.body;
        if (!body || !body.innerHTML.includes('{%')) return;

        var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [];
        var node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.includes('{%')) nodes.push(node);
        }

        nodes.forEach(function (textNode) {
            var match = textNode.nodeValue.match(/\{%-?\s*include\s+([^\s%]+)\s*-?%\}/);
            if (!match) return;
            var filename = match[1];
            fetch('/_includes/' + filename)
                .then(function (r) { return r.text(); })
                .then(function (html) {
                    var temp = document.createElement('div');
                    temp.innerHTML = html;
                    var parent = textNode.parentNode;
                    while (temp.firstChild) parent.insertBefore(temp.firstChild, textNode);
                    parent.removeChild(textNode);
                })
                .catch(function () {});
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadIncludes);
    } else {
        loadIncludes();
    }
})();
