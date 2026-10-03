/**
 * HDCursor - Storage Management Module
 * Phantom Cursor & Navigation Controller
 */

var HDCursorStorage = (function () {
  'use strict';

  const defaults = (typeof HDCursorDefaults !== 'undefined' ? HDCursorDefaults : null) ||
    (typeof globalThis !== 'undefined' ? globalThis.HDCursorDefaults : null) ||
    (typeof window !== 'undefined' ? window.HDCursorDefaults : null) ||
    (typeof require === 'function' ? (function () { try { return require('./defaults'); } catch (_) { return null; } })() : null);


  // Cross-browser browser API object (Firefox native 'browser' or 'chrome')
  const extApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

  if (!extApi) {
    console.warn('[HDCursor] WebExtension storage API unavailable in this context.');
  }

  // Memory or localStorage store fallback when WebExtension API is unavailable
  let memoryStore = null;

  function getFallbackStore() {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem('hdcursor_settings');
        if (item) {
          const parsed = JSON.parse(item);
          return {
            ...clone(defaults.DEFAULT_SETTINGS),
            ...parsed,
            bindings: {
              ...clone(defaults.DEFAULT_SETTINGS.bindings),
              ...(parsed.bindings || {})
            }
          };
        }
      } catch (_) {}
    }
    if (!memoryStore) {
      memoryStore = clone(defaults.DEFAULT_SETTINGS);
    }
    return memoryStore;
  }

  function setFallbackStore(data) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('hdcursor_settings', JSON.stringify(data));
      } catch (_) {}
    }
    memoryStore = clone(data);
  }

  /**
   * Deep clone an object safely
   */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Retrieve all settings merged with defaults
   * @returns {Promise<Object>}
   */
  async function getSettings() {
    if (!extApi || !extApi.storage || !extApi.storage.local) {
      return getFallbackStore();
    }

    try {
      const stored = await extApi.storage.local.get(null);
      if (!stored || Object.keys(stored).length === 0) {
        // Initialize storage with defaults
        await extApi.storage.local.set(defaults.DEFAULT_SETTINGS);
        return clone(defaults.DEFAULT_SETTINGS);
      }

      // Merge defaults with stored values to ensure new properties are populated
      return {
        ...clone(defaults.DEFAULT_SETTINGS),
        ...stored,
        bindings: {
          ...clone(defaults.DEFAULT_SETTINGS.bindings),
          ...(stored.bindings || {})
        }
      };
    } catch (err) {
      console.error('[HDCursor] Error loading settings from storage:', err);
      return getFallbackStore();
    }
  }

  /**
   * Save partial or full settings to storage
   * @param {Object} partialSettings
   * @returns {Promise<boolean>}
   */
  async function saveSettings(partialSettings) {
    if (!extApi || !extApi.storage || !extApi.storage.local) {
      const current = getFallbackStore();
      const updated = {
        ...current,
        ...partialSettings,
        bindings: {
          ...(current.bindings || {}),
          ...(partialSettings.bindings || {})
        }
      };
      setFallbackStore(updated);
      return true;
    }

    try {
      await extApi.storage.local.set(partialSettings);
      return true;
    } catch (err) {
      console.error('[HDCursor] Error saving settings to storage:', err);
      return false;
    }
  }

  /**
   * Update a single action binding
   * @param {string} actionId
   * @param {Object} binding
   */
  async function setActionBinding(actionId, binding) {
    const current = await getSettings();
    const updatedBindings = {
      ...current.bindings,
      [actionId]: binding
    };

    const validation = defaults.validateBindings(updatedBindings);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    await saveSettings({ bindings: updatedBindings });
    return { success: true };
  }

  /**
   * Reset all settings to defaults
   */
  async function resetToDefaults() {
    if (!extApi || !extApi.storage || !extApi.storage.local) {
      setFallbackStore(clone(defaults.DEFAULT_SETTINGS));
      return true;
    }
    try {
      await extApi.storage.local.clear();
      await extApi.storage.local.set(clone(defaults.DEFAULT_SETTINGS));
      return true;
    } catch (err) {
      console.error('[HDCursor] Error resetting settings:', err);
      return false;
    }
  }

  /**
   * Set global cursor neutralization state
   * @param {boolean} isNeutralized
   */
  async function setNeutralizedState(isNeutralized) {
    return saveSettings({ isNeutralized: Boolean(isNeutralized) });
  }

  /**
   * Set pointer lock enabled state
   * @param {boolean} pointerLockEnabled
   */
  async function setPointerLockState(pointerLockEnabled) {
    return saveSettings({ pointerLockEnabled: Boolean(pointerLockEnabled) });
  }

  /**
   * Subscribe to storage change events
   * @param {Function} callback (changes, areaName)
   */
  function addStorageListener(callback) {
    if (extApi && extApi.storage && extApi.storage.onChanged) {
      extApi.storage.onChanged.addListener(callback);
    }
  }

  return {
    getSettings,
    saveSettings,
    setActionBinding,
    resetToDefaults,
    setNeutralizedState,
    setPointerLockState,
    addStorageListener
  };
})();

// Export globally across all extension environments
if (typeof globalThis !== 'undefined') {
  globalThis.HDCursorStorage = HDCursorStorage;
}
if (typeof window !== 'undefined') {
  try { window.HDCursorStorage = HDCursorStorage; } catch (_) {}
}
if (typeof module === 'object' && module.exports) {
  module.exports = HDCursorStorage;
}
