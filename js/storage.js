import { DEFAULT_SETTINGS } from './const/defaults.js';

export const storage = {
  /**
   * Get values from sync storage with defaults
   * @param {string|string[]} keys 
   * @returns {Promise<Object>}
   */
  async getSync(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (result) => {
        const finalResult = { ...result };
        const keysArray = Array.isArray(keys) ? keys : [keys];

        keysArray.forEach(key => {
          if (finalResult[key] === undefined && DEFAULT_SETTINGS[key] !== undefined) {
            finalResult[key] = DEFAULT_SETTINGS[key];
          }
        });

        resolve(finalResult);
      });
    });
  },

  /**
   * Set values in sync storage
   * @param {Object} items 
   * @returns {Promise<void>}
   */
  async setSync(items) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, resolve);
    });
  },

  /**
   * Get values from local storage
   * @param {string|string[]} keys 
   * @returns {Promise<Object>}
   */
  async getLocal(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  },

  /**
   * Set values in local storage
   * @param {Object} items 
   * @returns {Promise<void>}
   */
  async setLocal(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  },

  /**
   * Listen for changes in storage
   * @param {Function} callback 
   */
  onChanged(callback) {
    chrome.storage.onChanged.addListener(callback);
  }
};
