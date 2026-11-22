import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Sidebar from "./components/Sidebar/Sidebar";
import AddTabModal from "./components/AddTabModal/AddTabModal";
import SettingsModal from "./components/SettingsModal/SettingsModal";
import TabContextMenu from "./components/TabContextMenu/TabContextMenu";
import TrashModal from "./components/TrashModal/TrashModal";
import TitleBar from "./components/TitleBar/TitleBar";
import WebviewHost from "./components/WebViewHost/WebViewHost";
import { webviewManager } from "./components/WebViewHost/webviewManager";
import useTabSession from "./tabs/useTabSession";
import { finishBeforeClose } from "./shutdown";
import FolderModal from "./components/FolderModal/FolderModal";
import { locateItem } from "./tabs/layout";

const appWindow = getCurrentWindow();
const REPOSITORY_URL = import.meta.env.VITE_REPOSITORY_URL || null;

function App() {
  const { session, ready, error, reportError, addTab, editTab, duplicateTab, update, flush } = useTabSession();
  const { tabs, layout, activeTabId, recentlyClosed, preferences } = session;
  const [folderId, setFolderId] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [modal, setModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeInProgress = useRef(false);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;
  const overlaysOpen = Boolean(modal || contextMenu || closing || customizing);
  const transparencyModeEnabled = preferences.webviewOpacity === 60 && preferences.alwaysOnTop;

  const quit = useCallback(async () => {
    if (closeInProgress.current) return;
    closeInProgress.current = true;
    setClosing(true);
    try {
      await finishBeforeClose({
        ready,
        flushWebviews: () => webviewManager.flush(),
        flushSession: flush,
        destroy: () => invoke("quit_application"),
      });
    } catch (cause) {
      reportError(cause);
      closeInProgress.current = false;
      setClosing(false);
    }
  }, [ready, flush, reportError]);

  useEffect(() => {
    let cancelled = false;
    const listeners = [];
    for (const [event, callback] of [["quit-requested", quit], ["window-hidden", () => { if (ready) flush().catch(reportError); }]]) {
      listen(event, callback).then((stop) => { if (cancelled) stop(); else listeners.push(stop); }, reportError);
    }
    return () => { cancelled = true; listeners.forEach((stop) => stop()); };
  }, [quit, ready, flush, reportError]);

  useEffect(() => {
    if (ready) setFolderId(locateItem(layout, activeTabId).folderId);
    // Follow selection (including trash restoration), but allow browsing folders without switching pages.
  }, [ready, activeTabId]);

  const dismissModal = useCallback(() => setModal(null), []);
  const finishCustomizing = () => { setCustomizing(false); flush().catch(reportError); };

  useEffect(() => {
    if (!ready) return;
    webviewManager.setOpacity(preferences.webviewOpacity).catch(reportError);
  }, [ready, preferences.webviewOpacity, reportError]);

  useEffect(() => {
    if (!ready) return;
    appWindow.setAlwaysOnTop(preferences.alwaysOnTop)
      .then(() => appWindow.isAlwaysOnTop())
      .then((actual) => {
        if (actual !== preferences.alwaysOnTop) update({ type: "preferences", value: { alwaysOnTop: actual } });
      }, reportError);
  }, [ready, preferences.alwaysOnTop, update, reportError]);

  const submitTab = (data) => {
    const saved = modal?.type === "edit" ? editTab(modal.tab.id, data) : addTab(data, folderId);
    if (saved) setModal(null);
    return saved;
  };

  const setAlwaysOnTop = async (value) => {
    try {
      await appWindow.setAlwaysOnTop(value);
      const actual = await appWindow.isAlwaysOnTop();
      update({ type: "preferences", value: { alwaysOnTop: actual } });
    } catch (cause) { reportError(cause); }
  };

  const showContextMenu = (event, tab, folder) => {
    setContextMenu({ tab, folder, inFolder: Boolean(folderId), x: event.clientX, y: event.clientY });
  };

  return (
    <div className="app">
      <TitleBar
        title={activeTab ? activeTab.title : "FireFly"}
        OnMinimize={() => appWindow.minimize()}
        OnMaximize={() => appWindow.toggleMaximize()}
        OnClose={() => appWindow.close().catch(reportError)}
        onSettings={() => { setContextMenu(null); setModal({ type: "settings" }); }}
        transparency={{
          opacity: preferences.webviewOpacity,
          alwaysOnTop: preferences.alwaysOnTop,
          onOpacityChange: (value) => update({ type: "preferences", value: { webviewOpacity: value } }),
          onAlwaysOnTopChange: setAlwaysOnTop,
          onDefault: () => {
            const enable = !transparencyModeEnabled;
            update({ type: "preferences", value: { webviewOpacity: enable ? 60 : 100 } });
            setAlwaysOnTop(enable);
          },
        }}
      />
      {error && <div className="session-error" role="alert">{error}</div>}
      <div className="body" inert={!ready || closing ? true : undefined}>
        <Sidebar
          tabs={tabs}
          layout={layout}
          folderId={folderId}
          customizing={customizing}
          onOpenFolder={setFolderId}
          onDone={finishCustomizing}
          onMove={(id, destination, beforeId) => update({ type: "moveItem", id, folderId: destination, beforeId })}
          activeTabId={activeTabId}
          onAdd={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setContextMenu({ addOnly: true, x: bounds.right + 8, y: bounds.top }); }}
          onSelectTab={(id) => { setContextMenu(null); update({ type: "select", id }); }}
          onCloseTab={(id) => { setContextMenu(null); update({ type: "close", id }); }}
          onContextMenu={showContextMenu}
          onTrash={() => { setContextMenu(null); setModal({ type: "trash" }); }}
        />
        <main className="content">
          {ready ? <WebviewHost tabs={tabs} activeTabId={activeTabId} hidden={overlaysOpen} /> : <p role="status">Restoring tabs…</p>}
          {customizing && <div className="layout-help"><h2>Customize layout</h2><p>Drag items to reorder. Drop a tab in the center of a folder to move it inside.</p><p>Inside a folder, drop on ← to move to root, or hold over ← to reveal other folders.</p><p>Your pages stay open. Select <strong>Done</strong> in the sidebar to return.</p></div>}
        </main>
        <TabContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={(tab) => setModal({ type: "edit", tab })}
          onReload={(tab) => webviewManager.reload(tab.id).catch(reportError)}
          onDuplicate={(tab) => duplicateTab(tab.id)}
          onCloseTab={(tab) => update({ type: "close", id: tab.id })}
          onAddTab={() => setModal({ type: "create" })}
          onCreateFolder={() => setModal({ type: "folder" })}
          onOpenFolder={(folder) => setFolderId(folder.id)}
          onEditFolder={(folder) => setModal({ type: "folder", folder })}
          onDeleteFolder={(folder) => {
            if (folder.tabIds.length) setModal({ type: "deleteFolder", folder });
            else { update({ type: "deleteFolder", id: folder.id }); if (folderId === folder.id) setFolderId(null); }
          }}
          customizing={customizing}
          onCustomize={() => customizing ? finishCustomizing() : setCustomizing(true)}
        />
        {(modal?.type === "folder" || modal?.type === "deleteFolder") && <FolderModal key={modal.folder?.id ?? "new"} folder={modal.folder} deleting={modal.type === "deleteFolder"} onClose={dismissModal} onSubmit={(data) => {
          if (modal.type === "deleteFolder") { update({ type: "deleteFolder", id: modal.folder.id }); if (folderId === modal.folder.id) setFolderId(null); }
          else update({ type: modal.folder ? "editFolder" : "createFolder", id: modal.folder?.id ?? crypto.randomUUID(), ...data });
          setModal(null);
        }} />}
        <AddTabModal isOpen={modal?.type === "create" || modal?.type === "edit"} mode={modal?.type === "edit" ? "edit" : "create"} initialTab={modal?.tab} onClose={() => setModal(null)} onSubmit={submitTab} />
        <TrashModal
          isOpen={modal?.type === "trash"}
          items={recentlyClosed}
          onClose={() => setModal(null)}
          onRestore={(id) => update({ type: "restore", id })}
          onRestoreAll={() => update({ type: "restoreAll" })}
          onDelete={(id) => update({ type: "deleteClosed", id })}
          onEmpty={() => { update({ type: "emptyTrash" }); }}
        />
        <SettingsModal isOpen={modal?.type === "settings"} onClose={() => setModal(null)} repositoryUrl={REPOSITORY_URL} />
      </div>
    </div>
  );
}

export default App;
