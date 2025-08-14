document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-reports');
    if (!page) return;

    // --- DOM Elements ---
    const cashboxSelect = document.getElementById('report-cashbox');
    const fromDateInput = document.getElementById('report-from-date');
    const toDateInput = document.getElementById('report-to-date');
    const voucherNoInput = document.getElementById('report-voucher-no');
    const generateBtn = document.getElementById('generate-report-btn');
    const clearBtn = document.getElementById('clear-report-btn');
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

    const clearReport = () => {
        cashboxSelect.value = '';
        fromDateInput.value = '';
        toDateInput.value = '';
        voucherNoInput.value = '';
        resultsDiv.classList.add('hidden');
        tableBody.innerHTML = '';
        reportData = [];
    };

    const generateReport = async () => {
        const cashboxId = Number(cashboxSelect.value);
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;
        const voucherNo = voucherNoInput.value.trim();

        if (!cashboxId) {
            alert('الرجاء تحديد خزنة أولاً.');
            return;
        }

        if (!voucherNo && (!fromDate || !toDate)) {
            alert('الرجاء تحديد نطاق التاريخ أو إدخال رقم سند.');
            return;
        }

        try {
            let periodVouchers = [];
            let reportStartDate;

            const cashbox = await db.cashboxes.get(cashboxId);
            if (!cashbox) return alert('لم يتم العثور على الخزنة.');

            if (voucherNo) {
                const voucher = await db.vouchers.where('voucherNo').equals(voucherNo).first();
                if (!voucher) return alert('لم يتم العثور على سند بهذا الرقم.');
                if (voucher.cashboxId !== cashboxId) return alert('هذا السند لا يخص الخزنة المحددة.');

                periodVouchers = [voucher];
                reportStartDate = voucher.date;
                fromDateInput.value = voucher.date;
                toDateInput.value = voucher.date;
            } else {
                periodVouchers = await db.vouchers
                    .where('cashboxId').equals(cashboxId)
                    .and(v => v.date >= fromDate && v.date <= toDate)
                    .sortBy('date');
                reportStartDate = fromDate;
            }

            // 2. Calculate balance before the report's start date
            const priorVouchers = await db.vouchers
                .where('cashboxId').equals(cashboxId)
                .and(v => v.date < reportStartDate)
                .toArray();

            const netPrior = priorVouchers.reduce((sum, v) => sum + v.debit - v.credit, 0);
            const openingBalance = cashbox.openingBalance + netPrior;

            // 4. Render report
            const cashboxName = cashboxSelect.options[cashboxSelect.selectedIndex].text;
            summaryDiv.innerHTML = `<strong>تقرير الخزنة:</strong> ${cashboxName}`;

            tableBody.innerHTML = '';
            reportData = []; // Reset data for export
            let runningBalance = openingBalance;

            // Add Opening Balance row to the table
            const openingBalanceRow = {
                date: reportStartDate,
                voucherNo: '-',
                description: 'رصيد افتتاحي / سابق',
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
                runningBalance += v.debit - v.credit;
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
    clearBtn.addEventListener('click', clearReport);
    exportBtn.addEventListener('click', exportToCSV);
    printBtn.addEventListener('click', () => {
        page.classList.add('printing');
        window.onafterprint = () => {
            page.classList.remove('printing');
        };
        window.print();
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-reports') {
            initializePage();
        }
    });
});
