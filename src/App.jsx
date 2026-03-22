import "./App.css";
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import Sidebar from "./components/Sidebar/Sidebar";
import AddTabModal from "./components/AddTabModal/AddTabModal";
import TitleBar from "./components/TitleBar/TitleBar";
import WebviewHost from "./components/WebViewHost/WebViewHost";
import {
  hideAllWebviews,
  showOnlyTabWebview,
  closeTabWebview,
} from "./components/WebViewHost/webviewManager";

const appWindow = getCurrentWindow();

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [isAddTabOpen, setIsAddTabOpen] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;

  const minimize = async () => {
    await appWindow.minimize();
  };

  const toggleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const close = async () => {
    await appWindow.close();
  };

  const handleOpenAddTabModal = async () => {
    await hideAllWebviews();
    setIsAddTabOpen(true);
  };

  const handleCloseModal = async () => {
    setIsAddTabOpen(false);

    if (activeTab) {
      const host = document.querySelector(".content");
      if (host) {
        const rect = host.getBoundingClientRect();
        await showOnlyTabWebview(activeTab.id, rect);
      }
    }
  };

  const handleSelectTab = (id) => {
    setActiveTabId(id);
  };

  const handleCreateTab = (tabData) => {
    const newTab = {
      id: Date.now(),
      title: tabData.title,
      url: tabData.url,
      icon: tabData.icon,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setIsAddTabOpen(false);
  };

  const handleCloseTab = async (tabId) => {
    await closeTabWebview(tabId);

    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

      if (activeTabId === tabId) {
        setActiveTabId(updatedTabs.length ? updatedTabs[0].id : null);
      }

      return updatedTabs;
    });
  };

  return (
    <div className="app">
      <TitleBar
        title={activeTab ? activeTab.title : "FireFly"}
        OnMinimize={minimize}
        OnMaximize={toggleMaximize}
        OnClose={close}
      />

      <div className="body">
        <Sidebar
          tabs={tabs}
          activeTabId={activeTabId}
          onAddTab={handleOpenAddTabModal}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
        />

        <main className="content">
          <WebviewHost activeTab={activeTab} />
        </main>

        <AddTabModal
          isOpen={isAddTabOpen}
          onClose={handleCloseModal}
          onCreateTab={handleCreateTab}
        />
      </div>
    </div>
  );
}

export default App;