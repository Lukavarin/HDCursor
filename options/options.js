/**
 * HDCursor - Options Page Controller
 * Phantom Cursor & Navigation Controller
 */

'use strict';

const extApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
const defaults = (typeof HDCursorDefaults !== 'undefined' ? HDCursorDefaults : null) ||
  (typeof globalThis !== 'undefined' ? globalThis.HDCursorDefaults : null) ||
  (typeof window !== 'undefined' ? window.HDCursorDefaults : null);
const storage = (typeof HDCursorStorage !== 'undefined' ? HDCursorStorage : null) ||
  (typeof globalThis !== 'undefined' ? globalThis.HDCursorStorage : null) ||
  (typeof window !== 'undefined' ? window.HDCursorStorage : null);

// Application State
let currentSettings = null;
let currentRecordingActionId = null;
let pendingBinding = null;

// DOM Elements
const globalStatusPill = document.getElementById('global-status-pill');
const topbarStatusText = document.getElementById('topbar-status-text');
const btnResetDefaults = document.getElementById('btn-reset-defaults');

const cardMasterShield = document.getElementById('card-master-shield');
const toggleMasterShield = document.getElementById('toggle-master-shield');
const badgeShieldState = document.getElementById('badge-shield-state');
const togglePointerLock = document.getElementById('toggle-pointer-lock');
const toggleWheelScroll = document.getElementById('toggle-wheel-scroll');

const actionsTableBody = document.getElementById('actions-table-body');

// Recorder Elements
const recorderCard = document.getElementById('recorder-card');
const recorderPad = document.getElementById('recorder-pad');
const recorderActionTitle = document.getElementById('recorder-action-title');
const recorderStatusText = document.getElementById('recorder-status-text');
const recorderPreviewBadge = document.getElementById('recorder-preview-badge');
const recorderValidationError = document.getElementById('recorder-validation-error');
const btnSaveRecording = document.getElementById('btn-save-recording');
const btnDiscardRecording = document.getElementById('btn-discard-recording');
const btnCancelRecording = document.getElementById('btn-cancel-recording');

// Modal Elements
const modalReset = document.getElementById('modal-reset');
const btnConfirmReset = document.getElementById('btn-confirm-reset');
const btnCancelReset = document.getElementById('btn-cancel-reset');

// Sandbox Elements
const sandboxContainer = document.getElementById('sandbox-container');
const sandboxLog = document.getElementById('sandbox-log');
const btnClearSandbox = document.getElementById('btn-clear-sandbox');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Quick Presets Definition
const PRESETS = {
  default: {
    name: 'Mouse 4 & 5',
    bindings: {
      toggle_cursor: { modifiers: ['Shift'], triggerType: 'mouse', triggerCode: 'Mouse4', button: 3, key: null, displayName: 'Shift + Mouse 4' },
      prev_tab: { modifiers: [], triggerType: 'mouse', triggerCode: 'Mouse4', button: 3, key: null, displayName: 'Mouse 4' },
      next_tab: { modifiers: [], triggerType: 'mouse', triggerCode: 'Mouse5', button: 4, key: null, displayName: 'Mouse 5' }
    }
  },
  xmbc: {
    name: 'XMBC (F13–F15)',
    bindings: {
      toggle_cursor: { modifiers: [], triggerType: 'keyboard', triggerCode: 'F15', button: null, key: 'F15', displayName: 'F15' },
      prev_tab: { modifiers: [], triggerType: 'keyboard', triggerCode: 'F13', button: null, key: 'F13', displayName: 'F13' },
      next_tab: { modifiers: [], triggerType: 'keyboard', triggerCode: 'F14', button: null, key: 'F14', displayName: 'F14' }
    }
  },
  alt: {
    name: 'Alt Navigation',
    bindings: {
      toggle_cursor: { modifiers: ['Alt'], triggerType: 'keyboard', triggerCode: 'KeyC', button: null, key: 'c', displayName: 'Alt + C' },
      prev_tab: { modifiers: ['Alt'], triggerType: 'keyboard', triggerCode: 'KeyZ', button: null, key: 'z', displayName: 'Alt + Z' },
      next_tab: { modifiers: ['Alt'], triggerType: 'keyboard', triggerCode: 'KeyX', button: null, key: 'x', displayName: 'Alt + X' }
    }
  }
};

/**
 * Display a non-intrusive toast notification using safe DOM APIs
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (type === 'success') {
    svg.setAttribute('stroke', '#99F4D1');
    const polyline = document.createElementNS(svgNs, 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);
  } else {
    svg.setAttribute('stroke', '#F87171');
    const circle = document.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    const line1 = document.createElementNS(svgNs, 'line');
    line1.setAttribute('x1', '12');
    line1.setAttribute('y1', '8');
    line1.setAttribute('x2', '12');
    line1.setAttribute('y2', '12');
    const line2 = document.createElementNS(svgNs, 'line');
    line2.setAttribute('x1', '12');
    line2.setAttribute('y1', '16');
    line2.setAttribute('x2', '12.01');
    line2.setAttribute('y2', '16');
    svg.appendChild(circle);
    svg.appendChild(line1);
    svg.appendChild(line2);
  }

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  toast.appendChild(svg);
  toast.appendChild(textSpan);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 2800);
}

/**
 * Render key badge HTML elements into a container safely
 */
function renderBindingBadges(container, binding) {
  container.textContent = '';
  if (!binding || !binding.triggerCode) {
    const unassigned = document.createElement('span');
    unassigned.className = 'badge-key';
    unassigned.style.color = 'var(--text-dim)';
    unassigned.textContent = 'Unassigned';
    container.appendChild(unassigned);
    return;
  }

  const mods = defaults.normalizeModifiers(binding.modifiers);
  mods.forEach(mod => {
    const modBadge = document.createElement('span');
    modBadge.className = 'badge-key';
    modBadge.textContent = mod;
    container.appendChild(modBadge);

    const plus = document.createElement('span');
    plus.className = 'badge-plus';
    plus.textContent = '+';
    container.appendChild(plus);
  });

  let triggerLabel = binding.triggerCode;
  for (const btn of Object.values(defaults.MOUSE_BUTTON_MAP)) {
    if (btn.code === binding.triggerCode) {
      triggerLabel = btn.label;
      break;
    }
  }

  if (triggerLabel.startsWith('Key')) triggerLabel = triggerLabel.slice(3);
  if (triggerLabel.startsWith('Digit')) triggerLabel = triggerLabel.slice(5);

  const triggerBadge = document.createElement('span');
  triggerBadge.className = 'badge-key';
  triggerBadge.textContent = triggerLabel;
  container.appendChild(triggerBadge);
}

/**
 * Render streamlined 3-column table of actions safely without innerHTML
 */
function renderActionsTable() {
  actionsTableBody.textContent = '';
  const svgNs = 'http://www.w3.org/2000/svg';

  for (const [actionId, actionDef] of Object.entries(defaults.ACTIONS)) {
    const binding = currentSettings.bindings[actionId] || actionDef.defaultBinding;
    const tr = document.createElement('tr');

    // 1. Action Name & Category Cell
    const tdAction = document.createElement('td');
    const titleCell = document.createElement('div');
    titleCell.className = 'action-title-cell';
    const rowTitle = document.createElement('span');
    rowTitle.className = 'action-row-title';
    rowTitle.textContent = actionDef.title;
    const rowCategory = document.createElement('span');
    rowCategory.className = 'action-row-category';
    rowCategory.textContent = actionDef.category;
    titleCell.appendChild(rowTitle);
    titleCell.appendChild(rowCategory);
    tdAction.appendChild(titleCell);

    // 2. Trigger Cell
    const tdTrigger = document.createElement('td');
    const badgeList = document.createElement('div');
    badgeList.className = 'key-badge-list';
    badgeList.id = `badge-container-${actionId}`;
    renderBindingBadges(badgeList, binding);
    tdTrigger.appendChild(badgeList);

    // 3. Customize Button Cell
    const tdControls = document.createElement('td');
    tdControls.className = 'action-controls-cell';
    const btnRecord = document.createElement('button');
    btnRecord.className = 'btn btn-secondary btn-record';
    btnRecord.setAttribute('data-action', actionId);

    const btnSvg = document.createElementNS(svgNs, 'svg');
    btnSvg.setAttribute('width', '12');
    btnSvg.setAttribute('height', '12');
    btnSvg.setAttribute('viewBox', '0 0 24 24');
    btnSvg.setAttribute('fill', 'none');
    btnSvg.setAttribute('stroke', 'currentColor');
    btnSvg.setAttribute('stroke-width', '2');
    btnSvg.setAttribute('stroke-linecap', 'round');
    btnSvg.setAttribute('stroke-linejoin', 'round');

    const circleOuter = document.createElementNS(svgNs, 'circle');
    circleOuter.setAttribute('cx', '12');
    circleOuter.setAttribute('cy', '12');
    circleOuter.setAttribute('r', '10');
    const circleInner = document.createElementNS(svgNs, 'circle');
    circleInner.setAttribute('cx', '12');
    circleInner.setAttribute('cy', '12');
    circleInner.setAttribute('r', '3');
    btnSvg.appendChild(circleOuter);
    btnSvg.appendChild(circleInner);

    const btnText = document.createElement('span');
    btnText.textContent = 'Record';

    btnRecord.appendChild(btnSvg);
    btnRecord.appendChild(btnText);
    tdControls.appendChild(btnRecord);

    tr.appendChild(tdAction);
    tr.appendChild(tdTrigger);
    tr.appendChild(tdControls);

    actionsTableBody.appendChild(tr);
  }

  // Bind Record buttons
  document.querySelectorAll('.btn-record').forEach(btn => {
    btn.addEventListener('click', () => {
      const actionId = btn.getAttribute('data-action');
      startRecording(actionId);
    });
  });
}

/**
 * Refresh all UI elements based on current settings
 */
function renderUI() {
  if (!currentSettings) return;

  const isActive = Boolean(currentSettings.isNeutralized);

  // Topbar Status Pill
  if (isActive) {
    globalStatusPill.classList.add('active');
    topbarStatusText.textContent = 'HD ACTIVE';
    badgeShieldState.classList.add('active');
    badgeShieldState.textContent = 'Active';
    if (cardMasterShield) cardMasterShield.classList.add('active-state');
  } else {
    globalStatusPill.classList.remove('active');
    topbarStatusText.textContent = 'HD STANDBY';
    badgeShieldState.classList.remove('active');
    badgeShieldState.textContent = 'Standby';
    if (cardMasterShield) cardMasterShield.classList.remove('active-state');
  }

  toggleMasterShield.checked = isActive;
  togglePointerLock.checked = Boolean(currentSettings.pointerLockEnabled);
  toggleWheelScroll.checked = Boolean(currentSettings.allowWheelScroll);

  renderActionsTable();
}

// =========================================================================
// QUICK PRESETS
// =========================================================================

document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', async () => {
    const presetKey = btn.getAttribute('data-preset');
    const preset = PRESETS[presetKey];
    if (!preset) return;

    const updatedBindings = {
      ...currentSettings.bindings,
      ...preset.bindings
    };

    await storage.saveSettings({ bindings: updatedBindings });
    currentSettings = await storage.getSettings();
    renderUI();
    showToast(`Loaded "${preset.name}" preset.`, 'success');
  });
});

// =========================================================================
// INPUT RECORDER SYSTEM
// =========================================================================

function startRecording(actionId) {
  const actionDef = defaults.ACTIONS[actionId];
  if (!actionDef) return;

  currentRecordingActionId = actionId;
  pendingBinding = null;

  recorderActionTitle.textContent = `Recording Input for "${actionDef.title}"`;
  recorderStatusText.textContent = 'Press any key or mouse button combination...';
  recorderPreviewBadge.textContent = 'Waiting for input...';
  recorderValidationError.classList.add('hidden');
  btnSaveRecording.disabled = true;

  recorderCard.classList.remove('hidden');
  recorderPad.focus();

  recorderCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function stopRecording() {
  currentRecordingActionId = null;
  pendingBinding = null;
  recorderCard.classList.add('hidden');
}

/**
 * Validate pending candidate binding against current bindings
 */
function validatePendingBinding(candidate) {
  if (!candidate || !candidate.triggerCode) {
    return { valid: false, message: 'Please press a key or mouse button.' };
  }

  const candidateSig = defaults.getBindingSignature(candidate);

  // Check against all other actions
  for (const [actionId, existingBinding] of Object.entries(currentSettings.bindings)) {
    if (actionId === currentRecordingActionId) continue;

    const existingSig = defaults.getBindingSignature(existingBinding);
    if (candidateSig === existingSig) {
      const conflictingTitle = defaults.ACTIONS[actionId]?.title || actionId;
      return {
        valid: false,
        message: `Conflict: Already assigned to "${conflictingTitle}".`
      };
    }
  }

  return { valid: true };
}

/**
 * Handle incoming input capture during recording
 */
function handleRecordedInput(e, type) {
  if (!currentRecordingActionId) return;

  e.preventDefault();
  e.stopPropagation();

  // Cancel on Escape key
  if (type === 'keyboard' && e.code === 'Escape') {
    stopRecording();
    return;
  }

  // Ignore isolated modifier presses
  if (type === 'keyboard' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
    const activeMods = [];
    if (e.ctrlKey) activeMods.push('Ctrl');
    if (e.altKey) activeMods.push('Alt');
    if (e.shiftKey) activeMods.push('Shift');
    if (e.metaKey) activeMods.push('Meta');
    recorderPreviewBadge.textContent = activeMods.join(' + ') + ' + ...';
    return;
  }

  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.metaKey) modifiers.push('Meta');

  let triggerType = type;
  let triggerCode = '';
  let buttonIndex = null;
  let keyName = null;

  if (type === 'mouse') {
    const btnMap = defaults.MOUSE_BUTTON_MAP[e.button];
    if (!btnMap) return;
    triggerCode = btnMap.code;
    buttonIndex = e.button;
  } else {
    triggerCode = e.code;
    keyName = e.key;
  }

  const displayName = defaults.formatDisplayName(modifiers, triggerCode);

  const candidate = {
    modifiers: defaults.normalizeModifiers(modifiers),
    triggerType,
    triggerCode,
    button: buttonIndex,
    key: keyName,
    displayName
  };

  const validation = validatePendingBinding(candidate);

  recorderPreviewBadge.textContent = displayName;

  if (validation.valid) {
    pendingBinding = candidate;
    recorderValidationError.classList.add('hidden');
    btnSaveRecording.disabled = false;
    recorderStatusText.textContent = 'Combination captured. Click "Save Binding" to apply.';
  } else {
    pendingBinding = null;
    recorderValidationError.textContent = validation.message;
    recorderValidationError.classList.remove('hidden');
    btnSaveRecording.disabled = true;
    recorderStatusText.textContent = 'Invalid combination. Please choose a different key or button.';
  }
}

// Bind recorder events with capture to preempt browser actions
recorderPad.addEventListener('keydown', (e) => handleRecordedInput(e, 'keyboard'), true);
recorderPad.addEventListener('mousedown', (e) => handleRecordedInput(e, 'mouse'), true);
recorderPad.addEventListener('auxclick', (e) => handleRecordedInput(e, 'mouse'), true);
recorderPad.addEventListener('contextmenu', (e) => handleRecordedInput(e, 'mouse'), true);

btnSaveRecording.addEventListener('click', async () => {
  if (!currentRecordingActionId || !pendingBinding) return;

  const actionId = currentRecordingActionId;
  const bindingToSave = pendingBinding;
  const actionTitle = defaults.ACTIONS[actionId]?.title || actionId;

  stopRecording();

  const result = await storage.setActionBinding(actionId, bindingToSave);

  if (result.success) {
    currentSettings = await storage.getSettings();
    renderUI();
    showToast(`Keybind for "${actionTitle}" updated to ${bindingToSave.displayName}.`, 'success');
  } else {
    showToast('Failed to save binding. Conflict detected.', 'error');
  }
});

btnDiscardRecording.addEventListener('click', stopRecording);
btnCancelRecording.addEventListener('click', stopRecording);

// =========================================================================
// SANDBOX EVENT VERIFICATION (MOUSE + KEYBOARD)
// =========================================================================

function logSandboxEvent(message, styleClass = '') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${styleClass}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  sandboxLog.appendChild(entry);
  sandboxLog.scrollTop = sandboxLog.scrollHeight;
}

function handleSandboxInput(e, type) {
  // Allow developer tools and refresh shortcuts to pass through
  if (e.key === 'F12' || (e.ctrlKey && e.key === 'r') || e.key === 'F5') {
    return;
  }

  // Prevent default browser actions for tested inputs (history back/forward, page scroll on Space, etc.)
  e.preventDefault();
  e.stopPropagation();

  // If lone modifier pressed, log state
  if (type === 'keyboard' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
    logSandboxEvent(`MODIFIER: [${e.key}] held`, 'system');
    return;
  }

  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.metaKey) modifiers.push('Meta');

  let triggerCode = '';
  if (type === 'mouse') {
    const btnMap = defaults.MOUSE_BUTTON_MAP[e.button];
    if (btnMap) triggerCode = btnMap.code;
  } else {
    triggerCode = e.code;
  }

  if (!triggerCode) return;

  const sig = [...defaults.normalizeModifiers(modifiers), triggerCode].join('+');
  let matchedAction = null;

  for (const [actionId, binding] of Object.entries(currentSettings.bindings)) {
    if (defaults.getBindingSignature(binding) === sig) {
      matchedAction = defaults.ACTIONS[actionId]?.title || actionId;
      break;
    }
  }

  const display = defaults.formatDisplayName(modifiers, triggerCode);

  if (matchedAction) {
    logSandboxEvent(`TRIGGER: "${display}" -> Matched: [${matchedAction}] (Default Blocked)`, 'matched');
  } else {
    const inputType = type === 'mouse' ? 'MOUSE' : 'KEY';
    logSandboxEvent(`${inputType}: "${display}" (Default Blocked)`, 'suppressed');
  }
}

// Direct sandbox container listeners
sandboxContainer.addEventListener('mousedown', (e) => handleSandboxInput(e, 'mouse'), true);
sandboxContainer.addEventListener('auxclick', (e) => handleSandboxInput(e, 'mouse'), true);
sandboxContainer.addEventListener('contextmenu', (e) => handleSandboxInput(e, 'mouse'), true);
sandboxContainer.addEventListener('keydown', (e) => handleSandboxInput(e, 'keyboard'), true);

// Make clicking inside sandbox focus the container
sandboxContainer.addEventListener('click', () => {
  sandboxContainer.focus();
});

// Global keyboard listener on window so typing anywhere on the page tests in sandbox (when not typing in an input or recorder)
window.addEventListener('keydown', (e) => {
  // If recorder is active, recorder has priority
  if (currentRecordingActionId) return;

  // If typing in an actual input element or contentEditable
  const tag = e.target ? e.target.tagName : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
    return;
  }

  // If reset modal is active, allow modal buttons
  if (modalReset && !modalReset.classList.contains('hidden')) {
    return;
  }

  handleSandboxInput(e, 'keyboard');
}, true);

if (btnClearSandbox) {
  btnClearSandbox.addEventListener('click', () => {
    sandboxLog.textContent = '';
    const entry = document.createElement('div');
    entry.className = 'log-entry system';
    entry.textContent = '[Log Cleared] Dispatcher is active. Testing keyboard or mouse will log matched actions below.';
    sandboxLog.appendChild(entry);
  });
}

// =========================================================================
// GENERAL SETTINGS LISTENERS
// =========================================================================

// HD Master Toggle
toggleMasterShield.addEventListener('change', async (e) => {
  const nextState = e.target.checked;
  await extApi.runtime.sendMessage({
    type: 'SET_NEUTRALIZED',
    state: nextState
  });
  currentSettings = await storage.getSettings();
  renderUI();
  showToast(nextState ? 'HD cursor activated.' : 'Cursor restored to normal.', 'success');
});

// Hardware Pointer Lock Toggle
togglePointerLock.addEventListener('change', async (e) => {
  const state = e.target.checked;
  await storage.setPointerLockState(state);
  currentSettings.pointerLockEnabled = state;
  showToast(state ? 'Hardware Pointer Lock enabled.' : 'Hardware Pointer Lock disabled.', 'success');
});

// Wheel Scroll Toggle
toggleWheelScroll.addEventListener('change', async (e) => {
  const state = e.target.checked;
  await storage.saveSettings({ allowWheelScroll: state });
  currentSettings.allowWheelScroll = state;
  showToast(state ? 'Mouse wheel document scrolling enabled.' : 'Mouse wheel scrolling blocked while HD is active.', 'success');
});

// Reset to Defaults Modal
btnResetDefaults.addEventListener('click', () => {
  modalReset.classList.remove('hidden');
});

btnCancelReset.addEventListener('click', () => {
  modalReset.classList.add('hidden');
});

btnConfirmReset.addEventListener('click', async () => {
  await storage.resetToDefaults();
  currentSettings = await storage.getSettings();
  renderUI();
  modalReset.classList.add('hidden');
  showToast('All settings and bindings restored to defaults.', 'success');
});

// Storage Change Listener for external updates
storage.addStorageListener((changes, area) => {
  if (area === 'local') {
    storage.getSettings().then(settings => {
      currentSettings = settings;
      renderUI();
    });
  }
});

// Initial boot
async function init() {
  try {
    currentSettings = await storage.getSettings();
    renderUI();
  } catch (err) {
    console.error('[HDCursor] Options page initialization error:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
