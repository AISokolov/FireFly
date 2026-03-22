import "./App.css";
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Component imports
import Sidebar from "./components/Sidebar/Sidebar";
import AddTabModal from "./components/AddTabModal/AddTabModal";
import TitleBar from "./components/TitleBar/TitleBar";

const appWindow = getCurrentWindow();

function App() {
  //list of all open tabs
  const [tabs, setTabs] = useState([]);
  //id of the currently active tab
  const [activeTabId, setActiveTabId] = useState(null);
  //whether the add tab modal 
  // (A modal window is a user interface element that appears on top of the main application content) is open
  const [isAddTabOpen, setIsAddTabOpen] = useState(false);
  // fetch the active tab object based on the activeTabId.
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

  const handleAddTab = () => {
    setIsAddTabOpen(true);
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
          onAddTab={handleAddTab}
          onSelectTab={handleSelectTab}
        />

        <main className="content">
          <h1>
            {activeTabId ? `Active tab: ${activeTabId}` : "No tabs yet"}
          </h1>
        </main>
        <AddTabModal
          isOpen={isAddTabOpen}
          onClose={() => setIsAddTabOpen(false)}
          onCreateTab={handleCreateTab}
        />
      </div>
    </div>
  );
}

export default App;