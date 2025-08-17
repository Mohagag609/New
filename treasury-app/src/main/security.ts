import { session, BrowserWindow } from 'electron';

export function configureSecurity(mainWindow: BrowserWindow) {
  // Apply a strict Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          // In development, Vite's HMR requires 'unsafe-eval'. This should be removed in production.
          // For production, script-src 'self' is the goal.
          `script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}`,
          // Tailwind CSS requires 'unsafe-inline' for its dynamic classes.
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: file:",
          "connect-src 'self'",
        ].join('; '),
      },
    });
  });

  // Prevent loading of remote content in the main window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isExternal = !url.startsWith('http://localhost') && !url.startsWith('file://');
    if (isExternal) {
      event.preventDefault();
      console.warn(`Blocked navigation to external URL: ${url}`);
    }
  });

  // As requested, deny new-window creation, forcing links to open in the system browser
  // This is already handled in main.ts, but it's good practice to have security-related code together.
  mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
  });
}
