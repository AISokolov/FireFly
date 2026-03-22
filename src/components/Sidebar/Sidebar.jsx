import AddTabButton from "../AddTabButton/AddTabButton";
import TabButton from "../TabButton/TabButton";
import "./Sidebar.css";

function Sidebar({ tabs, activeTabId, onAddTab, onSelectTab }) {
    return (
        <aside className="sidebar" data-tauri-drag-region>
            <AddTabButton onAddTab={onAddTab} />

            {tabs.map((tab) => (
                <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onClick={onSelectTab}
                />
            ))}
        </aside>
    );
}

export default Sidebar;