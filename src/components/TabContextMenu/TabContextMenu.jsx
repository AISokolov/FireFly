import { useEffect, useLayoutEffect, useRef } from "react";
import "./TabContextMenu.css";

function TabContextMenu({ menu, onClose, onEdit, onReload, onDuplicate, onCloseTab, onAddTab, onCreateFolder, onOpenFolder, onEditFolder, onDeleteFolder, onCustomize, customizing }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!menu) return;
        const dismiss = (event) => { if (!ref.current?.contains(event.target)) onClose(); };
        const escape = (event) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("pointerdown", dismiss);
        window.addEventListener("keydown", escape);
        return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", escape); };
    }, [menu, onClose]);
    useLayoutEffect(() => {
        if (!menu || !ref.current) return;
        const bounds = ref.current.getBoundingClientRect();
        ref.current.style.left = `${Math.max(4, Math.min(menu.x, window.innerWidth - bounds.width - 4))}px`;
        ref.current.style.top = `${Math.max(4, Math.min(menu.y, window.innerHeight - bounds.height - 4))}px`;
        ref.current.querySelector("button")?.focus();
    }, [menu]);
    if (!menu) return null;
    const run = (callback) => { callback(menu.tab ?? menu.folder); onClose(); };
    return (
        <div ref={ref} className="tab-context-menu" role="menu" style={{ top: menu.y, left: menu.x }}>
            {menu.tab ? <>
                <button role="menuitem" onClick={() => run(onEdit)}>Edit Tab</button>
                <button role="menuitem" onClick={() => run(onReload)}>Reload Tab</button>
                <button role="menuitem" onClick={() => run(onDuplicate)}>Duplicate Tab</button>
                <button role="menuitem" className="danger" onClick={() => run(onCloseTab)}>Close Tab</button>
            </> : menu.folder ? <>
                <button role="menuitem" onClick={() => run(onOpenFolder)}>Open Folder</button>
                <button role="menuitem" onClick={() => run(onEditFolder)}>Rename Folder</button>
                <button role="menuitem" onClick={() => run(onEditFolder)}>Change Folder Color</button>
                <button role="menuitem" className="danger" onClick={() => run(onDeleteFolder)}>Delete Folder</button>
            </> : <>
                <button role="menuitem" onClick={() => run(onAddTab)}>Add Tab</button>
                {!menu.inFolder && <button role="menuitem" onClick={() => run(onCreateFolder)}>Create Folder</button>}
            </>}
            {!menu.addOnly && <button role="menuitem" className="customize-action" onClick={() => run(onCustomize)}>{customizing ? "Finish Customizing" : "Customize Layout"}</button>}
        </div>
    );
}

export default TabContextMenu;
