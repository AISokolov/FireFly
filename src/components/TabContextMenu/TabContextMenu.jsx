import { useEffect, useRef } from "react";
import "./TabContextMenu.css";

function TabContextMenu({ menu, onClose, onEdit, onReload, onDuplicate, onCloseTab }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!menu) return;
        const dismiss = (event) => { if (!ref.current?.contains(event.target)) onClose(); };
        const escape = (event) => { if (event.key === "Escape") onClose(); };
        window.addEventListener("pointerdown", dismiss);
        window.addEventListener("keydown", escape);
        return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", escape); };
    }, [menu, onClose]);
    if (!menu) return null;
    const run = (callback) => { callback(menu.tab); onClose(); };
    return (
        <div ref={ref} className="tab-context-menu" role="menu" style={{ top: menu.y, left: menu.x }}>
            <button role="menuitem" onClick={() => run(onEdit)}>Edit Tab</button>
            <button role="menuitem" onClick={() => run(onReload)}>Reload Tab</button>
            <button role="menuitem" onClick={() => run(onDuplicate)}>Duplicate Tab</button>
            <button role="menuitem" className="danger" onClick={() => run(onCloseTab)}>Close Tab</button>
        </div>
    );
}

export default TabContextMenu;
