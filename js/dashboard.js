document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-dashboard');
    if (!page) return;

    const currentProjectId = Number(localStorage.getItem('currentProjectId'));
    if (!currentProjectId) {
        // You can show a message or hide the content if no project is selected
        page.innerHTML = '<p class="text-center text-gray-500">الرجاء اختيار مشروع من القائمة الجانبية لعرض لوحة التحكم.</p>';
        return;
    }

    // --- DOM Elements ---
    const fromDateInput = document.getElementById('dash-from-date');
    const toDateInput = document.getElementById('dash-to-date');
    const refreshBtn = document.getElementById('dash-refresh-btn');

    const totalBalanceCard = document.getElementById('total-balance-card');
    const totalRevenueCard = document.getElementById('total-revenue-card');
    const totalExpensesCard = document.getElementById('total-expenses-card');
    const netIncomeCard = document.getElementById('net-income-card');
    const recentVouchersTableBody = document.getElementById('recent-vouchers-table-body');

    const formatCurrency = (amount) => {
        const currency = localStorage.getItem('currency') || 'EGP';
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency }).format(amount);
    }

    const renderDashboard = async () => {
        try {
            // --- Show loading state ---
            totalBalanceCard.textContent = '...';
            totalRevenueCard.textContent = '...';
            totalExpensesCard.textContent = '...';
            netIncomeCard.textContent = '...';
            recentVouchersTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">جاري التحميل...</td></tr>';

            // --- Calculate Total Balance ---
            const [allCashboxes, allVouchers] = await Promise.all([
                db.cashboxes.where({ projectId: currentProjectId }).toArray(),
                db.vouchers.where({ projectId: currentProjectId }).toArray()
            ]);

            const totalOpeningBalance = allCashboxes.reduce((sum, cb) => sum + cb.openingBalance, 0);
            const netMovement = allVouchers.reduce((sum, v) => sum + v.debit - v.credit, 0);
            const totalBalance = totalOpeningBalance + netMovement;
            totalBalanceCard.textContent = formatCurrency(totalBalance);

            // --- Calculate Period Metrics ---
            const fromDate = fromDateInput.value;
            const toDate = toDateInput.value;

            if (fromDate && toDate) {
                const periodVouchers = allVouchers.filter(v => v.date >= fromDate && v.date <= toDate);

                const totalRevenue = periodVouchers
                    .filter(v => v.movementType === 'Receipt' || v.movementType === 'TransferIn')
                    .reduce((sum, v) => sum + v.debit, 0);

                const totalExpenses = periodVouchers
                    .filter(v => v.movementType === 'Payment' || v.movementType === 'TransferOut')
                    .reduce((sum, v) => sum + v.credit, 0);

                const netIncome = totalRevenue - totalExpenses;

                totalRevenueCard.textContent = formatCurrency(totalRevenue);
                totalExpensesCard.textContent = formatCurrency(totalExpenses);
                netIncomeCard.textContent = formatCurrency(netIncome);
                netIncomeCard.style.color = netIncome >= 0 ? 'green' : 'red';
            }

            // --- Render Recent Transactions ---
            const recentVouchers = allVouchers.sort((a, b) => b.id - a.id).slice(0, 5);
            recentVouchersTableBody.innerHTML = '';
            if (recentVouchers.length > 0) {
                recentVouchers.forEach(v => {
                    const amount = v.debit > 0
                        ? `<span class="text-green-600">+${formatCurrency(v.debit)}</span>`
                        : `<span class="text-red-600">-${formatCurrency(v.credit)}</span>`;

                    recentVouchersTableBody.innerHTML += `
                        <tr>
                            <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${v.voucherNo}</td>
                            <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${v.date}</td>
                            <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${v.description}</td>
                            <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${amount}</td>
                        </tr>
                    `;
                });
            } else {
                recentVouchersTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">لا توجد حركات.</td></tr>';
            }

        } catch (error) {
            console.error('Failed to render dashboard:', error);
            // Handle error state in UI
        }
    };

    const initializeDashboard = () => {
        // Set default dates for the current month
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDateInput.valueAsDate = firstDay;
        toDateInput.valueAsDate = today;
        renderDashboard();
    };

    // --- Event Listeners ---
    refreshBtn.addEventListener('click', renderDashboard);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-dashboard') {
            initializeDashboard();
        }
    });
});
