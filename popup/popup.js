/**
 * HDCursor - Popup Controller Script
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

// UI Elements
const heroCard = document.getElementById('hero-card');
const statusDot = document.getElementById('status-dot');
const statusLabel = document.getElementById('status-label');
const statusDesc = document.getElementById('status-desc');

const toggleShieldMaster = document.getElementById('toggle-shield-master');
const togglePointerLock = document.getElementById('toggle-pointer-lock');
const toggleWheelScroll = document.getElementById('toggle-wheel-scroll');

const badgeToggleCursor = document.getElementById('badge-toggle-cursor');
const badgePrevTab = document.getElementById('badge-prev-tab');
const badgeNextTab = document.getElementById('badge-next-tab');

const btnOpenOptions = document.getElementById('btn-open-options');
const btnConfigure = document.getElementById('btn-configure');

/**
 * Format and render keybind badges
 */
function renderKeybadges(bindings) {
  if (!bindings) return;

  if (bindings.toggle_cursor && badgeToggleCursor) {
    badgeToggleCursor.textContent = bindings.toggle_cursor.displayName ||
      defaults.formatDisplayName(bindings.toggle_cursor.modifiers, bindings.toggle_cursor.triggerCode);
  }

  if (bindings.prev_tab && badgePrevTab) {
    badgePrevTab.textContent = bindings.prev_tab.displayName ||
      defaults.formatDisplayName(bindings.prev_tab.modifiers, bindings.prev_tab.triggerCode);
  }

  if (bindings.next_tab && badgeNextTab) {
    badgeNextTab.textContent = bindings.next_tab.displayName ||
      defaults.formatDisplayName(bindings.next_tab.modifiers, bindings.next_tab.triggerCode);
  }
}

/**
 * Update UI state based on settings
 */
function updateUI(settings) {
  if (!settings) return;

  const isActive = Boolean(settings.isNeutralized);

  // Master switch
  toggleShieldMaster.checked = isActive;

  if (isActive) {
    heroCard.classList.add('active');
    statusLabel.textContent = 'HD ACTIVE';
    if (statusDesc) statusDesc.textContent = 'Cursor hidden across tabs';
  } else {
    heroCard.classList.remove('active');
    statusLabel.textContent = 'HD STANDBY';
    if (statusDesc) statusDesc.textContent = 'Cursor visible';
  }

  // Feature switches
  togglePointerLock.checked = Boolean(settings.pointerLockEnabled);
  toggleWheelScroll.checked = Boolean(settings.allowWheelScroll);

  // Render badges
  renderKeybadges(settings.bindings);
}

/**
 * Initialize popup state and bind events
 */
async function init() {
  try {
    const settings = await storage.getSettings();
    updateUI(settings);

    // Master Toggle
    toggleShieldMaster.addEventListener('change', async (e) => {
      const nextState = e.target.checked;
      await extApi.runtime.sendMessage({
        type: 'SET_NEUTRALIZED',
        state: nextState
      });
      const updated = await storage.getSettings();
      updateUI(updated);
    });

    // Pointer Lock Toggle
    togglePointerLock.addEventListener('change', async (e) => {
      await storage.setPointerLockState(e.target.checked);
    });

    // Wheel Scroll Toggle
    toggleWheelScroll.addEventListener('change', async (e) => {
      await storage.saveSettings({ allowWheelScroll: e.target.checked });
    });

    // Open Options Page
    const openOptionsHandler = () => {
      if (extApi.runtime && extApi.runtime.openOptionsPage) {
        extApi.runtime.openOptionsPage();
      } else {
        window.open(extApi.runtime ? extApi.runtime.getURL('options/options.html') : '../options/options.html');
      }
    };

    if (btnOpenOptions) btnOpenOptions.addEventListener('click', openOptionsHandler);
    if (btnConfigure) btnConfigure.addEventListener('click', openOptionsHandler);

    // Live update when storage changes
    storage.addStorageListener((changes, area) => {
      if (area === 'local') {
        storage.getSettings().then(updateUI);
      }
    });

  } catch (err) {
    console.error('[HDCursor] Popup initialization failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
