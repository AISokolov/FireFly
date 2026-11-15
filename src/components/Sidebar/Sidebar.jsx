import AddTabButton from "../AddTabButton/AddTabButton";
import TabButton from "../TabButton/TabButton";
import "./Sidebar.css";

function Sidebar({ tabs, activeTabId, trashCount, onAddTab, onSelectTab, onCloseTab, onContextMenu, onTrash }) {
    return (
        <aside className="sidebar" data-tauri-drag-region>
            <AddTabButton onAddTab={onAddTab} />

            <div className="tab-scroll" role="tablist" aria-label="Open tabs" data-tauri-drag-region>
                {tabs.map((tab) => (
                    <TabButton key={tab.id} tab={tab} isActive={tab.id === activeTabId} onClick={onSelectTab} onClose={onCloseTab} onContextMenu={onContextMenu} />
                ))}
            </div>
            <button type="button" className="sidebar-btn trash-button" onClick={onTrash} aria-label={`Recently closed tabs (${trashCount})`} title="Recently closed tabs">
                <span aria-hidden="true">♲</span>{trashCount > 0 && <span className="trash-count">{trashCount}</span>}
            </button>
        </aside>
    );
}

export default Sidebar;
