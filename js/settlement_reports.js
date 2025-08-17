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
        const selectedSettlementId = historicalSettlementSelect.value;

        settlementData = []; // Reset on each generation
        if (!projectId) {
            reportContent.classList.add('hidden');
            return;
        }

        try {
            // 1. Get project investors and their names
            const projectInvestors = await db.project_investors.where({ projectId }).toArray();
            const investorIds = projectInvestors.map(pi => pi.investorId);
            const investors = await db.investors.bulkGet(investorIds);
            const investorMap = new Map(investors.filter(i => i).map(i => [i.id, i.name]));

            // 2. Determine the date range and previous balances based on selection
            const allProjectSettlements = await db.project_settlements.where({ projectId }).reverse().sortBy('settlementDate');
            const previousContributions = new Map();
            let startDate = new Date(0);
            let endDate = null; // null means open-ended (for latest)

            if (selectedSettlementId === 'latest') {
                const lastSettlement = allProjectSettlements[0];
                if (lastSettlement) {
                    startDate = new Date(lastSettlement.settlementDate);
                    lastSettlement.balances.forEach(item => previousContributions.set(item.investorId, item.balance));
                }
                executeSettlementBtn.style.display = 'block'; // Show execute button for latest
            } else {
                const settlementId = Number(selectedSettlementId);
                const selectedIndex = allProjectSettlements.findIndex(s => s.id === settlementId);

                if (selectedIndex !== -1) {
                    const selectedSettlement = allProjectSettlements[selectedIndex];
                    endDate = new Date(selectedSettlement.settlementDate);

                    const previousSettlement = allProjectSettlements[selectedIndex + 1]; // The next one in reverse sorted array
                    if (previousSettlement) {
                        startDate = new Date(previousSettlement.settlementDate);
                        previousSettlement.balances.forEach(item => previousContributions.set(item.investorId, item.balance));
                    }
                }
                executeSettlementBtn.style.display = 'none'; // Hide execute button for historical
            }

            // 3. Display the "Previous Contribution" section
            const previousSettlementSummaryDiv = document.getElementById('previous-settlement-summary');
            if (previousContributions.size > 0) {
                let summaryHtml = `<p class="mb-2"><strong>إجمالي المساهمات حتى تاريخ ${startDate.toISOString().split('T')[0]}:</strong></p><ul class="list-disc pr-5">`;
                investorIds.forEach(id => {
                    const balance = previousContributions.get(id) || 0;
                    summaryHtml += `<li>${investorMap.get(id) || 'غير معروف'}: <span class="font-bold">${formatCurrency(balance)}</span></li>`;
                });
                summaryHtml += '</ul>';
                previousSettlementSummaryDiv.innerHTML = summaryHtml;
            } else {
                previousSettlementSummaryDiv.innerHTML = '<p class="text-gray-500">لا توجد مساهمات سابقة. هذه هي الفترة الأولى.</p>';
            }

            // 4. Fetch vouchers for the determined period
            let query = db.vouchers.where('date').above(startDate.toISOString().split('T')[0]);
            if (endDate) {
                query = query.and(v => v.date <= endDate.toISOString().split('T')[0]);
            }
            const paymentVouchers = await query.and(v => v.projectId === projectId && v.movementType === 'Payment' && v.paidByInvestorId).toArray();

            // 5. Normalize and calculate period expenses
            const expenseVouchers = paymentVouchers.map(v => ({
                amount: v.credit, paidByInvestorId: v.paidByInvestorId
            }));
            const totalPeriodExpenses = expenseVouchers.reduce((sum, v) => sum + v.amount, 0);
            totalExpensesSpan.textContent = formatCurrency(totalPeriodExpenses);

            // 6. Calculate period contribution
            const periodContribution = new Map();
            expenseVouchers.forEach(v => {
                const currentPaid = periodContribution.get(v.paidByInvestorId) || 0;
                periodContribution.set(v.paidByInvestorId, currentPaid + v.amount);
            });

            investorExpensesTbody.innerHTML = '';
            investorIds.forEach(id => {
                const totalPaid = periodContribution.get(id) || 0;
                investorExpensesTbody.innerHTML += `<tr><td class="px-5 py-3">${investorMap.get(id) || 'غير معروف'}</td><td class="px-5 py-3">${formatCurrency(totalPaid)}</td></tr>`;
            });

            // 7. Calculate final balances for the settlement screen
            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);
            projectInvestors.forEach(pi => {
                const settlementRatio = useEqualSplit && projectInvestors.length > 0 ? (1 / projectInvestors.length) : (pi.share || 0);
                const currentPaid = periodContribution.get(pi.investorId) || 0;
                const fairShare = totalPeriodExpenses * settlementRatio;
                const balanceForThisPeriod = currentPaid - fairShare;

                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${(settlementRatio * 100).toFixed(2)}%`,
                    fairShare, paid: currentPaid, balance: balanceForThisPeriod
                });
            });

            // 8. Populate tables and settlement plan
            finalSettlementTbody.innerHTML = '';
            settlementData.forEach(data => {
                const balanceClass = data.balance >= 0 ? 'text-green-600' : 'text-red-600';
                finalSettlementTbody.innerHTML += `<tr><td class="px-5 py-3">${data.investorName}</td><td class="px-5 py-3">${data.settlementRatio}</td><td class="px-5 py-3">${formatCurrency(data.fairShare)}</td><td class="px-5 py-3">${formatCurrency(data.paid)}</td><td class="px-5 py-3 font-bold ${balanceClass}">${formatCurrency(data.balance)}</td></tr>`;
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
                if (selectedSettlementId === 'latest') executeSettlementBtn.disabled = true;
            } else {
                transactions.forEach(t => {
                    settlementPlanList.innerHTML += `<li>${t.from.investorName} يدفع ${formatCurrency(t.amount)} إلى ${t.to.investorName}</li>`;
                });
                if (selectedSettlementId === 'latest') executeSettlementBtn.disabled = false;
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
                const periodFairShare = d.fairShare; // Use the period's fair share for the new contribution
                newCumulativeContributions.set(d.investorId, prevContribution + periodFairShare);
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

    const historicalSettlementSelect = document.getElementById('historical-settlement-select');

    const populateSettlementHistoryDropdown = async (projectId) => {
        historicalSettlementSelect.innerHTML = ''; // Clear previous options
        if (!projectId) {
            historicalSettlementSelect.disabled = true;
            return;
        }

        try {
            const settlements = await db.project_settlements.where({ projectId }).reverse().sortBy('settlementDate');
            historicalSettlementSelect.disabled = false;

            // Add option for the latest/current settlement
            const latestOption = document.createElement('option');
            latestOption.value = 'latest';
            latestOption.textContent = 'تسوية جديدة / أحدث تسوية';
            historicalSettlementSelect.appendChild(latestOption);

            if (settlements.length > 0) {
                settlements.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = `تسوية تاريخ: ${s.settlementDate}`;
                    historicalSettlementSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Failed to populate settlement history:", error);
            historicalSettlementSelect.disabled = true;
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
        await populateSettlementHistoryDropdown(null); // Initially disable
    };

    projectSelect.addEventListener('change', async () => {
        const projectId = Number(projectSelect.value);
        await populateSettlementHistoryDropdown(projectId);
        await generateReports(); // Trigger report generation
    });

    historicalSettlementSelect.addEventListener('change', generateReports);
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
        const selectedSettlementId = historicalSettlementSelect.value;

        if (!projectId) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }

        try {
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

            // Determine date range based on selection
            const allProjectSettlements = await db.project_settlements.where({ projectId }).reverse().sortBy('settlementDate');
            const previousBalances = new Map();
            let startDate = new Date(0);
            let endDate = null;

            if (selectedSettlementId === 'latest') {
                const lastSettlement = allProjectSettlements[0];
                if (lastSettlement) {
                    startDate = new Date(lastSettlement.settlementDate);
                    lastSettlement.balances.forEach(item => previousBalances.set(item.investorId, item.balance));
                }
            } else {
                const settlementId = Number(selectedSettlementId);
                const selectedIndex = allProjectSettlements.findIndex(s => s.id === settlementId);
                if (selectedIndex !== -1) {
                    const selectedSettlement = allProjectSettlements[selectedIndex];
                    endDate = new Date(selectedSettlement.settlementDate);
                    const previousSettlement = allProjectSettlements[selectedIndex + 1];
                    if (previousSettlement) {
                        startDate = new Date(previousSettlement.settlementDate);
                        previousSettlement.balances.forEach(item => previousBalances.set(item.investorId, item.balance));
                    }
                }
            }

            // Fetch vouchers for the determined period
            let query = db.vouchers.where('date').above(startDate.toISOString().split('T')[0]);
            if (endDate) {
                query = query.and(v => v.date <= endDate.toISOString().split('T')[0]);
            }
            const paymentVouchers = await query.and(v => v.projectId === projectId && v.movementType === 'Payment' && v.paidByInvestorId).toArray();

            let reportHtml = `<h1 class="text-2xl font-bold text-center mb-4">تقرير المصروفات التفصيلي لمشروع: ${projectName}</h1>`;
            if(endDate) reportHtml += `<h2 class="text-lg text-center mb-4">للفترة من ${startDate.toISOString().split('T')[0]} إلى ${endDate.toISOString().split('T')[0]}</h2>`;
            else reportHtml += `<h2 class="text-lg text-center mb-4">للفترة بعد تاريخ ${startDate.toISOString().split('T')[0]}</h2>`;


            for (const investorId of investorIds) {
                const investorName = investorMap.get(investorId);
                reportHtml += `<div class="mb-8" style="page-break-after: always;">`;
                reportHtml += `<h2 class="text-xl font-bold border-b-2 border-gray-300 pb-2 mb-4">المستثمر: ${investorName}</h2>`;

                const relatedVouchers = paymentVouchers
                    .filter(v => v.paidByInvestorId === investorId)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                const prevBalance = previousBalances.get(investorId) || 0;

                reportHtml += `<table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">التاريخ</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">الحساب</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">الطرف (المورد)</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                            <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="bg-gray-50 font-bold">
                            <td colspan="4" class="px-5 py-2 border-b text-right">رصيد المساهمة السابق</td>
                            <td class="px-5 py-2 border-b text-left">${formatCurrency(prevBalance)}</td>
                        </tr>`;

                let totalPaid = 0;
                if (relatedVouchers.length === 0) {
                    reportHtml += `<tr><td colspan="5" class="text-center p-4">لا توجد مصروفات جديدة في هذه الفترة.</td></tr>`;
                } else {
                    relatedVouchers.forEach(v => {
                        const accountName = accountMap.get(v.accountId) || 'غير معروف';
                        const partyName = v.partyId ? partyMap.get(v.partyId) || '' : '';
                        const notes = v.description || '';
                        const paidAmount = v.credit;
                        totalPaid += paidAmount;
                        reportHtml += `<tr>
                            <td class="px-5 py-2 border-b">${v.date}</td>
                            <td class="px-5 py-2 border-b">${accountName}</td>
                            <td class="px-5 py-2 border-b">${partyName}</td>
                            <td class="px-5 py-2 border-b">${notes}</td>
                            <td class="px-5 py-2 border-b text-left">${formatCurrency(paidAmount)}</td>
                        </tr>`;
                    });
                }

                reportHtml += `</tbody>
                    <tfoot>
                        <tr class="font-bold">
                            <td colspan="4" class="px-5 py-2 border-t-2 text-right">إجمالي مصروفات الفترة</td>
                            <td class="px-5 py-2 border-t-2 text-left">${formatCurrency(totalPaid)}</td>
                        </tr>
                        <tr class="font-bold text-lg bg-gray-100">
                            <td colspan="4" class="px-5 py-2 border-t-2 text-right">إجمالي المساهمة النهائي</td>
                            <td class="px-5 py-2 border-t-2 text-left">${formatCurrency(prevBalance + totalPaid)}</td>
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
