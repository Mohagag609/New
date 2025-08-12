// Estate Manager - Security Management

import { showToast, showConfirmDialog } from './utils.js';
import storage from './storage.js';

/**
 * Simple hash function for password hashing
 * Note: This is a basic implementation. For production use, consider using a proper hashing library.
 * @param {string} password - Password to hash
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'estate_manager_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Security Manager Class
 */
class SecurityManager {
  constructor() {
    this.isAuthenticated = false;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.sessionTimer = null;
    this.init();
  }

  /**
   * Initialize security manager
   */
  init() {
    this.checkAuthenticationStatus();
    this.setupSessionTimeout();
  }

  /**
   * Check if user is authenticated
   */
  checkAuthenticationStatus() {
    const state = storage.getState();
    const { isLocked, lastAccess } = state.security;

    if (!isLocked) {
      this.isAuthenticated = true;
      return;
    }

    // Check if session has expired
    if (lastAccess) {
      const lastAccessTime = new Date(lastAccess).getTime();
      const now = Date.now();
      
      if (now - lastAccessTime < this.sessionTimeout) {
        this.isAuthenticated = true;
        this.resetSessionTimeout();
        return;
      }
    }

    this.isAuthenticated = false;
    this.showLoginDialog();
  }

  /**
   * Setup session timeout
   */
  setupSessionTimeout() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    if (this.isAuthenticated) {
      this.sessionTimer = setTimeout(() => {
        this.logout();
        showToast('انتهت جلسة العمل، يرجى تسجيل الدخول مرة أخرى', 'warning');
      }, this.sessionTimeout);
    }
  }

  /**
   * Reset session timeout
   */
  resetSessionTimeout() {
    this.setupSessionTimeout();
  }

  /**
   * Show login dialog
   */
  async showLoginDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000'
    });

    const loginForm = document.createElement('div');
    loginForm.className = 'login-form';
    Object.assign(loginForm.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid var(--line)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
    });

    loginForm.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div style="width: 60px; height: 60px; margin: 0 auto 16px; background: linear-gradient(135deg, #0ea5e9, #6366f1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">🔒</div>
        <h2 style="margin: 0; color: var(--ink); font-size: 24px;">تسجيل الدخول</h2>
        <p style="margin: 8px 0 0 0; color: var(--muted);">أدخل كلمة المرور للوصول إلى النظام</p>
      </div>
      
      <div style="margin-bottom: 24px;">
        <input type="password" id="login-password" placeholder="كلمة المرور" 
               style="width: 100%; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); color: var(--ink); font-size: 16px; text-align: center;">
        <div id="login-error" style="color: var(--warn); font-size: 14px; margin-top: 8px; display: none;"></div>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button type="button" id="login-cancel" class="btn secondary" style="flex: 1;">إلغاء</button>
        <button type="button" id="login-submit" class="btn" style="flex: 1;">دخول</button>
      </div>
    `;

    overlay.appendChild(loginForm);
    document.body.appendChild(overlay);

    const passwordInput = loginForm.querySelector('#login-password');
    const errorDiv = loginForm.querySelector('#login-error');
    const cancelBtn = loginForm.querySelector('#login-cancel');
    const submitBtn = loginForm.querySelector('#login-submit');

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const showError = (message) => {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      passwordInput.style.borderColor = 'var(--warn)';
    };

    const hideError = () => {
      errorDiv.style.display = 'none';
      passwordInput.style.borderColor = 'var(--line)';
    };

    const attemptLogin = async () => {
      const password = passwordInput.value;
      
      if (!password) {
        showError('يرجى إدخال كلمة المرور');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التحقق...';

      try {
        const success = await this.authenticate(password);
        
        if (success) {
          cleanup();
          showToast('تم تسجيل الدخول بنجاح', 'success');
        } else {
          showError('كلمة مرور غير صحيحة');
        }
      } catch (error) {
        showError('خطأ في تسجيل الدخول');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'دخول';
      }
    };

    passwordInput.addEventListener('input', hideError);
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        attemptLogin();
      }
    });

    cancelBtn.onclick = () => {
      cleanup();
      // Redirect to a safe page or show limited functionality
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg); color: var(--ink); text-align: center;">
          <div>
            <h1>الوصول مقيد</h1>
            <p>يرجى تسجيل الدخول للوصول إلى النظام</p>
            <button class="btn" onclick="location.reload()">إعادة المحاولة</button>
          </div>
        </div>
      `;
    };

    submitBtn.onclick = attemptLogin;

    // Focus on password input
    setTimeout(() => passwordInput.focus(), 100);
  }

  /**
   * Authenticate user with password
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>} - Authentication success
   */
  async authenticate(password) {
    try {
      const state = storage.getState();
      const { passwordHash } = state.security;

      if (!passwordHash) {
        // No password set, authentication fails
        return false;
      }

      const inputHash = await hashPassword(password);
      
      if (inputHash === passwordHash) {
        this.isAuthenticated = true;
        this.resetSessionTimeout();
        
        // Update last access time
        storage.updateState({
          security: {
            ...state.security,
            lastAccess: new Date().toISOString()
          }
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Set or change password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async setPassword(newPassword) {
    try {
      if (!newPassword || newPassword.length < 4) {
        showToast('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
        return false;
      }

      const passwordHash = await hashPassword(newPassword);
      const state = storage.getState();
      
      storage.updateState({
        security: {
          ...state.security,
          isLocked: true,
          passwordHash,
          lastAccess: new Date().toISOString()
        }
      });

      this.isAuthenticated = true;
      this.resetSessionTimeout();
      
      showToast('تم تعيين كلمة المرور بنجاح', 'success');
      return true;
    } catch (error) {
      console.error('Error setting password:', error);
      showToast('خطأ في تعيين كلمة المرور', 'error');
      return false;
    }
  }

  /**
   * Remove password protection
   * @returns {boolean} - Success status
   */
  removePassword() {
    const state = storage.getState();
    
    storage.updateState({
      security: {
        ...state.security,
        isLocked: false,
        passwordHash: null,
        lastAccess: new Date().toISOString()
      }
    });

    this.isAuthenticated = true;
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    showToast('تم إلغاء حماية كلمة المرور', 'info');
    return true;
  }

  /**
   * Logout user
   */
  logout() {
    this.isAuthenticated = false;
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    // Show login dialog again
    setTimeout(() => this.showLoginDialog(), 100);
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - Authentication status
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Show password management dialog
   */
  async showPasswordDialog() {
    const state = storage.getState();
    const hasPassword = !!state.security.passwordHash;

    const confirmed = await showConfirmDialog(
      hasPassword 
        ? 'هل تريد تغيير أو إزالة كلمة المرور الحالية؟'
        : 'هل تريد تعيين كلمة مرور لحماية النظام؟',
      'إدارة كلمة المرور'
    );

    if (!confirmed) return;

    const overlay = document.createElement('div');
    overlay.className = 'password-overlay';
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

    const passwordForm = document.createElement('div');
    passwordForm.className = 'password-form';
    Object.assign(passwordForm.style, {
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      border: '1px solid var(--line)'
    });

    passwordForm.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: var(--ink);">إدارة كلمة المرور</h3>
      
      <div style="margin-bottom: 16px;">
        <input type="password" id="new-password" placeholder="كلمة المرور الجديدة" 
               style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink);">
      </div>
      
      <div style="margin-bottom: 16px;">
        <input type="password" id="confirm-password" placeholder="تأكيد كلمة المرور" 
               style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink);">
      </div>
      
      <div id="password-error" style="color: var(--warn); font-size: 14px; margin-bottom: 16px; display: none;"></div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="cancel-password" class="btn secondary">إلغاء</button>
        ${hasPassword ? '<button id="remove-password" class="btn warn">إزالة كلمة المرور</button>' : ''}
        <button id="save-password" class="btn">حفظ</button>
      </div>
    `;

    overlay.appendChild(passwordForm);
    document.body.appendChild(overlay);

    const newPasswordInput = passwordForm.querySelector('#new-password');
    const confirmPasswordInput = passwordForm.querySelector('#confirm-password');
    const errorDiv = passwordForm.querySelector('#password-error');
    const cancelBtn = passwordForm.querySelector('#cancel-password');
    const removeBtn = passwordForm.querySelector('#remove-password');
    const saveBtn = passwordForm.querySelector('#save-password');

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const showError = (message) => {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    };

    const hideError = () => {
      errorDiv.style.display = 'none';
    };

    cancelBtn.onclick = cleanup;

    if (removeBtn) {
      removeBtn.onclick = async () => {
        const confirmed = await showConfirmDialog('هل أنت متأكد من إزالة كلمة المرور؟');
        if (confirmed) {
          this.removePassword();
          cleanup();
        }
      };
    }

    saveBtn.onclick = async () => {
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      hideError();

      if (!newPassword) {
        showError('يرجى إدخال كلمة مرور');
        return;
      }

      if (newPassword !== confirmPassword) {
        showError('كلمات المرور غير متطابقة');
        return;
      }

      if (newPassword.length < 4) {
        showError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
        return;
      }

      const success = await this.setPassword(newPassword);
      if (success) {
        cleanup();
      }
    };

    newPasswordInput.addEventListener('input', hideError);
    confirmPasswordInput.addEventListener('input', hideError);

    setTimeout(() => newPasswordInput.focus(), 100);
  }

  /**
   * Sanitize user input to prevent XSS
   * @param {string} input - User input
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize form data
   * @param {Object} data - Form data
   * @param {Array} requiredFields - Required field names
   * @returns {Object} - Validation result
   */
  validateFormData(data, requiredFields = []) {
    const errors = [];
    const sanitized = {};

    // Check required fields
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === '') {
        errors.push(`حقل ${field} مطلوب`);
      }
    }

    // Sanitize all string fields
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value.trim());
      } else {
        sanitized[key] = value;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: sanitized
    };
  }
}

// Create and export singleton instance
export const security = new SecurityManager();
export default security;

