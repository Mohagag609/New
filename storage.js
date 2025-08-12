// Estate Manager - Storage Management

import { showToast } from './utils.js';

const STORAGE_KEY = 'estate_manager_pro_v3';

/**
 * Default application state structure
 */
const DEFAULT_STATE = {
  customers: [],
  units: [],
  partners: [],
  unitPartners: [],
  contracts: [],
  installments: [],
  payments: [],
  settings: {
    theme: 'dark',
    fontSize: 16,
    language: 'ar'
  },
  security: {
    isLocked: false,
    passwordHash: null,
    lastAccess: null
  }
};

/**
 * Storage Manager Class
 */
class StorageManager {
  constructor() {
    this.state = this.loadState();
    this.listeners = new Set();
  }

  /**
   * Load state from localStorage with error handling
   * @returns {Object} - Application state
   */
  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_STATE };

      const parsed = JSON.parse(stored);
      
      // Merge with default state to ensure all properties exist
      return this.mergeWithDefaults(parsed);
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
      showToast('خطأ في تحميل البيانات، سيتم استخدام البيانات الافتراضية', 'error');
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Merge loaded state with default state structure
   * @param {Object} loadedState - State loaded from storage
   * @returns {Object} - Merged state
   */
  mergeWithDefaults(loadedState) {
    const merged = { ...DEFAULT_STATE };
    
    // Merge each section
    Object.keys(DEFAULT_STATE).forEach(key => {
      if (loadedState[key] && typeof loadedState[key] === 'object') {
        if (Array.isArray(DEFAULT_STATE[key])) {
          merged[key] = Array.isArray(loadedState[key]) ? loadedState[key] : [];
        } else {
          merged[key] = { ...DEFAULT_STATE[key], ...loadedState[key] };
        }
      } else if (loadedState[key] !== undefined) {
        merged[key] = loadedState[key];
      }
    });

    return merged;
  }

  /**
   * Save state to localStorage with error handling
   */
  saveState() {
    try {
      // Update last access time
      this.state.security.lastAccess = new Date().toISOString();
      
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, serialized);
      
      // Notify listeners
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
      
      if (error.name === 'QuotaExceededError') {
        showToast('مساحة التخزين ممتلئة، يرجى حذف بعض البيانات', 'error');
      } else {
        showToast('خطأ في حفظ البيانات', 'error');
      }
      
      return false;
    }
  }

  /**
   * Get current state
   * @returns {Object} - Current application state
   */
  getState() {
    return this.state;
  }

  /**
   * Update state and save
   * @param {Object} updates - State updates
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }

  /**
   * Add item to a collection
   * @param {string} collection - Collection name
   * @param {Object} item - Item to add
   */
  addItem(collection, item) {
    if (!this.state[collection]) {
      this.state[collection] = [];
    }
    
    this.state[collection].push(item);
    this.saveState();
  }

  /**
   * Update item in a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {Object} updates - Updates to apply
   */
  updateItem(collection, id, updates) {
    const items = this.state[collection];
    if (!items) return false;

    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;

    items[index] = { ...items[index], ...updates };
    this.saveState();
    return true;
  }

  /**
   * Remove item from a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   */
  removeItem(collection, id) {
    if (!this.state[collection]) return false;

    const initialLength = this.state[collection].length;
    this.state[collection] = this.state[collection].filter(item => item.id !== id);
    
    if (this.state[collection].length < initialLength) {
      this.saveState();
      return true;
    }
    
    return false;
  }

  /**
   * Find item by ID in a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Object|null} - Found item or null
   */
  findItem(collection, id) {
    if (!this.state[collection]) return null;
    return this.state[collection].find(item => item.id === id) || null;
  }

  /**
   * Get all items from a collection
   * @param {string} collection - Collection name
   * @returns {Array} - Collection items
   */
  getCollection(collection) {
    return this.state[collection] || [];
  }

  /**
   * Search items in a collection
   * @param {string} collection - Collection name
   * @param {string} query - Search query
   * @param {Array} fields - Fields to search in
   * @returns {Array} - Filtered items
   */
  searchCollection(collection, query, fields = []) {
    if (!query.trim()) return this.getCollection(collection);

    const items = this.getCollection(collection);
    const lowerQuery = query.toLowerCase();

    return items.filter(item => {
      if (fields.length === 0) {
        // Search in all string fields
        return JSON.stringify(item).toLowerCase().includes(lowerQuery);
      }

      // Search in specific fields
      return fields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(lowerQuery);
      });
    });
  }

  /**
   * Export all data
   * @returns {Object} - All application data
   */
  exportData() {
    return {
      ...this.state,
      exportDate: new Date().toISOString(),
      version: '3.0'
    };
  }

  /**
   * Import data with validation
   * @param {Object} data - Data to import
   * @returns {boolean} - Success status
   */
  importData(data) {
    try {
      // Basic validation
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Validate required collections
      const requiredCollections = ['customers', 'units', 'contracts'];
      for (const collection of requiredCollections) {
        if (data[collection] && !Array.isArray(data[collection])) {
          throw new Error(`Invalid ${collection} data`);
        }
      }

      // Merge imported data with current state
      const importedState = this.mergeWithDefaults(data);
      this.state = importedState;
      
      if (this.saveState()) {
        showToast('تم استيراد البيانات بنجاح', 'success');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      showToast('خطأ في استيراد البيانات: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Clear all data
   */
  clearAllData() {
    this.state = { ...DEFAULT_STATE };
    this.saveState();
    showToast('تم مسح جميع البيانات', 'info');
  }

  /**
   * Add state change listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove state change listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Get storage usage information
   * @returns {Object} - Storage usage stats
   */
  getStorageInfo() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const sizeInBytes = new Blob([data || '']).size;
      const sizeInKB = Math.round(sizeInBytes / 1024);
      
      return {
        sizeInBytes,
        sizeInKB,
        itemCount: Object.keys(this.state).reduce((count, key) => {
          return count + (Array.isArray(this.state[key]) ? this.state[key].length : 0);
        }, 0)
      };
    } catch (error) {
      return { sizeInBytes: 0, sizeInKB: 0, itemCount: 0 };
    }
  }
}

// Create and export singleton instance
export const storage = new StorageManager();
export default storage;

