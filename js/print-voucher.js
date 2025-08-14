document.addEventListener('DOMContentLoaded', () => {
    // Tafqeet (number to words) - Basic Implementation
    // This is a simplified version for numbers up to 999.
    // It does not handle complex Arabic grammar (gender, etc.) perfectly.
    // A proper library would be needed for a full, professional solution.
    function tafqeet(number) {
        const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
        const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
        const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
        const hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

        if (number === 0) return "صفر";
        if (number > 999) return `(التفقيط للأرقام حتى 999 فقط) - ${number}`;

        let words = [];

        // Hundreds
        let h = Math.floor(number / 100);
        if (h > 0) {
            words.push(hundreds[h]);
            number %= 100;
        }

        // Tens and Units
        if (number > 0) {
            if (words.length > 0) words.push("و");

            if (number < 10) {
                words.push(units[number]);
            } else if (number < 20) {
                words.push(teens[number - 10]);
            } else {
                let u = number % 10;
                let t = Math.floor(number / 10);
                if (u > 0) {
                    words.push(units[u]);
                    words.push("و");
                }
                words.push(tens[t]);
            }
        }

        return "فقط " + words.join(" ") + " لا غير";
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

            // Using .innerHTML to allow for '---' if data is missing
            document.getElementById('party-name').innerHTML = party ? party.name : '---';
            document.getElementById('account-name').innerHTML = account ? account.name : '---';
            document.getElementById('description').innerHTML = voucher.description || '---';

            const currency = localStorage.getItem('currency') || 'EGP';
            document.getElementById('currency').textContent = currency;
            document.getElementById('amount-in-numbers').textContent = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency }).format(amount);
            document.getElementById('amount-in-words').textContent = tafqeet(amount) + ` ${currency}`;

            // Automatically trigger print dialog after a short delay
            setTimeout(() => window.print(), 500);

        } catch (error) {
            console.error('Failed to load voucher data:', error);
            document.body.innerHTML = '<h1>حدث خطأ أثناء تحميل بيانات السند.</h1>';
        }
    };

    loadVoucherData();
});
