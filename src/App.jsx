import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

const appWindow = getCurrentWindow();
const REPOSITORY_URL = import.meta.env.VITE_REPOSITORY_URL || null;

function App() {
  const { session, ready, error, reportError, addTab, editTab, duplicateTab, update, flush } = useTabSession();
  const { tabs, activeTabId, recentlyClosed, preferences } = session;
  const [modal, setModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeInProgress = useRef(false);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;
  const overlaysOpen = Boolean(modal || contextMenu || closing);
  const transparencyModeEnabled = preferences.webviewOpacity === 60 && preferences.alwaysOnTop;

  const close = useCallback(async () => {
    if (closeInProgress.current) return;
    closeInProgress.current = true;
    setClosing(true);
    try {
      await finishBeforeClose({
        ready,
        flushWebviews: () => webviewManager.flush(),
        flushSession: flush,
        destroy: () => appWindow.destroy(),
      });
    } catch (cause) {
      reportError(cause);
      closeInProgress.current = false;
      setClosing(false);
    }
  }, [ready, flush, reportError]);

  useEffect(() => {
    let cancelled = false;
    let unlisten;
    appWindow.onCloseRequested((event) => { event.preventDefault(); close(); }).then((stop) => {
      if (cancelled) stop(); else unlisten = stop;
    }, reportError);
    return () => { cancelled = true; unlisten?.(); };
  }, [close, reportError]);

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
    const saved = modal?.type === "edit" ? editTab(modal.tab.id, data) : addTab(data);
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

  const showContextMenu = (event, tab) => {
    setContextMenu({ tab, x: Math.min(event.clientX, window.innerWidth - 174), y: Math.min(event.clientY, window.innerHeight - 154) });
  };

  return (
    <div className="app">
      <TitleBar
        title={activeTab ? activeTab.title : "FireFly"}
        OnMinimize={() => appWindow.minimize()}
        OnMaximize={() => appWindow.toggleMaximize()}
        OnClose={close}
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
          activeTabId={activeTabId}
          trashCount={recentlyClosed.length}
          onAddTab={() => { setContextMenu(null); setModal({ type: "create" }); }}
          onSelectTab={(id) => { setContextMenu(null); update({ type: "select", id }); }}
          onCloseTab={(id) => { setContextMenu(null); update({ type: "close", id }); }}
          onContextMenu={showContextMenu}
          onTrash={() => { setContextMenu(null); setModal({ type: "trash" }); }}
        />
        <main className="content">
          {ready ? <WebviewHost tabs={tabs} activeTabId={activeTabId} hidden={overlaysOpen} /> : <p role="status">Restoring tabs…</p>}
        </main>
        <TabContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={(tab) => setModal({ type: "edit", tab })}
          onReload={(tab) => webviewManager.reload(tab.id).catch(reportError)}
          onDuplicate={(tab) => duplicateTab(tab.id)}
          onCloseTab={(tab) => update({ type: "close", id: tab.id })}
        />
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
