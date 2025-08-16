document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-reports');
    if (!page) return;

    const projectSelect = document.getElementById('settlement-report-project-select');
    const finalSettlementPrintBtn = document.getElementById('print-final-settlement-btn');
    const detailsPrintBtn = document.getElementById('print-settlement-details-btn');
    const executeSettlementBtn = document.getElementById('execute-settlement-btn');
    const reportContent = document.getElementById('settlement-report-content');
    const detailedPrintArea = document.getElementById('detailed-print-area');

    const investorExpensesTbody = document.getElementById('investor-expenses-report-body');
    const totalExpensesSpan = document.getElementById('settlement-total-expenses');
    const finalSettlementTbody = document.getElementById('final-settlement-report-body');
    const settlementPlanList = document.getElementById('settlement-plan-list');

    let settlementData = []; // Moved to higher scope

    const generateReports = async () => {
        const projectId = Number(projectSelect.value);
        settlementData = []; // Reset on each generation
        if (!projectId) {
            reportContent.classList.add('hidden');
            return;
        }

        try {
            const [allVouchers, projectInvestors] = await Promise.all([
                db.settlement_vouchers.where({ projectId }).toArray(),
                db.project_investors.where({ projectId }).toArray()
            ]);

            // Filter out settlement transactions from financial calculations
            const expenseVouchers = allVouchers.filter(v => v.type !== 'Settlement');

            const investorIdsFromVouchers = expenseVouchers.map(v => v.paidByInvestorId);
            const investorIdsFromProject = projectInvestors.map(pi => pi.investorId);
            const allUniqueInvestorIds = [...new Set([...investorIdsFromVouchers, ...investorIdsFromProject])];
            const allInvestors = await db.investors.bulkGet(allUniqueInvestorIds);
            const investorMap = new Map(allInvestors.filter(i => i).map(i => [i.id, i.name]));

            const totalExpenses = expenseVouchers.reduce((sum, v) => sum + v.amount, 0);
            totalExpensesSpan.textContent = formatCurrency(totalExpenses);

            // Calculate effective contribution, considering both expenses and settlements
            const paidByInvestor = new Map();

            // Start with expenses paid
            expenseVouchers.forEach(v => {
                const currentPaid = paidByInvestor.get(v.paidByInvestorId) || 0;
                paidByInvestor.set(v.paidByInvestorId, currentPaid + v.amount);
            });

            // Adjust with settlement transactions
            allVouchers.filter(v => v.type === 'Settlement').forEach(v => {
                // Debtor (payer) increases their effective contribution
                const debtorContribution = paidByInvestor.get(v.paidByInvestorId) || 0;
                paidByInvestor.set(v.paidByInvestorId, debtorContribution + v.amount);

                // Creditor (receiver) decreases their effective contribution (as they were reimbursed)
                const creditorContribution = paidByInvestor.get(v.receivedByInvestorId) || 0;
                paidByInvestor.set(v.receivedByInvestorId, creditorContribution - v.amount);
            });

            // Populate the "Investor Payments Report" table using the effective contribution
            investorExpensesTbody.innerHTML = '';
            allUniqueInvestorIds.forEach(investorId => {
                const totalPaid = paidByInvestor.get(investorId) || 0;
                investorExpensesTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${investorMap.get(investorId) || 'غير معروف'}</td>
                        <td class="px-5 py-3">${formatCurrency(totalPaid)}</td>
                    </tr>
                `;
            });

            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);

            projectInvestors.forEach(pi => {
                const settlementRatio = useEqualSplit && projectInvestors.length > 0 ? (1 / projectInvestors.length) : (pi.share || 0);
                const paid = paidByInvestor.get(pi.investorId) || 0;
                const fairShare = totalExpenses * settlementRatio;
                const balance = paid - fairShare;
                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${(settlementRatio * 100).toFixed(2)}%`,
                    fairShare, paid, balance
                });
            });

            finalSettlementTbody.innerHTML = '';
            settlementData.forEach(data => {
                const balanceClass = data.balance >= 0 ? 'text-green-600' : 'text-red-600';
                finalSettlementTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${data.investorName}</td>
                        <td class="px-5 py-3">${data.settlementRatio}</td>
                        <td class="px-5 py-3">${formatCurrency(data.fairShare)}</td>
                        <td class="px-5 py-3">${formatCurrency(data.paid)}</td>
                        <td class="px-5 py-3 font-bold ${balanceClass}">${formatCurrency(data.balance)}</td>
                    </tr>
                `;
            });

            let creditors = settlementData.filter(d => d.balance > 0).map(d => ({...d})).sort((a,b) => b.balance - a.balance);
            let debtors = settlementData.filter(d => d.balance < 0).map(d => ({...d, balance: -d.balance})).sort((a,b) => b.balance - a.balance);
            const transactions = [];

            while (creditors.length > 0 && debtors.length > 0) {
                const creditor = creditors[0];
                const debtor = debtors[0];
                const amount = Math.min(creditor.balance, debtor.balance);
                transactions.push({ from: debtor, to: creditor, amount });
                creditor.balance -= amount;
                debtor.balance -= amount;
                if (creditor.balance < 0.01) creditors.shift();
                if (debtor.balance < 0.01) debtors.shift();
            }

            settlementPlanList.innerHTML = '';
            if (transactions.length === 0) {
                settlementPlanList.innerHTML = '<li>لا توجد تسويات مطلوبة.</li>';
                executeSettlementBtn.disabled = true;
            } else {
                transactions.forEach(t => {
                    settlementPlanList.innerHTML += `<li>${t.from.investorName} يدفع ${formatCurrency(t.amount)} إلى ${t.to.investorName}</li>`;
                });
                executeSettlementBtn.disabled = false;
            }

            reportContent.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to generate settlement reports:', error);
        }
    };

    const executeSettlement = async () => {
        if (executeSettlementBtn.disabled || settlementData.length === 0) return;

        const confirmation = confirm("هل أنت متأكد من تنفيذ التسوية؟ سيتم إنشاء سندات تسوية لهذه المعاملات ولا يمكن التراجع عنها.");
        if (!confirmation) return;

        const projectId = Number(projectSelect.value);
        const today = new Date().toISOString().split('T')[0];

        try {
            let creditors = settlementData.filter(d => d.balance > 0).map(d => ({...d})).sort((a,b) => b.balance - a.balance);
            let debtors = settlementData.filter(d => d.balance < 0).map(d => ({...d, balance: -d.balance})).sort((a,b) => b.balance - a.balance);
            const newVouchers = [];

            while (creditors.length > 0 && debtors.length > 0) {
                const creditor = creditors[0];
                const debtor = debtors[0];
                const amount = Math.min(creditor.balance, debtor.balance);

                newVouchers.push({
                    projectId,
                    date: today,
                    type: 'Settlement',
                    amount: amount,
                    paidByInvestorId: debtor.investorId,
                    receivedByInvestorId: creditor.investorId,
                    notes: `تسوية مستثمر من ${debtor.investorName} إلى ${creditor.investorName}`
                });

                creditor.balance -= amount;
                debtor.balance -= amount;
                if (creditor.balance < 0.01) creditors.shift();
                if (debtor.balance < 0.01) debtors.shift();
            }

            await db.settlement_vouchers.bulkAdd(newVouchers);
            alert('تم تنفيذ التسوية بنجاح! يتم تحديث التقرير.');
            generateReports(); // Refresh the report view

        } catch (error) {
            console.error('Failed to execute settlement:', error);
            alert('حدث خطأ أثناء تنفيذ التسوية.');
        }
    };

    const initializePage = async () => {
        const projects = await db.projects.toArray();
        projectSelect.innerHTML = '<option value="">اختر مشروعاً...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
    };

    projectSelect.addEventListener('change', generateReports);
    executeSettlementBtn.addEventListener('click', executeSettlement);

    finalSettlementPrintBtn.addEventListener('click', () => {
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectName) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }
        printContent('final-settlement-div', `التسوية النهائية - ${projectName}`);
    });

    const generateAndPrintDetailedReport = async () => {
        const projectId = Number(projectSelect.value);
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectId) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }

        try {
            const [allVouchers, accounts, parties, projectInvestors] = await Promise.all([
                db.settlement_vouchers.where({ projectId }).toArray(),
                db.accounts.toArray(),
                db.parties.toArray(),
                db.project_investors.where({ projectId }).toArray()
            ]);

            const investorIds = [...new Set(projectInvestors.map(pi => pi.investorId))];
            if (investorIds.length === 0) {
                alert("لا يوجد مستثمرون مرتبطون بهذا المشروع.");
                return;
            }
            const allInvestors = await db.investors.toArray(); // Get all investors for names
            const investorMap = new Map(allInvestors.map(i => [i.id, i.name]));
            const accountMap = new Map(accounts.map(a => [a.id, a.name]));
            const partyMap = new Map(parties.map(p => [p.id, p.name]));

            let reportHtml = `<h1 class="text-2xl font-bold text-center mb-4">تقرير الحركات التفصيلي لمشروع: ${projectName}</h1>`;

            for (const investorId of investorIds) {
                const investorName = investorMap.get(investorId);
                reportHtml += `<div class="mb-8" style="page-break-after: always;">`;
                reportHtml += `<h2 class="text-xl font-bold border-b-2 border-gray-300 pb-2 mb-4">المستثمر: ${investorName}</h2>`;

                const relatedVouchers = allVouchers
                    .filter(v => v.paidByInvestorId === investorId || v.receivedByInvestorId === investorId)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                if (relatedVouchers.length === 0) {
                    reportHtml += `<p>لا توجد حركات مسجلة لهذا المستثمر.</p>`;
                } else {
                    reportHtml += `<table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">التاريخ</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">مدفوعات (+)</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">مقبوضات (-)</th>
                            </tr>
                        </thead>
                        <tbody>`;

                    let totalPaid = 0;
                    let totalReceived = 0;

                    relatedVouchers.forEach(v => {
                        let description = '';
                        let paidAmount = 0;
                        let receivedAmount = 0;

                        if (v.type === 'Settlement') {
                            if (v.paidByInvestorId === investorId) { // This investor paid
                                paidAmount = v.amount;
                                description = `تسوية مدفوعة إلى: ${investorMap.get(v.receivedByInvestorId)}`;
                            } else { // This investor received
                                receivedAmount = v.amount;
                                description = `تسوية مقبوضة من: ${investorMap.get(v.paidByInvestorId)}`;
                            }
                        } else { // Expense voucher
                            paidAmount = v.amount;
                            const accountName = accountMap.get(v.categoryId) || 'غير معروف';
                            const partyName = v.partyId ? partyMap.get(v.partyId) || '' : '';
                            description = `مصروف: ${accountName} ${partyName ? `(${partyName})` : ''} - ${v.notes || ''}`;
                        }

                        totalPaid += paidAmount;
                        totalReceived += receivedAmount;

                        reportHtml += `<tr>
                            <td class="px-5 py-2 border-b">${v.date}</td>
                            <td class="px-5 py-2 border-b">${description}</td>
                            <td class="px-5 py-2 border-b text-left">${paidAmount > 0 ? formatCurrency(paidAmount) : ''}</td>
                            <td class="px-5 py-2 border-b text-left text-red-600">${receivedAmount > 0 ? formatCurrency(receivedAmount) : ''}</td>
                        </tr>`;
                    });

                    reportHtml += `</tbody>
                        <tfoot>
                            <tr class="font-bold">
                                <td colspan="2" class="px-5 py-2 border-t-2 text-right">الإجماليات</td>
                                <td class="px-5 py-2 border-t-2 text-left">${formatCurrency(totalPaid)}</td>
                                <td class="px-5 py-2 border-t-2 text-left text-red-600">${formatCurrency(totalReceived)}</td>
                            </tr>
                            <tr class="font-bold text-lg">
                                <td colspan="2" class="px-5 py-2 border-t-2 text-right">صافي المساهمة</td>
                                <td colspan="2" class="px-5 py-2 border-t-2 text-left">${formatCurrency(totalPaid - totalReceived)}</td>
                            </tr>
                        </tfoot>
                    </table>`;
                }
                reportHtml += `</div>`;
            }

            detailedPrintArea.innerHTML = reportHtml;
            printContent('detailed-print-area', `تقرير تفصيلي - ${projectName}`);

        } catch (error) {
            console.error('Failed to generate detailed report:', error);
            alert('حدث خطأ أثناء إنشاء التقرير التفصيلي.');
        }
    };

    detailsPrintBtn.addEventListener('click', generateAndPrintDetailedReport);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-reports') {
            initializePage();
        }
    });
});
