import "./TrashModal.css";

function TrashModal({ isOpen, items, onClose, onRestore, onRestoreAll, onDelete, onEmpty }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <section className="trash-modal" role="dialog" aria-modal="true" aria-labelledby="trash-title" onClick={(event) => event.stopPropagation()}>
                <div className="panel-heading">
                    <div><h2 id="trash-title">Recently closed</h2><p>Up to 50 tabs are kept across restarts.</p></div>
                    <button className="panel-close" onClick={onClose} aria-label="Close trash">×</button>
                </div>
                <div className="trash-list">
                    {!items.length && <p className="empty-state">Trash is empty.</p>}
                    {items.map((item) => (
                        <article className="trash-item" key={item.id}>
                            {item.icon ? <img src={item.icon} alt="" /> : <span className="fallback-icon">{item.title[0]}</span>}
                            <div className="trash-details"><strong>{item.title}</strong><span>{item.url}</span><time dateTime={item.closedAt}>{new Date(item.closedAt).toLocaleString()}</time></div>
                            <button onClick={() => onRestore(item.id)}>Restore</button>
                            <button className="danger" onClick={() => onDelete(item.id)} aria-label={`Permanently delete ${item.title}`}>Delete</button>
                        </article>
                    ))}
                </div>
                <div className="panel-actions">
                    <button onClick={onRestoreAll} disabled={!items.length}>Restore All</button>
                    <button className="danger" onClick={onEmpty} disabled={!items.length}>Empty Trash</button>
                </div>
            </section>
        </div>
    );
}

export default TrashModal;
