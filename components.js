// Load header and footer components
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
            
            // If this is the header, customize logo and title if data attributes exist
            if (elementId === 'header-placeholder') {
                const logoSrc = element.getAttribute('data-logo');
                const siteTitle = element.getAttribute('data-title');
                
                if (logoSrc) {
                    const logoElement = document.getElementById('logo-image');
                    if (logoElement) logoElement.src = logoSrc;
                }
                
                if (siteTitle) {
                    const titleElement = document.getElementById('site-title');
                    if (titleElement) titleElement.textContent = siteTitle;
                }
            }
        }
    } catch (error) {
        console.error(`Error loading ${componentPath}:`, error);
    }
}

// Load components when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await loadComponent('header-placeholder', 'header.html');
    await loadComponent('footer-placeholder', 'footer.html');
    
    // Update year in footer after it's loaded
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
