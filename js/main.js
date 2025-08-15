// Main application logic will go here
console.log("main.js loaded");

document.addEventListener('DOMContentLoaded', async () => {
    const projectSelector = document.getElementById('global-project-selector');

    async function populateProjectSelector() {
        try {
            // Use the new settlementDb
            const projects = await settlementDb.projects.toArray();
            if (projects.length === 0) {
                projectSelector.innerHTML = '<option>لا توجد مشروعات</option>';
                projectSelector.disabled = true;
                // Maybe prompt user to create a project
                return;
            }

            projectSelector.innerHTML = '';
            projects.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                projectSelector.appendChild(option);
            });

            let currentProjectId = localStorage.getItem('currentProjectId');
            if (currentProjectId && projects.some(p => p.id == currentProjectId)) {
                projectSelector.value = currentProjectId;
            } else {
                currentProjectId = projects[0].id;
                localStorage.setItem('currentProjectId', currentProjectId);
            }
        } catch (error) {
            console.error("Failed to populate project selector:", error);
        }
    }

    projectSelector.addEventListener('change', () => {
        const newProjectId = projectSelector.value;
        localStorage.setItem('currentProjectId', newProjectId);
        // Reload the app to apply the new project context everywhere
        window.location.reload();
    });

    // Populate the selector once the DB is open and ready
    await db.open();
    await populateProjectSelector();

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
