import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AddTabButton from "../AddTabButton/AddTabButton";
import TabButton from "../TabButton/TabButton";
import { FolderIcon } from "../FolderModal/FolderModal";
import "./Sidebar.css";

function Sidebar({ tabs, layout, folderId, customizing, activeTabId, onAdd, onOpenFolder, onDone, onMove, onSelectTab, onCloseTab, onContextMenu, onTrash }) {
    const folder = layout.folders.find((item) => item.id === folderId);
    const ids = folder?.tabIds ?? layout.rootIds;
    const [dragId, setDragId] = useState(null);
    // Keep the native drag source mounted when hovering Back reveals the root.
    const renderIds = dragId && !ids.includes(dragId) ? [...ids, dragId] : ids;
    const [target, setTarget] = useState(null);
    const scroll = useRef(null);
    const backTimer = useRef(null);
    const suppressClick = useRef(false);
    const positions = useRef(new Map());
    const dragRegion = customizing ? undefined : "";
    const clearBackTimer = () => { clearTimeout(backTimer.current); backTimer.current = null; };
    const endDrag = () => { setDragId(null); setTarget(null); clearBackTimer(); };
    useEffect(() => () => clearTimeout(backTimer.current), []);
    useEffect(() => {
        if (!dragId) return;
        const end = () => endDrag();
        window.addEventListener("dragend", end);
        window.addEventListener("drop", end);
        return () => { window.removeEventListener("dragend", end); window.removeEventListener("drop", end); };
    }, [dragId]);
    useLayoutEffect(() => {
        const next = new Map();
        for (const node of scroll.current?.querySelectorAll("[data-item-id]") ?? []) {
            const top = node.getBoundingClientRect().top;
            const previous = positions.current.get(node.dataset.itemId);
            if (previous !== undefined && previous !== top && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                node.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "translateY(0)" }], { duration: 160, easing: "ease-out" });
            }
            next.set(node.dataset.itemId, top);
        }
        positions.current = next;
    }, [ids]);
    const accept = (event, destination) => {
        if (!customizing || !dragId) return;
        event.preventDefault(); event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setTarget(destination);
    };
    const drop = (event, destination) => {
        if (!customizing || !dragId) return;
        event.preventDefault(); event.stopPropagation();
        onMove(dragId, destination.folderId, destination.beforeId);
        endDrag();
    };
    const itemTarget = (event, id, isFolder) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const fraction = (event.clientY - bounds.top) / bounds.height;
        if (isFolder && !layout.folders.some((item) => item.id === dragId) && fraction > .25 && fraction < .75) return { folderId: id, key: id, kind: "inside" };
        const after = fraction >= .5;
        return { folderId: folder?.id ?? null, beforeId: after ? ids[ids.indexOf(id) + 1] : id, key: id, kind: after ? "after" : "before" };
    };
    const rootTarget = { folderId: null, key: "back", kind: "inside" };
    const endTarget = { folderId: folder?.id ?? null, key: "end", kind: "after" };
    return (
        <aside className={`sidebar ${customizing ? "customizing" : ""}`} data-tauri-drag-region={dragRegion}
            onContextMenu={(event) => { event.preventDefault(); onContextMenu(event); }}
            onPointerDownCapture={() => { if (!dragId) suppressClick.current = false; }}
            onKeyDownCapture={() => { if (!dragId) suppressClick.current = false; }}
            onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
            {folder ? <button type="button" className={`sidebar-btn back-button ${target?.key === "back" ? "drop-inside" : ""}`} title={`Back to root · ${folder.name}${customizing ? " · Drop here to move out; hover to browse root" : ""}`} aria-label={`Back to root from ${folder.name}`} onClick={() => onOpenFolder(null)}
                onDragOver={(event) => { accept(event, rootTarget); if (dragId && !backTimer.current) backTimer.current = setTimeout(() => { onOpenFolder(null); setTarget(null); clearBackTimer(); }, 650); }}
                onDragLeave={clearBackTimer} onDrop={(event) => drop(event, rootTarget)}>←</button> : <AddTabButton onAddTab={onAdd} />}
            {customizing && <button className="layout-done" onClick={() => { endDrag(); onDone(); }}>Done</button>}
            <div ref={scroll} className={`tab-scroll ${target?.key === "end" ? "drop-end" : ""}`} role="list" aria-label={folder ? `${folder.name} tabs` : "Sidebar tabs and folders"} data-tauri-drag-region={dragRegion}
                onDragOverCapture={(event) => {
                    if (!dragId) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (event.clientY < bounds.top + 30) event.currentTarget.scrollTop -= 12;
                    if (event.clientY > bounds.bottom - 30) event.currentTarget.scrollTop += 12;
                }}
                onDragOver={(event) => accept(event, endTarget)}
                onDrop={(event) => drop(event, endTarget)}>
                {renderIds.map((id) => {
                    const itemFolder = layout.folders.find((item) => item.id === id);
                    const tab = tabs.find((item) => item.id === id);
                    if (!itemFolder && !tab) return null;
                    return <div key={id} data-item-id={id} role="listitem" draggable={customizing} style={!ids.includes(id) ? { position: "absolute", left: -10000 } : undefined}
                        className={`sidebar-item ${dragId === id ? "drag-source" : ""} ${target?.key === id ? `drop-${target.kind}` : ""}`}
                        onDragStart={(event) => { if (!customizing) { event.preventDefault(); return; } event.stopPropagation(); suppressClick.current = true; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-firefly-item", id); setDragId(id); }}
                        onDragEnd={endDrag}
                        onDragOver={(event) => accept(event, itemTarget(event, id, Boolean(itemFolder)))}
                        onDrop={(event) => drop(event, itemTarget(event, id, Boolean(itemFolder)))}>
                        {itemFolder ? <button className={`sidebar-btn folder-button ${itemFolder.tabIds.includes(activeTabId) ? "contains-active" : ""}`} style={{ "--folder-color": itemFolder.color }} title={itemFolder.name} aria-label={`Open folder: ${itemFolder.name}`} onClick={() => onOpenFolder(id)} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onContextMenu(event, null, itemFolder); }}><FolderIcon /></button>
                            : <TabButton tab={tab} isActive={id === activeTabId} onClick={onSelectTab} onClose={onCloseTab} onContextMenu={onContextMenu} />}
                    </div>;
                })}
                {!ids.length && <span className="sidebar-empty" data-tauri-drag-region={dragRegion}>{customizing ? "Drop tabs here" : "Empty"}</span>}
            </div>
            <button type="button" className="sidebar-btn trash-button" onClick={onTrash} aria-label="Recently closed tabs" title="Recently closed tabs"><span aria-hidden="true">♲</span></button>
        </aside>
    );
}

export default Sidebar;
