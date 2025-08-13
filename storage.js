/**
 * @class Storage
 * Manages all interactions with the browser's localStorage for the treasury application.
 */
class Storage {
    constructor(storageKey = 'treasuryAppState') {
        this.storageKey = storageKey;
        this.initState();
    }

    /**
     * Initializes the state in localStorage if it doesn't already exist.
     */
    initState() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialState = {
                treasuries: [],
                parties: [],
                transactions: [],
                nextId: 1, // Simple ID generator
            };
            this.saveState(initialState);
        }
    }

    /**
     * Retrieves the entire application state from localStorage.
     * @returns {object} The application state.
     */
    getState() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey));
        } catch (error) {
            console.error("Error parsing state from localStorage:", error);
            return null;
        }
    }

    /**
     * Saves the entire application state to localStorage.
     * @param {object} state - The application state to save.
     */
    saveState(state) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving state to localStorage:", error);
        }
    }

    /**
     * Generates a new unique ID.
     * @returns {number} The new ID.
     */
    getNextId() {
        const state = this.getState();
        const nextId = state.nextId;
        state.nextId++;
        this.saveState(state);
        return nextId;
    }

    /**
     * Adds a new item to the state.
     * @param {('treasuries'|'parties'|'transactions')} itemType - The type of item to add.
     * @param {object} data - The data for the new item.
     * @returns {object} The newly added item with its ID.
     */
    addItem(itemType, data) {
        const state = this.getState();
        const newItem = {
            id: this.getNextId(),
            createdAt: new Date().toISOString(),
            ...data,
        };
        state[itemType].push(newItem);
        this.saveState(state);
        return newItem;
    }

    /**
     * Retrieves all items of a specific type.
     * @param {('treasuries'|'parties'|'transactions')} itemType - The type of items to retrieve.
     * @returns {Array} An array of items.
     */
    getAll(itemType) {
        return this.getState()[itemType] || [];
    }
    
    /**
     * Retrieves a single item by its ID.
     * @param {('treasuries'|'parties'|'transactions')} itemType - The type of item.
     * @param {number} id - The ID of the item to retrieve.
     * @returns {object|undefined} The found item or undefined.
     */
    getItemById(itemType, id) {
        const items = this.getAll(itemType);
        return items.find(item => item.id === id);
    }
    
    /**
     * Updates an existing item.
     * @param {('treasuries'|'parties'|'transactions')} itemType - The type of item to update.
     * @param {number} id - The ID of the item to update.
     * @param {object} updatedData - An object with the properties to update.
     * @returns {object|null} The updated item or null if not found.
     */
    updateItem(itemType, id, updatedData) {
        const state = this.getState();
        const itemIndex = state[itemType].findIndex(item => item.id === id);

        if (itemIndex > -1) {
            state[itemType][itemIndex] = { ...state[itemType][itemIndex], ...updatedData };
            this.saveState(state);
            return state[itemType][itemIndex];
        }

        return null;
    }
}

// Instantiate the storage manager for the app to use
const storage = new Storage();
