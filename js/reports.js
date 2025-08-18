document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-reports');
    if (!page) return;

    // --- DOM Elements ---
    const reportTabs = document.getElementById('report-tabs');
    const filterSections = document.querySelectorAll('.report-filter-section');
    const generateBtn = document.getElementById('generate-report-btn');
    const clearBtn = document.getElementById('clear-report-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const printBtn = document.getElementById('print-report-btn');
    const resultsDiv = document.getElementById('report-results');
    const summaryDiv = document.getElementById('report-summary');
    const tableBody = document.getElementById('report-table-body');
    const pageTitle = document.querySelector('#page-reports h2');

    // Cashbox report filters
    const cashboxSelect = document.getElementById('report-cashbox');
    const fromDateInput = document.getElementById('report-from-date');
    const toDateInput = document.getElementById('report-to-date');

    // Party report filters
    const partySelect = document.getElementById('report-party');
    const partyFromDateInput = document.getElementById('report-party-from-date');
    const partyToDateInput = document.getElementById('report-party-to-date');

    let reportData = []; // To hold the data for CSV export
    let activeTab = 'cashbox'; // Default active tab

    const formatCurrency = (amount) => {
        const currency = localStorage.getItem('currency') || 'EGP';
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency }).format(amount);
    };

    const populateDropdown = async (selectElement, getItems, placeholder, nameField = 'name') => {
        try {
            const items = await getItems();
            selectElement.innerHTML = `<option value="">${placeholder}</option>`;
            items.forEach(item => {
                if (item.isActive !== false) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item[nameField];
                    selectElement.appendChild(option);
                }
            });
        } catch (error) {
            console.error(`Failed to populate ${selectElement.id}:`, error);
        }
    };

    const initializePage = async () => {
        await populateDropdown(cashboxSelect, () => db.cashboxes.toArray(), 'اختر خزنة...');
        await populateDropdown(partySelect, () => db.parties.toArray(), 'اختر طرف...');
        clearReport();
    };

    const clearReport = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        toDateInput.valueAsDate = today;
        fromDateInput.valueAsDate = firstDayOfMonth;
        partyToDateInput.valueAsDate = today;
        partyFromDateInput.valueAsDate = firstDayOfMonth;

        resultsDiv.classList.add('hidden');
        tableBody.innerHTML = '';
        reportData = [];
    };

    const generateCashboxReport = async () => {
        const cashboxId = Number(cashboxSelect.value);
        if (!cashboxId) return alert('الرجاء تحديد خزنة أولاً.');

        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        if (!fromDate || !toDate) return alert('الرجاء تحديد نطاق التاريخ.');

        try {
            const cashbox = await db.cashboxes.get(cashboxId);
            if (!cashbox) return alert('لم يتم العثور على الخزنة.');

            const periodVouchers = await db.vouchers
                .where('date').between(fromDate, toDate, true, true)
                .and(v => v.cashboxId === cashboxId)
                .sortBy('date');

            const priorVouchers = await db.vouchers
                .where('date').below(fromDate)
                .and(v => v.cashboxId === cashboxId)
                .toArray();

            const netPrior = priorVouchers.reduce((sum, v) => sum + (v.debit || 0) - (v.credit || 0), 0);
            const openingBalance = (cashbox.openingBalance || 0) + netPrior;

            const cashboxName = cashboxSelect.options[cashboxSelect.selectedIndex].text;
            summaryDiv.innerHTML = `<strong>تقرير الخزنة:</strong> ${cashboxName}`;

            tableBody.innerHTML = '';
            reportData = [];
            let runningBalance = openingBalance;

            const openingBalanceRow = {
                date: fromDate,
                voucherNo: '-',
                description: 'رصيد افتتاحي/مرحل',
                debit: '',
                credit: '',
                balance: openingBalance
            };
            reportData.push(openingBalanceRow);
            tableBody.innerHTML += `
                <tr class="bg-gray-100 font-semibold">
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.date}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.voucherNo}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.description}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm"></td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm"></td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${new Intl.NumberFormat().format(openingBalanceRow.balance)}</td>
                </tr>
            `;

            periodVouchers.forEach(v => {
                runningBalance += (v.debit || 0) - (v.credit || 0);
                const rowData = {
                    date: v.date,
                    voucherNo: v.voucherNo,
                    description: v.description,
                    debit: v.debit,
                    credit: v.credit,
                    balance: runningBalance
                };
                reportData.push(rowData);
                tableBody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.date}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.voucherNo}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.description}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-green-600">${rowData.debit > 0 ? new Intl.NumberFormat().format(rowData.debit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-red-600">${rowData.credit > 0 ? new Intl.NumberFormat().format(rowData.credit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm font-semibold">${new Intl.NumberFormat().format(rowData.balance)}</td>
                    </tr>
                `;
            });

            const table = tableBody.parentElement;
            let tfoot = table.querySelector('tfoot');
            if (tfoot) tfoot.remove();
            tfoot = document.createElement('tfoot');
            const footerText = `الرصيد النهائي: ${formatCurrency(runningBalance)}`;
            tfoot.innerHTML = `<tr class="bg-gray-200 font-bold text-lg"><td colspan="6" class="px-5 py-4 text-center">${footerText}</td></tr>`;
            table.appendChild(tfoot);

            resultsDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to generate cashbox report:', error);
            alert(`حدث خطأ أثناء إنشاء تقرير الخزنة: ${error.message}`);
        }
    };

    const generatePartyReport = async () => {
        const partyId = Number(partySelect.value);
        if (!partyId) return alert('الرجاء تحديد طرف أولاً.');

        const fromDate = partyFromDateInput.value;
        const toDate = partyToDateInput.value;
        if (!fromDate || !toDate) return alert('الرجاء تحديد نطاق التاريخ.');

        try {
            const party = await db.parties.get(partyId);
            if (!party) return alert('لم يتم العثور على الطرف.');

            const periodVouchers = await db.vouchers
                .where('date').between(fromDate, toDate, true, true)
                .and(v => v.partyId === partyId)
                .sortBy('date');

            const priorVouchers = await db.vouchers
                .where('date').below(fromDate)
                .and(v => v.partyId === partyId)
                .toArray();

            // Debit is money from party (they owe us less), Credit is money to party (they owe us more)
            const netPrior = priorVouchers.reduce((sum, v) => sum + (v.credit || 0) - (v.debit || 0), 0);
            const openingBalance = netPrior; // Assuming opening balance starts from 0

            const partyName = partySelect.options[partySelect.selectedIndex].text;
            summaryDiv.innerHTML = `<strong>كشف حساب:</strong> ${partyName}`;

            tableBody.innerHTML = '';
            reportData = [];
            let runningBalance = openingBalance;

            const openingBalanceRow = {
                date: fromDate,
                voucherNo: '-',
                description: 'رصيد افتتاحي/مرحل',
                debit: '',
                credit: '',
                balance: openingBalance
            };
            reportData.push(openingBalanceRow);
            tableBody.innerHTML += `
                <tr class="bg-gray-100 font-semibold">
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.date}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.voucherNo}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${openingBalanceRow.description}</td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm"></td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm"></td>
                    <td class="px-5 py-3 border-b border-gray-200 text-sm">${new Intl.NumberFormat().format(openingBalanceRow.balance)}</td>
                </tr>
            `;

            periodVouchers.forEach(v => {
                runningBalance += (v.credit || 0) - (v.debit || 0);
                const rowData = {
                    date: v.date,
                    voucherNo: v.voucherNo,
                    description: v.description,
                    debit: v.debit,
                    credit: v.credit,
                    balance: runningBalance
                };
                reportData.push(rowData);
                tableBody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.date}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.voucherNo}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${rowData.description}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-green-600">${rowData.debit > 0 ? new Intl.NumberFormat().format(rowData.debit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-red-600">${rowData.credit > 0 ? new Intl.NumberFormat().format(rowData.credit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm font-semibold">${new Intl.NumberFormat().format(rowData.balance)}</td>
                    </tr>
                `;
            });

            const table = tableBody.parentElement;
            let tfoot = table.querySelector('tfoot');
            if (tfoot) tfoot.remove();
            tfoot = document.createElement('tfoot');

            let footerText = '';
            if (party.type === 'Customer') {
                if (runningBalance > 0) {
                    footerText = `الرصيد النهائي: ${formatCurrency(runningBalance)} (رصيد دائن للعميل)`;
                } else if (runningBalance < 0) {
                    footerText = `الرصيد النهائي: ${formatCurrency(Math.abs(runningBalance))} (رصيد مدين على العميل)`;
                } else {
                    footerText = 'الرصيد النهائي: 0 (متوازن)';
                }
            } else { // Supplier
                if (runningBalance > 0) {
                    footerText = `الرصيد النهائي: ${formatCurrency(runningBalance)} (مستحق للمورد)`;
                } else if (runningBalance < 0) {
                    footerText = `الرصيد النهائي: ${formatCurrency(Math.abs(runningBalance))} (رصيد مدين من المورد)`;
                } else {
                    footerText = 'الرصيد النهائي: 0 (متوازن)';
                }
            }

            tfoot.innerHTML = `<tr class="bg-gray-200 font-bold text-lg"><td colspan="6" class="px-5 py-4 text-center">${footerText}</td></tr>`;
            table.appendChild(tfoot);

            resultsDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to generate party report:', error);
            alert(`حدث خطأ أثناء إنشاء كشف الحساب: ${error.message}`);
        }
    };

    const generateReport = () => {
        if (activeTab === 'cashbox') {
            generateCashboxReport();
        } else if (activeTab === 'party') {
            generatePartyReport();
        }
    };

    const exportToCSV = () => {
        if (reportData.length === 0) {
            alert('لا توجد بيانات لتصديرها.');
            return;
        }
        const headers = ['التاريخ', 'رقم السند', 'البيان', 'مدين', 'دائن', 'الرصيد'];
        const csvContent = [
            headers.join(','),
            ...reportData.map(row => [
                row.date,
                `"${row.voucherNo}"`,
                `"${row.description.replace(/"/g, '""')}"`,
                row.debit || 0,
                row.credit || 0,
                row.balance
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = activeTab === 'cashbox'
            ? `Ledger_${cashboxSelect.options[cashboxSelect.selectedIndex].text}.csv`
            : `Statement_${partySelect.options[partySelect.selectedIndex].text}.csv`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTabClick = (event) => {
        const target = event.target;
        if (!target.classList.contains('report-tab')) return;

        activeTab = target.dataset.tab;

        reportTabs.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active-tab'));
        target.classList.add('active-tab');

        filterSections.forEach(section => {
            section.classList.toggle('hidden', section.id !== `report-filters-${activeTab}`);
        });

        pageTitle.textContent = activeTab === 'cashbox' ? 'تقرير دفتر الخزنة' : 'كشف حساب طرف';
        clearReport();
    };

    // --- Event Listeners ---
    reportTabs.addEventListener('click', handleTabClick);
    generateBtn.addEventListener('click', generateReport);
    clearBtn.addEventListener('click', clearReport);
    exportBtn.addEventListener('click', exportToCSV);
    printBtn.addEventListener('click', () => {
        const title = activeTab === 'cashbox' ? 'تقرير دفتر الخزنة' : 'كشف حساب طرف';
        printContent('report-results', title);
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-reports') {
            initializePage();
        }
    });
});
