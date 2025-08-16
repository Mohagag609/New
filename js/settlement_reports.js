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
            // 1. Get all investors for the project
            const projectInvestors = await db.project_investors.where({ projectId }).toArray();
            const investorIds = projectInvestors.map(pi => pi.investorId);
            const investors = await db.investors.bulkGet(investorIds);
            const investorMap = new Map(investors.filter(i => i).map(i => [i.id, i.name]));

            // 2. Find the last settlement for this project
            const lastSettlement = await db.project_settlements
                .where({ projectId })
                .reverse()
                .sortBy('settlementDate');

            const lastSettlementRecord = lastSettlement[0];
            const previousContributions = new Map();
            let startDate = new Date(0); // The beginning of time if no settlement exists

            const previousSettlementSummaryDiv = document.getElementById('previous-settlement-summary');
            if (lastSettlementRecord) {
                startDate = new Date(lastSettlementRecord.settlementDate);
                // The 'balances' field in the snapshot now stores cumulative contributions
                lastSettlementRecord.balances.forEach(item => {
                    previousContributions.set(item.investorId, item.balance);
                });

                let summaryHtml = `<p class="mb-2"><strong>إجمالي المساهمات حتى تاريخ آخر تسوية (${lastSettlementRecord.settlementDate}):</strong></p><ul class="list-disc pr-5">`;
                investorIds.forEach(id => {
                    const balance = previousContributions.get(id) || 0;
                    summaryHtml += `<li>${investorMap.get(id) || 'غير معروف'}: <span class="font-bold">${formatCurrency(balance)}</span></li>`;
                });
                summaryHtml += '</ul>';
                previousSettlementSummaryDiv.innerHTML = summaryHtml;

            } else {
                previousSettlementSummaryDiv.innerHTML = '<p class="text-gray-500">لا توجد تسوية سابقة لهذا المشروع. هذه هي التسوية الأولى.</p>';
            }

            // 3. Fetch all vouchers since the last settlement date
            const allVouchers = await db.settlement_vouchers
                .where('date').above(startDate.toISOString().split('T')[0])
                .and(v => v.projectId === projectId)
                .toArray();

            const expenseVouchers = allVouchers.filter(v => v.type !== 'Settlement');
            const totalPeriodExpenses = expenseVouchers.reduce((sum, v) => sum + v.amount, 0);
            totalExpensesSpan.textContent = formatCurrency(totalPeriodExpenses);

            // 4. Calculate effective contribution for the current period
            const periodContribution = new Map();
            expenseVouchers.forEach(v => {
                const currentPaid = periodContribution.get(v.paidByInvestorId) || 0;
                periodContribution.set(v.paidByInvestorId, currentPaid + v.amount);
            });
            allVouchers.filter(v => v.type === 'Settlement').forEach(v => {
                const debtorContribution = periodContribution.get(v.paidByInvestorId) || 0;
                periodContribution.set(v.paidByInvestorId, debtorContribution + v.amount);
                const creditorContribution = periodContribution.get(v.receivedByInvestorId) || 0;
                periodContribution.set(v.receivedByInvestorId, creditorContribution - v.amount);
            });

            // Populate the "Investor Payments Report" (now shows PERIOD payments)
            investorExpensesTbody.innerHTML = '';
            investorIds.forEach(id => {
                const totalPaid = periodContribution.get(id) || 0;
                investorExpensesTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${investorMap.get(id) || 'غير معروف'}</td>
                        <td class="px-5 py-3">${formatCurrency(totalPaid)}</td>
                    </tr>
                `;
            });

            // 5. Calculate final balances for the settlement screen
            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);

            projectInvestors.forEach(pi => {
                const settlementRatio = useEqualSplit && projectInvestors.length > 0 ? (1 / projectInvestors.length) : (pi.share || 0);
                const currentPaid = periodContribution.get(pi.investorId) || 0;
                const fairShare = totalPeriodExpenses * settlementRatio;

                // The balance to be settled is based on the current period's activity ONLY.
                const balanceForThisPeriod = currentPaid - fairShare;

                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${(settlementRatio * 100).toFixed(2)}%`,
                    fairShare: fairShare, // Their share of this period's expenses
                    paid: currentPaid, // What they paid this period
                    balance: balanceForThisPeriod // The final balance to be settled
                });
            });

            // 6. Populate the final settlement table
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

            // 7. Generate settlement plan
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
            // Fetch the last settlement to get previous cumulative contributions
            const lastSettlement = await db.project_settlements.where({ projectId }).reverse().sortBy('settlementDate');
            const lastSettlementRecord = lastSettlement[0];
            const previousContributions = new Map();
            if (lastSettlementRecord) {
                lastSettlementRecord.balances.forEach(item => {
                    previousContributions.set(item.investorId, item.balance);
                });
            }

            // Generate settlement vouchers (this logic is unchanged)
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

            // Calculate the NEW cumulative contributions to save in the snapshot
            const newCumulativeContributions = new Map();
            settlementData.forEach(d => {
                const prevContribution = previousContributions.get(d.investorId) || 0;
                const periodContribution = d.paid; // 'paid' in settlementData is the period's contribution
                newCumulativeContributions.set(d.investorId, prevContribution + periodContribution);
            });

            const newSettlementRecord = {
                projectId,
                settlementDate: today,
                // Save the new cumulative contributions as the 'balance' for the next period
                balances: Array.from(newCumulativeContributions.entries()).map(([investorId, balance]) => ({ investorId, balance }))
            };

            // Use a transaction to save both vouchers and the settlement record
            await db.transaction('rw', db.settlement_vouchers, db.project_settlements, async () => {
                await db.settlement_vouchers.bulkAdd(newVouchers);
                await db.project_settlements.add(newSettlementRecord);
            });

            alert('تمت التسوية بنجاح.');

            // Manually update UI to prevent re-execution without a full refresh
            executeSettlementBtn.disabled = true;
            settlementPlanList.innerHTML = '<li class="text-green-600 font-bold">تم تنفيذ هذه التسوية بنجاح. يرجى تحديث الصفحة لبدء تسوية جديدة.</li>';

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
            // Fetch project investors, all investors for names, accounts, and parties
            const [projectInvestors, allInvestors, accounts, parties] = await Promise.all([
                db.project_investors.where({ projectId }).toArray(),
                db.investors.toArray(),
                db.accounts.toArray(),
                db.parties.toArray()
            ]);

            const investorIds = projectInvestors.map(pi => pi.investorId);
            if (investorIds.length === 0) {
                alert("لا يوجد مستثمرون مرتبطون بهذا المشروع.");
                return;
            }

            const investorMap = new Map(allInvestors.map(i => [i.id, i.name]));
            const accountMap = new Map(accounts.map(a => [a.id, a.name]));
            const partyMap = new Map(parties.map(p => [p.id, p.name]));

            // Find the last settlement for this project
            const lastSettlement = await db.project_settlements.where({ projectId }).reverse().sortBy('settlementDate');
            const lastSettlementRecord = lastSettlement[0];
            const previousBalances = new Map();
            let startDate = new Date(0);

            if (lastSettlementRecord) {
                startDate = new Date(lastSettlementRecord.settlementDate);
                lastSettlementRecord.balances.forEach(item => {
                    previousBalances.set(item.investorId, item.balance);
                });
            }

            // Fetch all vouchers since the last settlement date
            const newVouchers = await db.settlement_vouchers
                .where('date').above(startDate.toISOString().split('T')[0])
                .and(v => v.projectId === projectId)
                .toArray();

            let reportHtml = `<h1 class="text-2xl font-bold text-center mb-4">تقرير الحركات التفصيلي لمشروع: ${projectName}</h1>`;

            for (const investorId of investorIds) {
                const investorName = investorMap.get(investorId);
                reportHtml += `<div class="mb-8" style="page-break-after: always;">`;
                reportHtml += `<h2 class="text-xl font-bold border-b-2 border-gray-300 pb-2 mb-4">المستثمر: ${investorName}</h2>`;

                const relatedVouchers = newVouchers
                    .filter(v => v.paidByInvestorId === investorId || v.receivedByInvestorId === investorId)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                const prevBalance = previousBalances.get(investorId) || 0;

                reportHtml += `<table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">التاريخ</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">الحساب</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">الطرف</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">مدفوعات (+)</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">مقبوضات (-)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-gray-50 font-bold">
                            <td colspan="4" class="px-5 py-2 border-b text-right">رصيد سابق</td>
                            <td colspan="2" class="px-5 py-2 border-b text-left">${formatCurrency(prevBalance)}</td>
                        </tr>
                    `;

                let totalPaid = 0;
                let totalReceived = 0;

                relatedVouchers.forEach(v => {
                    let accountName = '', partyName = '', notes = v.notes || '', paidAmount = 0, receivedAmount = 0;
                    if (v.type === 'Settlement') {
                        accountName = 'تسوية مستثمرين';
                        if (v.paidByInvestorId === investorId) {
                            paidAmount = v.amount;
                            partyName = `إلى: ${investorMap.get(v.receivedByInvestorId)}`;
                        } else {
                            receivedAmount = v.amount;
                            partyName = `من: ${investorMap.get(v.paidByInvestorId)}`;
                        }
                    } else {
                        paidAmount = v.amount;
                        accountName = accountMap.get(v.categoryId) || 'غير معروف';
                        partyName = v.partyId ? partyMap.get(v.partyId) || '' : '';
                    }
                    totalPaid += paidAmount;
                    totalReceived += receivedAmount;

                    reportHtml += `<tr>
                        <td class="px-5 py-2 border-b">${v.date}</td>
                        <td class="px-5 py-2 border-b">${accountName}</td>
                        <td class="px-5 py-2 border-b">${partyName}</td>
                        <td class="px-5 py-2 border-b">${notes}</td>
                        <td class="px-5 py-2 border-b text-left">${paidAmount > 0 ? formatCurrency(paidAmount) : ''}</td>
                        <td class="px-5 py-2 border-b text-left text-red-600">${receivedAmount > 0 ? formatCurrency(receivedAmount) : ''}</td>
                    </tr>`;
                });

                reportHtml += `</tbody>
                    <tfoot>
                        <tr class="font-bold">
                            <td colspan="4" class="px-5 py-2 border-t-2 text-right">إجمالي حركات الفترة</td>
                            <td class="px-5 py-2 border-t-2 text-left">${formatCurrency(totalPaid)}</td>
                            <td class="px-5 py-2 border-t-2 text-left text-red-600">${formatCurrency(totalReceived)}</td>
                        </tr>
                        <tr class="font-bold text-lg bg-gray-100">
                            <td colspan="4" class="px-5 py-2 border-t-2 text-right">الرصيد النهائي</td>
                            <td colspan="2" class="px-5 py-2 border-t-2 text-left">${formatCurrency(prevBalance + totalPaid - totalReceived)}</td>
                        </tr>
                    </tfoot>
                </table>`;
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
