document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-reports');
    if (!page) return;

    const currentProjectId = Number(localStorage.getItem('currentProjectId'));
    if (!currentProjectId) {
        // Hide the generate button if no project is selected
        document.getElementById('generate-report-btn').style.display = 'none';
        return;
    }

    // --- DOM Elements ---
    const cashboxSelect = document.getElementById('report-cashbox');
    const reportTabs = document.getElementById('report-tabs');
    const filterSections = document.querySelectorAll('.report-filter-section');

    const fromDateInput = document.getElementById('report-from-date');
    const toDateInput = document.getElementById('report-to-date');
    const fromVoucherInput = document.getElementById('report-from-voucher');
    const toVoucherInput = document.getElementById('report-to-voucher');
    const voucherNoInput = document.getElementById('report-voucher-no');
    const generateBtn = document.getElementById('generate-report-btn');
    const clearBtn = document.getElementById('clear-report-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const printBtn = document.getElementById('print-report-btn');
    const resultsDiv = document.getElementById('report-results');
    const summaryDiv = document.getElementById('report-summary');
    const tableBody = document.getElementById('report-table-body');

    let reportData = []; // To hold the data for CSV export
    let activeTab = 'date'; // Default active tab

    const formatCurrency = (amount) => {
        const currency = localStorage.getItem('currency') || 'EGP';
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency }).format(amount);
    };

    const parseVoucherNo = (voucherNo) => {
        if (typeof voucherNo === 'number') return voucherNo;
        if (!voucherNo) return 0;
        if (typeof voucherNo === 'string' && voucherNo.includes('-')) {
            return parseInt(voucherNo.split('-')[1], 10) || 0;
        }
        const num = parseInt(voucherNo, 10);
        return isNaN(num) ? 0 : num;
    };

    const initializePage = async () => {
        const cashboxes = await db.cashboxes.where({ projectId: currentProjectId }).toArray();
        cashboxSelect.innerHTML = '<option value="">اختر خزنة...</option>';
        cashboxes.forEach(c => {
            if(c.isActive) {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                cashboxSelect.appendChild(option);
            }
        });
        clearReport();
    };

    const clearReport = () => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        toDateInput.valueAsDate = today;
        fromDateInput.valueAsDate = firstDayOfMonth;
        fromVoucherInput.value = '';
        toVoucherInput.value = '';
        voucherNoInput.value = '';
        resultsDiv.classList.add('hidden');
        tableBody.innerHTML = '';
        reportData = [];
    };

    const generateReport = async () => {
        const cashboxId = Number(cashboxSelect.value);
        if (!cashboxId) return alert('الرجاء تحديد خزنة أولاً.');

        try {
            let periodVouchers = [];
            let reportStartDate;
            const cashbox = await db.cashboxes.get(cashboxId);
            if (!cashbox) return alert('لم يتم العثور على الخزنة.');

            if (activeTab === 'single-voucher') {
                const voucherNo = Number(voucherNoInput.value.trim());
                if (!voucherNo || isNaN(voucherNo)) return alert('الرجاء إدخال رقم سند صالح.');

                const voucher = await db.vouchers.where({ voucherNo: voucherNo, projectId: currentProjectId }).first();
                if (!voucher) return alert('لم يتم العثور على سند بهذا الرقم في المشروع الحالي.');
                if (voucher.cashboxId !== cashboxId) return alert('هذا السند لا يخص الخزنة المحددة.');

                periodVouchers = [voucher];
                reportStartDate = voucher.date;
            } else if (activeTab === 'date') {
                const fromDate = fromDateInput.value;
                const toDate = toDateInput.value;
                if (!fromDate || !toDate) return alert('الرجاء تحديد نطاق التاريخ.');

                periodVouchers = await db.vouchers
                    .where('[cashboxId+date]')
                    .between([cashboxId, fromDate], [cashboxId, toDate])
                    .toArray();
                reportStartDate = fromDate;
            } else if (activeTab === 'voucher-range') {
                const fromVoucher = Number(fromVoucherInput.value);
                const toVoucher = Number(toVoucherInput.value);
                if (!fromVoucher || !toVoucher || isNaN(fromVoucher) || isNaN(toVoucher)) {
                    return alert('الرجاء إدخال نطاق أرقام سندات صالح.');
                }

                const allProjectVouchers = await db.vouchers.where({ projectId: currentProjectId, cashboxId: cashboxId }).toArray();
                periodVouchers = allProjectVouchers
                    .filter(v => {
                        const num = parseVoucherNo(v.voucherNo);
                        return num >= fromVoucher && num <= toVoucher;
                    })
                    .sort((a, b) => parseVoucherNo(a.voucherNo) - parseVoucherNo(b.voucherNo));

                if (periodVouchers.length === 0) return alert('لم يتم العثور على سندات في هذا النطاق.');
                reportStartDate = periodVouchers[0].date;
            }

            // 2. Calculate balance before the report's start date
            const priorVouchers = await db.vouchers.where({ projectId: currentProjectId })
                .and(v => v.cashboxId === cashboxId && v.date < reportStartDate)
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
                description: 'رصيد ما سبق',
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

            // Add summary footer row
            const table = tableBody.parentElement; // Get the <table> element
            let tfoot = table.querySelector('tfoot');
            if (tfoot) tfoot.remove(); // Remove old footer if it exists

            tfoot = document.createElement('tfoot');
            const footerText = runningBalance >= 0
                ? `الخزينة الآن بها مبلغ: ${formatCurrency(runningBalance)}`
                : `الخزينة الآن عليها مبلغ: ${formatCurrency(runningBalance)}`;

            tfoot.innerHTML = `
                <tr class="bg-gray-200 font-bold text-lg">
                    <td colspan="6" class="px-5 py-4 text-center">${footerText}</td>
                </tr>
            `;
            table.appendChild(tfoot);

            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to generate report:', error);
            let userMessage = 'حدث خطأ أثناء إنشاء التقرير.';
            if (error.name) {
                userMessage += `\n\nالنوع: ${error.name}`;
            }
            if (error.message) {
                userMessage += `\nالرسالة: ${error.message}`;
            }
            alert(userMessage);
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

    const handleSearchTypeChange = () => {
        const searchType = document.querySelector('input[name="report-search-type"]:checked').value;
        if (searchType === 'date') {
            dateFiltersDiv.classList.remove('hidden');
            voucherFilterDiv.classList.add('hidden');
        } else {
            dateFiltersDiv.classList.add('hidden');
            voucherFilterDiv.classList.remove('hidden');
        }
    };

    const handleTabClick = (event) => {
        const target = event.target;
        if (!target.classList.contains('report-tab')) return;

        activeTab = target.dataset.tab;

        // Update active tab styles
        reportTabs.querySelectorAll('.report-tab').forEach(tab => {
            tab.classList.remove('active-tab', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        target.classList.add('active-tab', 'border-blue-500', 'text-blue-600');
        target.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

        // Show/hide filter sections
        filterSections.forEach(section => {
            if (section.id === `report-filters-${activeTab}`) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    };

    // --- Event Listeners ---
    reportTabs.addEventListener('click', handleTabClick);
    generateBtn.addEventListener('click', generateReport);
    clearBtn.addEventListener('click', clearReport);
    exportBtn.addEventListener('click', exportToCSV);
    printBtn.addEventListener('click', () => {
        printContent('report-results', 'تقرير دفتر الخزنة');
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-reports') {
            initializePage();
        }
    });
});
