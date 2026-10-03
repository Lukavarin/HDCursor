/**
 * HDCursor - Shared Defaults and Schema Definitions
 * Phantom Cursor & Navigation Controller
 */

var HDCursorDefaults = (function () {
  'use strict';

  // Canonical modifier order
  const MODIFIERS_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];

  // Action definitions and default keybinds
  const ACTIONS = {
    toggle_cursor: {
      id: 'toggle_cursor',
      title: 'Toggle HD Cursor',
      description: 'Neutralize or restore mouse cursor interactions globally across all tabs.',
      category: 'HD Controls',
      defaultBinding: {
        modifiers: ['Shift'],
        triggerType: 'mouse',
        triggerCode: 'Mouse4',
        button: 3,
        key: null,
        displayName: 'Shift + Mouse 4'
      }
    },
    prev_tab: {
      id: 'prev_tab',
      title: 'Previous Tab',
      description: 'Navigate to the previous active tab in the current window.',
      category: 'Navigation',
      defaultBinding: {
        modifiers: [],
        triggerType: 'mouse',
        triggerCode: 'Mouse4',
        button: 3,
        key: null,
        displayName: 'Mouse 4'
      }
    },
    next_tab: {
      id: 'next_tab',
      title: 'Next Tab',
      description: 'Navigate to the next active tab in the current window.',
      category: 'Navigation',
      defaultBinding: {
        modifiers: [],
        triggerType: 'mouse',
        triggerCode: 'Mouse5',
        button: 4,
        key: null,
        displayName: 'Mouse 5'
      }
    }
  };

  // Default global extension settings
  const DEFAULT_SETTINGS = {
    // Current shield state (synchronized across all tabs)
    isNeutralized: false,

    // Hardware Pointer Lock API setting (off by default)
    pointerLockEnabled: false,

    // Permit mouse wheel scrolling while cursor is neutralized
    allowWheelScroll: true,

    // Action Keybinds mapping: actionId -> Binding object
    bindings: {
      toggle_cursor: { ...ACTIONS.toggle_cursor.defaultBinding },
      prev_tab: { ...ACTIONS.prev_tab.defaultBinding },
      next_tab: { ...ACTIONS.next_tab.defaultBinding }
    },

    // Schema version for migrations
    version: 1
  };

  // Mouse button code mapping
  const MOUSE_BUTTON_MAP = {
    0: { code: 'MouseLeft', label: 'Left Click' },
    1: { code: 'MouseMiddle', label: 'Middle Click' },
    2: { code: 'MouseRight', label: 'Right Click' },
    3: { code: 'Mouse4', label: 'Mouse 4' },
    4: { code: 'Mouse5', label: 'Mouse 5' }
  };

  // Map reverse code to button index
  const CODE_TO_BUTTON_MAP = {
    MouseLeft: 0,
    MouseMiddle: 1,
    MouseRight: 2,
    Mouse4: 3,
    Mouse5: 4
  };

  /**
   * Normalize modifier list to canonical order
   * @param {string[]} modifiers
   * @returns {string[]}
   */
  function normalizeModifiers(modifiers) {
    if (!Array.isArray(modifiers)) return [];
    return MODIFIERS_ORDER.filter(m => modifiers.includes(m));
  }

  /**
   * Generate canonical string signature for equality checking
   * e.g., "Shift+Mouse4" or "Ctrl+Alt+KeyJ"
   */
  function getBindingSignature(binding) {
    if (!binding) return '';
    const mods = normalizeModifiers(binding.modifiers);
    const trigger = binding.triggerCode || '';
    return [...mods, trigger].join('+');
  }

  /**
   * Format a binding into a human-readable display string
   */
  function formatDisplayName(modifiers, triggerCode) {
    const mods = normalizeModifiers(modifiers);
    let triggerLabel = triggerCode;

    // Check mouse button label
    for (const btn of Object.values(MOUSE_BUTTON_MAP)) {
      if (btn.code === triggerCode) {
        triggerLabel = btn.label;
        break;
      }
    }

    // Friendly keyboard labels
    if (triggerCode.startsWith('Key')) {
      triggerLabel = triggerCode.slice(3);
    } else if (triggerCode.startsWith('Digit')) {
      triggerLabel = triggerCode.slice(5);
    } else if (triggerCode === 'ArrowLeft') {
      triggerLabel = 'Left Arrow';
    } else if (triggerCode === 'ArrowRight') {
      triggerLabel = 'Right Arrow';
    } else if (triggerCode === 'ArrowUp') {
      triggerLabel = 'Up Arrow';
    } else if (triggerCode === 'ArrowDown') {
      triggerLabel = 'Down Arrow';
    }

    return [...mods, triggerLabel].join(' + ');
  }

  /**
   * Validate bindings for duplicates or invalid combinations
   * @param {Object} bindings Map of actionId -> binding
   * @returns {{ valid: boolean, errors: Object }}
   */
  function validateBindings(bindings) {
    const errors = {};
    const seen = new Map();

    for (const [actionId, binding] of Object.entries(bindings)) {
      if (!binding || !binding.triggerCode) {
        errors[actionId] = 'Action must have a bound key or mouse button.';
        continue;
      }

      const sig = getBindingSignature(binding);
      if (seen.has(sig)) {
        const existingAction = seen.get(sig);
        const err = `Duplicate binding: Matches "${ACTIONS[existingAction]?.title || existingAction}".`;
        errors[actionId] = err;
        errors[existingAction] = `Duplicate binding: Matches "${ACTIONS[actionId]?.title || actionId}".`;
      } else {
        seen.set(sig, actionId);
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  return {
    ACTIONS,
    DEFAULT_SETTINGS,
    MODIFIERS_ORDER,
    MOUSE_BUTTON_MAP,
    CODE_TO_BUTTON_MAP,
    normalizeModifiers,
    getBindingSignature,
    formatDisplayName,
    validateBindings
  };
})();

// Export globally across all extension environments
if (typeof globalThis !== 'undefined') {
  globalThis.HDCursorDefaults = HDCursorDefaults;
}
if (typeof window !== 'undefined') {
  try { window.HDCursorDefaults = HDCursorDefaults; } catch (_) { }
}
if (typeof module === 'object' && module.exports) {
  module.exports = HDCursorDefaults;
}
