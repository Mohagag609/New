document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlements');
    if (!page) return;

    const tableBody = document.getElementById('settlements-table-body');

    const renderSettlements = async () => {
        try {
            const settlements = await db.project_settlements.reverse().toArray();

            if (settlements.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4">لا توجد تسويات منفذة لعرضها.</td></tr>`;
                return;
            }

            const projectIds = [...new Set(settlements.map(s => s.projectId))];
            const projects = await db.projects.bulkGet(projectIds);
            const projectMap = new Map(projects.filter(p => p).map(p => [p.id, p.name]));

            tableBody.innerHTML = '';
            settlements.forEach(s => {
                const row = document.createElement('tr');
                // The new table structure is simpler
                row.innerHTML = `
                    <td class="px-5 py-3 border-b">${s.settlementDate}</td>
                    <td class="px-5 py-3 border-b">${projectMap.get(s.projectId) || 'غير معروف'}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Failed to render settlements:', error);
            tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-red-500">حدث خطأ أثناء تحميل التسويات.</td></tr>`;
        }
    };

    // Listen for the custom 'show' event to render the page
    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlements') {
            renderSettlements();
        }
    });
});
