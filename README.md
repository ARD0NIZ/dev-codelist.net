# dev-codes.net

A modern, interactive code showcase website template with syntax highlighting, collapsible code blocks, and a beautiful dark theme.

## 🎨 Live Preview

Open `index.html` in your browser to see the template in action!

## 📁 Project Structure

```
dev-codes.net/
├── index.html       # Main HTML structure
├── styles.css       # External stylesheet with all styling
└── README.md        # This file
```

## 🏗️ Website Structure Explained

### HTML Structure (`index.html`)

The website is organized into several key sections:

#### 1. **Document Head**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StarBDFD | Ticket System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="..." rel="stylesheet">  <!-- Google Fonts -->
    <link rel="stylesheet" href="styles.css">  <!-- External CSS -->
</head>
```
- **Tailwind CSS**: Loaded via CDN for utility classes (spacing, colors, responsive design)
- **Google Fonts**: Loads "Plus Jakarta Sans" (body text) and "JetBrains Mono" (code)
- **External CSS**: Custom styles in `styles.css`

#### 2. **Navigation Bar** (`<nav>`)
- Fixed at the top of the page (`position: fixed`)
- Contains logo, navigation links, and a CTA button
- Uses glass morphism effect (`backdrop-blur-xl`)

#### 3. **Main Content Area** (`<main>`)
The main section is divided into a grid layout:

**Left Column (8/12 width)**: Contains code blocks
- Each code block has:
  - Title and description
  - Trigger type badge
  - Code editor window with controls
  - Collapsible content area
  - Copy-to-clipboard button

**Right Column (4/12 width)**: Contains widgets
- Variables panel (list of configurable values)
- Contributors/Credits panel (team members)

#### 4. **Footer** (`<footer>`)
- Simple copyright notice with auto-updating year

### Component Breakdown

#### Code Editor Component
Each code block follows this structure:

```html
<div class="code-editor">
    <!-- Header with controls -->
    <div class="editor-header" onclick="toggleCode(this)">
        <!-- Left side: chevron + dots -->
        <div class="editor-controls-left">
            <svg class="chevron-icon">...</svg>  <!-- Collapse indicator -->
            <div class="editor-dots">
                <div class="dot dot-red"></div>     <!-- macOS-style dots -->
                <div class="dot dot-yellow"></div>
                <div class="dot dot-green"></div>
            </div>
        </div>
        
        <!-- Right side: Copy button -->
        <button class="copy-btn" data-target="code-1">
            Copy Code
        </button>
    </div>
    
    <!-- Code content area -->
    <pre id="code-1" class="editor-content bdfd-code">
        // Your code here
    </pre>
</div>
```

**Key Features:**
- **Clickable Header**: Entire header is clickable to collapse/expand
- **macOS-style Dots**: Red, yellow, green circles (purely decorative)
- **Copy Button**: Copies code content to clipboard
- **Syntax Highlighting**: Applied via JavaScript to `.bdfd-code` elements

---

## 🎨 CSS Structure (`styles.css`)

### CSS Variables (Theme Colors)

All colors are defined as CSS custom properties for easy theming:

```css
:root {
    --bg-deep: #030305;           /* Darkest background */
    --bg-surface: #0a0a0c;        /* Surface elements */
    --border-dim: rgba(255, 255, 255, 0.06);     /* Subtle borders */
    --border-highlight: rgba(255, 255, 255, 0.12); /* Hover borders */
    --text-primary: #ffffff;       /* Main text color */
    --text-secondary: #9ca3af;     /* Secondary text */
    --accent-primary: #8b5cf6;     /* Purple accent */
    --accent-secondary: #ec4899;   /* Pink accent */
}
```

**Color Scheme Breakdown:**
- **Background**: Deep black (#030305) with subtle purple/pink gradients
- **Accents**: Purple (#8b5cf6) and Pink (#ec4899) for highlights
- **Text**: White primary, gray secondary for hierarchy
- **Borders**: Translucent white for glass effects

### Key CSS Classes

#### 1. **Glass Panel Effect**
```css
.glass-panel {
    background: rgba(10, 10, 12, 0.6);  /* Semi-transparent */
    backdrop-filter: blur(16px);         /* Blur background */
    border: 1px solid var(--border-dim); /* Subtle border */
    border-radius: 20px;                 /* Rounded corners */
}
```
Creates a modern "glass morphism" effect with transparency and blur.

#### 2. **Code Editor Styling**
```css
.code-editor {
    background: #050507;                 /* Almost black */
    border-radius: 16px;                 /* Rounded corners */
    font-family: 'JetBrains Mono', monospace; /* Monospace font */
    box-shadow: inset 0 0 20px rgba(0,0,0,0.5); /* Inner shadow */
}
```

#### 3. **Editor Header**
```css
.editor-header {
    padding: 14px 20px;
    background: rgba(255, 255, 255, 0.02);  /* Slight tint */
    cursor: pointer;                         /* Indicates clickable */
}
```

#### 4. **Collapse Animation**
```css
.editor-content {
    max-height: 2000px;  /* Default: expanded */
    transition: max-height 0.4s ease, padding 0.3s ease;
}

.editor-content.collapsed {
    max-height: 0;       /* Collapsed state */
    padding: 0;
    overflow: hidden;
}
```

The collapse animation uses `max-height` transition for smooth expansion/collapse.

#### 5. **Tag Styling**
```css
.tag {
    padding: 6px 14px;
    border-radius: 9999px;  /* Fully rounded (pill shape) */
    font-size: 0.75rem;
    font-weight: 500;
}
```

#### 6. **Navigation Links**
```css
.nav-link {
    position: relative;
    color: var(--text-secondary);
}

.nav-link::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--accent-primary);
    transition: width 0.3s ease;
}

.nav-link:hover::after {
    width: 100%;  /* Underline expands on hover */
}
```

Creates an animated underline effect on hover.

### Animations

```css
@keyframes enter {
    from {
        opacity: 0;
        transform: translateY(20px);  /* Starts 20px down */
    }
    to {
        opacity: 1;
        transform: translateY(0);     /* Ends at normal position */
    }
}

.animate-enter {
    animation: enter 0.6s ease-out forwards;
}
```

Elements with `.animate-enter` fade in and slide up when the page loads.

**Staggered animations:**
```css
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
```

---

## 🖥️ JavaScript Functionality

The website includes three main JavaScript features:

### 1. **Auto-Update Year in Footer**
```javascript
document.getElementById('year').textContent = new Date().getFullYear();
```
Simple: Updates the copyright year automatically.

---

### 2. **Syntax Highlighting Engine**

#### Color Definitions
```javascript
const colors = {
    text: "#E6BAFF",      // Regular text (light purple)
    fallback: "#7223FF",  // Fallback color
    bracket: "#FF5C4C",   // Brackets [ and ]
    semicolon: "#FF584A", // Semicolons ;
    func: "#FF87F9",      // Function names (pink)
    logic: "#A22FFC"      // Logic keywords (purple)
};
```

These colors are **preserved from the original file** and used to colorize code.

#### Logic Functions
```javascript
const logicFuncs = ["$if", "$else", "$elseif", "$endif", "$try", "$catch", "$endtry", "$error", "$c"];
```

These keywords get a different color (logic purple) vs regular functions.

#### Highlighting Function
```javascript
function syntaxHighlight() {
    const blocks = document.querySelectorAll('.bdfd-code');
    
    blocks.forEach(block => {
        let text = block.innerText;
        let html = '';
        
        // Tokenizer: breaks code into parts
        const regex = /(\$[a-zA-Z]+)|(\[)|(\])|(\;)|([^$\[\];]+)/g;
        
        // Process each token
        while ((match = regex.exec(text)) !== null) {
            const [full, func, open, close, semi, other] = match;
            
            if (func) {
                let color = colors.func;
                if (logicFuncs.includes(func)) color = colors.logic;
                html += `<span style="color: ${color}">${func}</span>`;
            } else if (open || close) {
                html += `<span style="color: ${colors.bracket}">${open || close}</span>`;
            } else if (semi) {
                html += `<span style="color: ${colors.semicolon}">${semi}</span>`;
            } else if (other) {
                html += `<span style="color: ${colors.text}">${other}</span>`;
            }
        }
        block.innerHTML = html;
    });
}
```

**How it works:**
1. Finds all elements with class `.bdfd-code`
2. Uses regex to split code into tokens (functions, brackets, semicolons, text)
3. Wraps each token in a `<span>` with the appropriate color
4. Replaces the plain text with colored HTML

---

### 3. **Copy to Clipboard Feature**

```javascript
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');  // Get code block ID
        const text = document.getElementById(targetId).innerText;  // Get text
        
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            label.textContent = "Copied";
            label.classList.add('text-green-400');
            icon.innerHTML = '<path...>';  // Checkmark icon
            
            // Reset after 2 seconds
            setTimeout(() => {
                label.textContent = originalLabel;
                // Restore original state
            }, 2000);
        });
    });
});
```

**How it works:**
1. Finds all `.copy-btn` elements
2. On click, gets the target code block ID from `data-target` attribute
3. Extracts text content from that code block
4. Copies to clipboard using modern Clipboard API
5. Shows "Copied" feedback with green checkmark
6. Resets button after 2 seconds

---

### 4. **Collapse/Expand Toggle**

```javascript
function toggleCode(header) {
    const container = header.parentElement;  // .code-editor
    const content = container.querySelector('.editor-content');  // <pre>
    
    container.classList.toggle('is-collapsed');
    content.classList.toggle('collapsed');
}
```

**How it works:**
1. Called when editor header is clicked (`onclick="toggleCode(this)"`)
2. Finds the parent container and content area
3. Toggles `.collapsed` class
4. CSS handles the animation (see CSS section)

The chevron icon rotation is handled by CSS:
```css
.is-collapsed .chevron-icon {
    transform: rotate(-90deg);  /* Points right when collapsed */
}
```

---

## 🎯 How to Customize

### Change Colors

**Option 1**: Modify CSS variables in `styles.css`:
```css
:root {
    --accent-primary: #your-color;  /* Change purple */
    --accent-secondary: #your-color; /* Change pink */
}
```

**Option 2**: Modify JavaScript syntax colors in `index.html`:
```javascript
const colors = {
    text: "#your-color",
    bracket: "#your-color",
    // etc.
};
```

### Add Your Content

1. **Replace placeholders** in `index.html`:
   - Update title: `<h1>Project Title Here</h1>`
   - Update description paragraphs
   - Replace code in `<pre>` tags

2. **Add/remove code blocks**: Duplicate the `.code-editor` structure

3. **Update variables**: Modify the sidebar variable list

4. **Change contributors**: Update the credits section with your team

### Modify Layout

The layout uses CSS Grid:
```html
<div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
    <div class="lg:col-span-8"><!-- Left: 8/12 width --></div>
    <div class="lg:col-span-4"><!-- Right: 4/12 width --></div>
</div>
```

To change column widths, adjust `lg:col-span-X` classes.

---

## 🚀 Features

- ✨ **Modern Design**: Glass morphism, gradients, smooth animations
- 🎨 **Custom Syntax Highlighting**: Colorizes code in real-time
- 📋 **Copy to Clipboard**: One-click code copying with visual feedback
- 🔽 **Collapsible Code Blocks**: Save space, improve readability
- 📱 **Fully Responsive**: Works on mobile, tablet, and desktop
- 🎭 **Dark Theme**: Easy on the eyes with carefully chosen colors
- ⚡ **Performance**: Minimal dependencies, fast loading

---

## 🛠️ Technologies Used

- **HTML5**: Semantic structure
- **CSS3**: Modern styling (custom properties, grid, flexbox, animations)
- **JavaScript**: Vanilla JS for interactivity (no frameworks!)
- **Tailwind CSS**: Utility classes via CDN
- **Google Fonts**: Plus Jakarta Sans & JetBrains Mono

---

## 📖 Understanding the Code Flow

### Page Load Sequence:

1. **HTML loads** → Browser parses structure
2. **CSS loads** → Styles applied (Tailwind + custom)
3. **Fonts load** → Text renders with proper typography
4. **JavaScript runs**:
   - Sets current year
   - Applies syntax highlighting to all code blocks
   - Attaches event listeners to copy buttons
5. **Animations trigger** → Elements fade in with stagger effect

### User Interactions:

**Clicking a code editor header:**
1. User clicks → `onclick="toggleCode(this)"` fires
2. Function toggles `.collapsed` class
3. CSS transition animates max-height
4. Chevron rotates via CSS

**Clicking copy button:**
1. User clicks → Event listener fires
2. Gets target code block ID
3. Extracts text content
4. Copies to clipboard
5. Shows "Copied" feedback
6. Resets after 2 seconds

---

## 💡 Best Practices Used

1. **Separation of Concerns**: HTML (structure), CSS (style), JS (behavior)
2. **CSS Variables**: Easy theming and maintenance
3. **Semantic HTML**: Proper use of `<nav>`, `<main>`, `<footer>`, etc.
4. **Accessibility**: Proper ARIA labels, keyboard navigation support
5. **Performance**: Minimal DOM manipulation, efficient animations
6. **Responsive Design**: Mobile-first approach with Tailwind
7. **Progressive Enhancement**: Works without JS (except highlighting)

---

## 📚 Learning Resources

To better understand the technologies used:

- **CSS Grid**: [CSS Tricks Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- **CSS Flexbox**: [Flexbox Froggy](https://flexboxfroggy.com/)
- **CSS Custom Properties**: [MDN Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- **Tailwind CSS**: [Official Docs](https://tailwindcss.com/docs)
- **JavaScript DOM**: [MDN DOM Guide](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

---

## 🤝 Contributing

Feel free to fork this project and customize it for your needs!

---

## 📝 License

Open source and available for use by the developer community.

---

## 👨‍💻 Author

**ARD0NIZ**

---

Built with ❤️ for the dev community
