// Estate Manager - Utility Functions

/**
 * Generate a unique identifier with a prefix
 * @param {string} prefix - The prefix for the ID
 * @returns {string} - Unique ID
 */
export function generateUID(prefix = 'ID') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomStr}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} - Today's date
 */
export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Format number as Egyptian Pounds
 * @param {number|string} value - The value to format
 * @returns {string} - Formatted currency string
 */
export function formatEGP(value) {
  const num = Number(value || 0);
  if (!isFinite(num)) return '';
  
  const formatter = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return formatter.format(num).replace('EGP', 'ج.م');
}

/**
 * Parse a string to extract numeric value
 * @param {string} value - The string to parse
 * @returns {number} - Parsed number
 */
export function parseNumber(value) {
  const cleanValue = String(value || '').replace(/[^\d.]/g, '');
  return Number(cleanValue || 0);
}

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} content - The content to sanitize
 * @returns {string} - Sanitized content
 */
export function sanitizeHTML(content) {
  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show a toast notification
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, info)
 */
export function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Add toast styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    maxWidth: '300px',
    wordWrap: 'break-word'
  });

  // Set background color based on type
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  toast.style.backgroundColor = colors[type] || colors.info;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show a confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} title - The dialog title
 * @returns {Promise<boolean>} - Promise that resolves to true if confirmed
 */
export function showConfirmDialog(message, title = 'تأكيد') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    Object.assign(modal.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid var(--line)'
    });

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: var(--ink);">${title}</h3>
      <p style="margin: 0 0 24px 0; color: var(--muted);">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn secondary" id="cancel-btn">إلغاء</button>
        <button class="btn warn" id="confirm-btn">تأكيد</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('#cancel-btn');
    const confirmBtn = modal.querySelector('#confirm-btn');

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    confirmBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };
  });
}

/**
 * Export data as CSV file
 * @param {Array} headers - Array of header strings
 * @param {Array} rows - Array of row arrays
 * @param {string} filename - The filename for the CSV
 */
export function exportToCSV(headers, rows, filename) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Print HTML content in a new window
 * @param {string} title - The document title
 * @param {string} content - The HTML content to print
 */
export function printHTML(title, content) {
  const printWindow = window.open('', '_blank');
  const printDocument = `
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { 
            font-family: system-ui, Segoe UI, Roboto; 
            padding: 0; 
            margin: 0; 
            direction: rtl; 
            color: #111; 
          }
          .wrap { padding: 16px 18px; }
          h1 { font-size: 20px; margin: 0 0 12px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { 
            border: 1px solid #ccc; 
            padding: 6px 8px; 
            text-align: right; 
            vertical-align: top; 
          }
          thead th { background: #f1f5f9; }
          footer { margin-top: 12px; font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <div class="wrap">
          ${content}
          <footer>تمت الطباعة في ${new Date().toLocaleString('ar-EG')}</footer>
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(printDocument);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Egyptian format)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export function isValidPhone(phone) {
  const phoneRegex = /^(\+20|0)?1[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format date for display
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('ar-EG');
}

/**
 * Calculate days between two dates
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number} - Number of days between dates
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}


/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} - User confirmation
 */
export function showConfirmDialog(message, title = 'تأكيد') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10001'
    });

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    Object.assign(dialog.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid var(--line)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
    });

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: var(--ink);">${title}</h3>
      <p style="margin: 0 0 24px 0; color: var(--muted);">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="confirm-cancel" class="btn secondary">إلغاء</button>
        <button id="confirm-ok" class="btn warn">تأكيد</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    dialog.querySelector('#confirm-cancel').onclick = () => {
      cleanup();
      resolve(false);
    };

    dialog.querySelector('#confirm-ok').onclick = () => {
      cleanup();
      resolve(true);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };
  });
}

