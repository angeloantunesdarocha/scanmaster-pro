import { workspaceStorage, debounceAsync } from './core/storage.js';
import { applyHonestConversionLabels } from './converters/conversion-labels.js';

export async function registerOfflineSupport() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.warn('Falha ao registrar service worker:', error);
    return null;
  }
}

export function installWorkspaceRecovery({ getWorkspace, restoreWorkspace, onStatus = () => {} }) {
  const save = debounceAsync(async () => {
    try {
      await workspaceStorage.save(await getWorkspace());
      onStatus('Trabalho salvo neste dispositivo.');
    } catch (error) {
      console.warn('Falha no salvamento automático:', error);
      onStatus('Não foi possível salvar automaticamente.');
    }
  }, 700);

  const observer = new MutationObserver(() => save());
  observer.observe(document.body, { subtree: true, childList: true, attributes: true });

  window.addEventListener('pagehide', () => void workspaceStorage.save(getWorkspace()));

  return {
    async restore() {
      const workspace = await workspaceStorage.load();
      if (workspace) await restoreWorkspace(workspace);
      return workspace;
    },
    save,
    async clear() {
      observer.disconnect();
      await workspaceStorage.clear();
    }
  };
}

export async function bootstrapScanMaster(options = {}) {
  applyHonestConversionLabels();
  await registerOfflineSupport();
  if (options.getWorkspace && options.restoreWorkspace) {
    return installWorkspaceRecovery(options);
  }
  return null;
}
