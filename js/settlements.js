document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlements');
    if (!page) return;

    const tableBody = document.getElementById('settlements-table-body');

    const renderSettlements = async () => {
        try {
            // Fetch only vouchers of type 'Settlement'
            const settlements = await db.settlement_vouchers.where({ type: 'Settlement' }).reverse().toArray();

            if (settlements.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4">لا توجد تسويات منفذة لعرضها.</td></tr>`;
                return;
            }

            // Fetch necessary lookup data
            const projectIds = [...new Set(settlements.map(s => s.projectId))];
            const investorIds = [...new Set([
                ...settlements.map(s => s.paidByInvestorId),
                ...settlements.map(s => s.receivedByInvestorId)
            ])];

            const [projects, investors] = await Promise.all([
                db.projects.bulkGet(projectIds),
                db.investors.bulkGet(investorIds)
            ]);

            const projectMap = new Map(projects.filter(p => p).map(p => [p.id, p.name]));
            const investorMap = new Map(investors.filter(i => i).map(i => [i.id, i.name]));

            tableBody.innerHTML = '';
            settlements.forEach(s => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-3 border-b">${s.date}</td>
                    <td class="px-5 py-3 border-b">${projectMap.get(s.projectId) || 'غير معروف'}</td>
                    <td class="px-5 py-3 border-b">${investorMap.get(s.paidByInvestorId) || 'غير معروف'}</td>
                    <td class="px-5 py-3 border-b">${investorMap.get(s.receivedByInvestorId) || 'غير معروف'}</td>
                    <td class="px-5 py-3 border-b">${formatCurrency(s.amount)}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Failed to render settlements:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">حدث خطأ أثناء تحميل التسويات.</td></tr>`;
        }
    };

    // Listen for the custom 'show' event to render the page
    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlements') {
            renderSettlements();
        }
    });
});
