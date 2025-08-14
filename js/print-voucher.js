document.addEventListener('DOMContentLoaded', () => {
    // Basic Tafqeet (number to words) implementation
    // This is a simplified version for demonstration.
    function tafqeet(number) {
        // Will be implemented later if needed, returning a placeholder for now.
        // For a real app, a proper library should be used.
        return `فقط ${number} لا غير`;
    }

    const loadVoucherData = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const voucherId = Number(urlParams.get('id'));

        if (!voucherId) {
            document.body.innerHTML = '<h1>لم يتم العثور على رقم السند.</h1>';
            return;
        }

        try {
            const voucher = await db.vouchers.get(voucherId);
            if (!voucher) {
                document.body.innerHTML = '<h1>السند غير موجود.</h1>';
                return;
            }

            // Fetch related data
            const [party, account] = await Promise.all([
                voucher.partyId ? db.parties.get(voucher.partyId) : Promise.resolve(null),
                voucher.accountId ? db.accounts.get(voucher.accountId) : Promise.resolve(null)
            ]);

            // --- Populate settings ---
            const companyName = localStorage.getItem('companyName');
            if (companyName) {
                document.getElementById('company-name').textContent = companyName;
            }

            // --- Populate voucher fields ---
            const amount = voucher.debit > 0 ? voucher.debit : voucher.credit;

            let title = '';
            switch(voucher.movementType) {
                case 'Receipt': title = 'سند قبض'; break;
                case 'Payment': title = 'سند صرف'; break;
                case 'TransferIn': title = 'سند تحويل وارد'; break;
                case 'TransferOut': title = 'سند تحويل صادر'; break;
            }

            document.getElementById('voucher-title').textContent = title;
            document.getElementById('voucher-no').textContent = voucher.voucherNo;
            document.getElementById('voucher-date').textContent = voucher.date;

            document.getElementById('party-name').textContent = party ? party.name : '---';
            document.getElementById('account-name').textContent = account ? account.name : '---';
            document.getElementById('description').textContent = voucher.description;

            document.getElementById('amount-in-numbers').textContent = `${new Intl.NumberFormat().format(amount)} ${'SAR'}`; // Replace with currency from settings later
            document.getElementById('amount-in-words').textContent = tafqeet(amount);

            // Automatically trigger print dialog after a short delay
            setTimeout(() => window.print(), 500);

        } catch (error) {
            console.error('Failed to load voucher data:', error);
            document.body.innerHTML = '<h1>حدث خطأ أثناء تحميل بيانات السند.</h1>';
        }
    };

    loadVoucherData();
});
