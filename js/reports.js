document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-reports');
    if (!page) return;

    // --- DOM Elements ---
    const cashboxSelect = document.getElementById('report-cashbox');
    const fromDateInput = document.getElementById('report-from-date');
    const toDateInput = document.getElementById('report-to-date');
    const generateBtn = document.getElementById('generate-report-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const printBtn = document.getElementById('print-report-btn');
    const resultsDiv = document.getElementById('report-results');
    const summaryDiv = document.getElementById('report-summary');
    const tableBody = document.getElementById('report-table-body');

    let reportData = []; // To hold the data for CSV export

    const initializePage = async () => {
        // Populate cashboxes
        const cashboxes = await db.cashboxes.toArray();
        cashboxSelect.innerHTML = '<option value="">اختر خزنة...</option>';
        cashboxes.forEach(c => {
            if(c.isActive) {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                cashboxSelect.appendChild(option);
            }
        });

        // Set default dates
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        toDateInput.valueAsDate = today;
        fromDateInput.valueAsDate = firstDayOfMonth;
    };

    const generateReport = async () => {
        const cashboxId = Number(cashboxSelect.value);
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        if (!cashboxId || !fromDate || !toDate) {
            alert('الرجاء تحديد الخزنة ونطاق التاريخ.');
            return;
        }

        try {
            // 1. Get cashbox opening balance
            const cashbox = await db.cashboxes.get(cashboxId);
            if (!cashbox) return alert('لم يتم العثور على الخزنة.');

            // 2. Calculate balance before 'from' date
            const priorVouchers = await db.vouchers
                .where('cashboxId').equals(cashboxId)
                .and(v => v.date < fromDate)
                .toArray();

            const netPrior = priorVouchers.reduce((sum, v) => sum + v.debit - v.credit, 0);
            const openingBalance = cashbox.openingBalance + netPrior;

            // 3. Get vouchers within the date range
            const periodVouchers = await db.vouchers
                .where('cashboxId').equals(cashboxId)
                .and(v => v.date >= fromDate && v.date <= toDate)
                .sortBy('date');

            // 4. Render report
            summaryDiv.innerHTML = `<strong>الرصيد الافتتاحي في ${fromDate}:</strong> ${new Intl.NumberFormat().format(openingBalance)}`;
            tableBody.innerHTML = '';
            reportData = []; // Reset data for export

            let runningBalance = openingBalance;

            // Add opening balance as the first row for CSV
            reportData.push({ date: fromDate, voucherNo: 'رصيد افتتاحي', description: '', debit: '', credit: '', balance: openingBalance });

            periodVouchers.forEach(v => {
                runningBalance += v.debit - v.credit;
                const row = {
                    date: v.date,
                    voucherNo: v.voucherNo,
                    description: v.description,
                    debit: v.debit,
                    credit: v.credit,
                    balance: runningBalance
                };
                reportData.push(row);

                tableBody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${row.date}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${row.voucherNo}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm">${row.description}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-green-600">${row.debit > 0 ? new Intl.NumberFormat().format(row.debit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm text-red-600">${row.credit > 0 ? new Intl.NumberFormat().format(row.credit) : '-'}</td>
                        <td class="px-5 py-3 border-b border-gray-200 bg-white text-sm font-semibold">${new Intl.NumberFormat().format(row.balance)}</td>
                    </tr>
                `;
            });

            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('حدث خطأ أثناء إنشاء التقرير.');
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
                `"${row.voucherNo}"`, // Enclose voucher number in quotes in case it contains special chars
                `"${row.description.replace(/"/g, '""')}"`, // Escape double quotes
                row.debit,
                row.credit,
                row.balance
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const cashboxName = cashboxSelect.options[cashboxSelect.selectedIndex].text;
        link.setAttribute('download', `Ledger_${cashboxName}_${fromDateInput.value}_to_${toDateInput.value}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Event Listeners ---
    generateBtn.addEventListener('click', generateReport);
    exportBtn.addEventListener('click', exportToCSV);
    printBtn.addEventListener('click', () => {
        page.classList.add('printing');
        window.print();
    });

    // Clean up the printing class after print dialog is closed
    window.onafterprint = () => {
        page.classList.remove('printing');
    };

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-reports') {
            initializePage();
        }
    });
});
