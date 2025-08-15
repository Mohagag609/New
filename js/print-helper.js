function printContent(elementId, documentTitle = 'Print') {
    const printElement = document.getElementById(elementId);
    if (!printElement) {
        console.error(`Element with ID "${elementId}" not found.`);
        return;
    }

    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (!printWindow) {
        alert('Please allow popups for this website to print.');
        return;
    }

    // Clone all stylesheets and style tags from the main document
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
    const styles = stylesheets.map(style => style.outerHTML).join('\n');

    // Get the HTML content to print
    const content = printElement.innerHTML;

    // Get the main direction for RTL support
    const direction = document.documentElement.dir || 'rtl';

    // Construct the HTML for the new window
    const printDocument = `
        <!DOCTYPE html>
        <html lang="ar" dir="${direction}">
        <head>
            <meta charset="UTF-8">
            <title>${documentTitle}</title>
            ${styles}
            <style>
                /* Additional print-specific styles */
                body { margin: 20px; }
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printDocument);
    printWindow.document.close();

    // Use a timeout to ensure content is loaded before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}
