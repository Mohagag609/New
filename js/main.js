// Main application logic will go here
console.log("main.js loaded");

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('#main-nav a');
    const pages = mainContent.querySelectorAll('div[id^="page-"]');

    function showPage(pageId) {
        // Hide all pages
        pages.forEach(page => {
            page.classList.add('hidden');
        });

        // Show the requested page
        const pageToShow = document.getElementById(pageId);
        if (pageToShow) {
            pageToShow.classList.remove('hidden');
            // Dispatch a custom event to notify other modules that a page has been shown
            const event = new CustomEvent('show', { detail: { pageId: pageId } });
            document.dispatchEvent(event);
        } else {
            // Fallback to dashboard if page not found
            const dashboardPage = document.getElementById('page-dashboard');
            dashboardPage.classList.remove('hidden');
            const event = new CustomEvent('show', { detail: { pageId: 'page-dashboard' } });
            document.dispatchEvent(event);
        }

        // Update active link
        navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${pageId.replace('page-', '')}`) {
                link.classList.add('bg-gray-700');
            } else {
                link.classList.remove('bg-gray-700');
            }
        });
    }

    function handleRouteChange() {
        const hash = window.location.hash.substring(1);
        const pageId = `page-${hash || 'dashboard'}`;
        showPage(pageId);
    }

    // Handle initial page load
    handleRouteChange();

    // Handle hash changes
    window.addEventListener('hashchange', handleRouteChange);
});
