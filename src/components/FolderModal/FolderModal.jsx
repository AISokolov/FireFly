import { useEffect, useRef, useState } from "react";
import { FOLDER_COLORS } from "../../tabs/layout";
import "../AddTabModal/AddTabModal.css";
import "./FolderModal.css";

const COLOR_NAMES = ["Violet", "Indigo", "Amber", "Rose", "Teal"];

export function FolderIcon() {
    return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
}

export default function FolderModal({ folder, deleting, onClose, onSubmit }) {
    const [name, setName] = useState(folder?.name ?? "");
    const [color, setColor] = useState(folder?.color ?? FOLDER_COLORS[0]);
    const ref = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        ref.current?.querySelector("input, button")?.focus();
        const handleKey = (event) => {
            if (event.key === "Escape") onClose();
            if (event.key !== "Tab") return;
            const controls = [...ref.current.querySelectorAll("input, button:not(:disabled)")];
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        window.addEventListener("keydown", handleKey);
        return () => { window.removeEventListener("keydown", handleKey); previous?.focus(); };
    }, [onClose]);
    return <div className="modal-overlay" onClick={onClose}>
        <section ref={ref} className="add-tab-modal folder-modal" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal-title" id="folder-modal-title">{deleting ? "Delete folder?" : folder ? "Edit folder" : "Create folder"}</h2>
            {deleting ? <>
                <p>Delete “{folder.name}”? Its {folder.tabIds.length} tabs will move to the root sidebar in their current order. Open pages will stay alive.</p>
                <div className="modal-actions"><button className="modal-btn secondary" onClick={onClose}>Cancel</button><button className="modal-btn primary" onClick={() => onSubmit()}>Delete Folder</button></div>
            </> : <form className="add-tab-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSubmit({ name: name.trim(), color }); }}>
                <label className="modal-label">Folder name<input required maxLength={80} className="modal-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Work" /></label>
                <fieldset className="folder-colors"><legend>Folder background color</legend>
                    {FOLDER_COLORS.map((value, index) => <button type="button" key={value} aria-label={COLOR_NAMES[index]} title={COLOR_NAMES[index]} aria-pressed={value === color} className={`folder-swatch ${color === value ? "selected" : ""}`} style={{ background: value }} onClick={() => setColor(value)}><FolderIcon /></button>)}
                </fieldset>
                <div className="modal-actions"><button type="button" className="modal-btn secondary" onClick={onClose}>Cancel</button><button disabled={!name.trim()} type="submit" className="modal-btn primary">{folder ? "Save" : "Create"}</button></div>
            </form>}
        </section>
    </div>;
}
