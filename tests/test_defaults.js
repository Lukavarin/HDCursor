const assert = require('assert');
const defaults = require('../shared/defaults');

console.log('Testing HDCursor Defaults & Validation Logic...');

// 1. Test Actions definition
assert.strictEqual(typeof defaults.ACTIONS.toggle_cursor, 'object');
assert.strictEqual(typeof defaults.ACTIONS.prev_tab, 'object');
assert.strictEqual(typeof defaults.ACTIONS.next_tab, 'object');

// 2. Test Default Bindings
assert.deepStrictEqual(defaults.ACTIONS.toggle_cursor.defaultBinding.modifiers, ['Shift']);
assert.strictEqual(defaults.ACTIONS.toggle_cursor.defaultBinding.triggerCode, 'Mouse4');
assert.strictEqual(defaults.ACTIONS.toggle_cursor.defaultBinding.button, 3);

assert.deepStrictEqual(defaults.ACTIONS.prev_tab.defaultBinding.modifiers, []);
assert.strictEqual(defaults.ACTIONS.prev_tab.defaultBinding.triggerCode, 'Mouse4');

assert.deepStrictEqual(defaults.ACTIONS.next_tab.defaultBinding.modifiers, []);
assert.strictEqual(defaults.ACTIONS.next_tab.defaultBinding.triggerCode, 'Mouse5');

// 3. Test Signature Generation
const sig1 = defaults.getBindingSignature(defaults.ACTIONS.toggle_cursor.defaultBinding);
assert.strictEqual(sig1, 'Shift+Mouse4');

const sig2 = defaults.getBindingSignature(defaults.ACTIONS.prev_tab.defaultBinding);
assert.strictEqual(sig2, 'Mouse4');

const sig3 = defaults.getBindingSignature(defaults.ACTIONS.next_tab.defaultBinding);
assert.strictEqual(sig3, 'Mouse5');

// 4. Test Validation of Defaults (must be valid, no conflicts)
const validationDefaults = defaults.validateBindings(defaults.DEFAULT_SETTINGS.bindings);
assert.strictEqual(validationDefaults.valid, true, 'Default bindings must have no conflicts');

// 5. Test Duplicate Detection
const duplicateBindings = {
  toggle_cursor: { modifiers: ['Shift'], triggerCode: 'Mouse4' },
  prev_tab: { modifiers: ['Shift'], triggerCode: 'Mouse4' }, // Duplicate!
  next_tab: { modifiers: [], triggerCode: 'Mouse5' }
};
const validationDup = defaults.validateBindings(duplicateBindings);
assert.strictEqual(validationDup.valid, false, 'Duplicate bindings must be detected');
assert.ok(validationDup.errors.toggle_cursor);
assert.ok(validationDup.errors.prev_tab);

// 6. Test Display Name Formatter
assert.strictEqual(defaults.formatDisplayName(['Shift'], 'Mouse4'), 'Shift + Mouse 4');
assert.strictEqual(defaults.formatDisplayName([], 'Mouse5'), 'Mouse 5');
assert.strictEqual(defaults.formatDisplayName(['Ctrl', 'Alt'], 'KeyK'), 'Ctrl + Alt + K');
assert.strictEqual(defaults.formatDisplayName([], 'ArrowLeft'), 'Left Arrow');

// 7. Test Storage Resolution with Defaults
const storage = require('../shared/storage');
assert.strictEqual(typeof storage.getSettings, 'function');
assert.strictEqual(typeof storage.saveSettings, 'function');
assert.strictEqual(typeof storage.addStorageListener, 'function');

console.log('All tests passed successfully!');
