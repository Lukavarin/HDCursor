/**
 * HDCursor - Background Controller (Manifest V3)
 * Phantom Cursor & Navigation Controller
 */

'use strict';

const extApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

// Ensure defaults and storage utilities are available
const defaults = (typeof HDCursorDefaults !== 'undefined' ? HDCursorDefaults : null) ||
  (typeof globalThis !== 'undefined' ? globalThis.HDCursorDefaults : null);
const storage = (typeof HDCursorStorage !== 'undefined' ? HDCursorStorage : null) ||
  (typeof globalThis !== 'undefined' ? globalThis.HDCursorStorage : null);

/**
 * Update the browser action badge based on current cursor state
 */
async function updateActionBadge(isNeutralized) {
  try {
    if (!extApi.action) return;

    if (isNeutralized) {
      await extApi.action.setBadgeText({ text: 'OFF' });
      await extApi.action.setBadgeBackgroundColor({ color: '#18181B' });
      if (extApi.action.setBadgeTextColor) {
        await extApi.action.setBadgeTextColor({ color: '#99F4D1' });
      }
      await extApi.action.setTitle({
        title: 'HDCursor: Active (Cursor & Interactions Neutralized)'
      });
    } else {
      await extApi.action.setBadgeText({ text: '' });
      await extApi.action.setTitle({
        title: 'HDCursor: Inactive (Normal Cursor)'
      });
    }
  } catch (err) {
    console.debug('[HDCursor] Badge update skipped or unsupported:', err);
  }
}

/**
 * Broadcast state update to all open tabs in all windows
 */
async function broadcastState(isNeutralized, pointerLockEnabled) {
  try {
    const tabs = await extApi.tabs.query({});
    const promises = tabs.map(tab => {
      // Content scripts cannot run on about:*, chrome:*, or moz-extension:* internal URLs
      if (!tab.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome:') || tab.url.startsWith('moz-extension:')) {
        return Promise.resolve();
      }

      return extApi.tabs.sendMessage(tab.id, {
        type: 'SYNC_STATE',
        isNeutralized,
        pointerLockEnabled
      }).catch(() => {
        // Tab may not have injected content script yet or is suspended
      });
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.error('[HDCursor] Error broadcasting state to tabs:', err);
  }
}

/**
 * Handle tab navigation in the current active window
 * @param {'prev' | 'next'} direction
 * @param {number} [windowId]
 */
async function handleTabNavigation(direction, windowId) {
  try {
    let targetWindowId = windowId;
    if (!targetWindowId) {
      const currentWindow = await extApi.windows.getCurrent();
      targetWindowId = currentWindow ? currentWindow.id : null;
    }

    const queryFilter = targetWindowId ? { windowId: targetWindowId } : { currentWindow: true };
    let tabs = await extApi.tabs.query(queryFilter);

    if (!tabs || tabs.length <= 1) {
      tabs = await extApi.tabs.query({ currentWindow: true });
    }

    if (!tabs || tabs.length <= 1) {
      console.log('[HDCursor BG] Cannot cycle tabs: Only 1 or 0 tabs open.');
      return { success: false, reason: 'Not enough tabs to cycle' };
    }

    // Sort tabs strictly by position index
    tabs.sort((a, b) => a.index - b.index);

    const activeIndex = tabs.findIndex(tab => tab.active);
    if (activeIndex === -1) {
      console.log('[HDCursor BG] Active tab index not found');
      return { success: false, reason: 'Active tab not found' };
    }

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (activeIndex + 1) % tabs.length;
    } else {
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    }

    const targetTab = tabs[nextIndex];
    if (targetTab && targetTab.id) {
      console.log(`[HDCursor BG] Switching tab [${direction}]: tab index ${activeIndex} -> ${nextIndex} (id: ${targetTab.id}, title: "${targetTab.title || 'tab'}")`);
      await extApi.tabs.update(targetTab.id, { active: true });
      return { success: true, targetTabId: targetTab.id, index: nextIndex };
    }

    return { success: false, reason: 'Target tab missing' };
  } catch (err) {
    console.error('[HDCursor BG] Tab navigation failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle global cursor neutralization state
 */
async function toggleCursorState() {
  const settings = await storage.getSettings();
  const newState = !settings.isNeutralized;

  await storage.setNeutralizedState(newState);
  await updateActionBadge(newState);
  await broadcastState(newState, settings.pointerLockEnabled);

  return { success: true, isNeutralized: newState };
}

/**
 * Set explicit cursor neutralization state
 */
async function setCursorState(state) {
  const settings = await storage.getSettings();
  const newState = Boolean(state);

  await storage.setNeutralizedState(newState);
  await updateActionBadge(newState);
  await broadcastState(newState, settings.pointerLockEnabled);

  return { success: true, isNeutralized: newState };
}

/**
 * Toggle audio mute state for the active tab in current window
 */
async function handleToggleMute(windowId) {
  try {
    const queryFilter = windowId ? { windowId, active: true } : { active: true, currentWindow: true };
    const tabs = await extApi.tabs.query(queryFilter);
    if (!tabs || tabs.length === 0) {
      return { success: false, reason: 'No active tab found' };
    }
    const activeTab = tabs[0];
    const isCurrentlyMuted = Boolean(activeTab.mutedInfo ? activeTab.mutedInfo.muted : activeTab.muted);
    const newMuted = !isCurrentlyMuted;
    await extApi.tabs.update(activeTab.id, { muted: newMuted });
    console.log(`[HDCursor BG] Tab ${activeTab.id} muted state toggled to: ${newMuted}`);
    return { success: true, muted: newMuted, tabId: activeTab.id };
  } catch (err) {
    console.error('[HDCursor BG] Tab mute toggle failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Close active tab in the current window or specified sender tab
 */
async function handleCloseTab(senderTab, windowId) {
  try {
    let targetTabId = senderTab ? senderTab.id : null;
    if (!targetTabId) {
      const queryFilter = windowId ? { windowId, active: true } : { active: true, currentWindow: true };
      let tabs = await extApi.tabs.query(queryFilter);
      if (!tabs || tabs.length === 0) {
        tabs = await extApi.tabs.query({ active: true, currentWindow: true });
      }
      if (tabs && tabs.length > 0) {
        targetTabId = tabs[0].id;
      }
    }

    if (targetTabId) {
      console.log(`[HDCursor BG] Closing tab ID: ${targetTabId}`);
      await extApi.tabs.remove(targetTabId);
      return { success: true, tabId: targetTabId };
    }

    return { success: false, reason: 'No active tab found to close' };
  } catch (err) {
    console.error('[HDCursor BG] Tab close failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Restore most recently closed tab or window
 */
async function handleRestoreTab() {
  try {
    if (!extApi.sessions || !extApi.sessions.restore) {
      console.warn('[HDCursor BG] sessions API not available');
      return { success: false, reason: 'Sessions API not available' };
    }
    const restoredSession = await extApi.sessions.restore();
    console.log('[HDCursor BG] Restored session:', restoredSession);
    return { success: true, session: restoredSession };
  } catch (err) {
    console.warn('[HDCursor BG] Restore tab failed or no closed tabs to restore:', err);
    return { success: false, error: err.message };
  }
}

// Runtime message dispatcher
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  console.log(`[HDCursor BG] Received runtime message: "${message.type}" from tab: ${sender.tab ? sender.tab.id : 'popup/options'}`);

  const asyncDispatcher = async () => {
    switch (message.type) {
      case 'GET_STATE': {
        const settings = await storage.getSettings();
        return { success: true, settings };
      }

      case 'TOGGLE_CURSOR': {
        return await toggleCursorState();
      }

      case 'SET_NEUTRALIZED': {
        return await setCursorState(message.state);
      }

      case 'NAVIGATE_TAB': {
        const winId = sender.tab ? sender.tab.windowId : undefined;
        return await handleTabNavigation(message.direction, winId);
      }

      case 'TOGGLE_MUTE': {
        const winId = sender.tab ? sender.tab.windowId : undefined;
        return await handleToggleMute(winId);
      }

      case 'CLOSE_TAB': {
        const winId = sender.tab ? sender.tab.windowId : undefined;
        return await handleCloseTab(sender.tab, winId);
      }

      case 'RESTORE_TAB': {
        return await handleRestoreTab();
      }

      case 'OPEN_OPTIONS': {
        if (extApi.runtime.openOptionsPage) {
          await extApi.runtime.openOptionsPage();
        } else {
          await extApi.tabs.create({ url: extApi.runtime.getURL('options/options.html') });
        }
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  };

  // Return promise for Firefox MV3 async response support
  asyncDispatcher().then(sendResponse).catch(err => {
    console.error('[HDCursor] Runtime message error:', err);
    sendResponse({ success: false, error: err.message });
  });

  return true; // Keep message channel open for async response
});

// Storage changes listener to synchronize UI across extension components
storage.addStorageListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes.isNeutralized) {
    updateActionBadge(changes.isNeutralized.newValue);
    storage.getSettings().then(settings => {
      broadcastState(changes.isNeutralized.newValue, settings.pointerLockEnabled);
    });
  }

  if (changes.pointerLockEnabled) {
    storage.getSettings().then(settings => {
      broadcastState(settings.isNeutralized, changes.pointerLockEnabled.newValue);
    });
  }
});

// Extension initial boot initialization
(async function init() {
  try {
    const settings = await storage.getSettings();
    await updateActionBadge(settings.isNeutralized);
    console.log('[HDCursor] Background controller initialized successfully.');
  } catch (err) {
    console.error('[HDCursor] Initialization error:', err);
  }
})();
