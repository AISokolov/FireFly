import "./AddTabButton.css";
function AddTabButton({ onAddTab }) {
    return (
        <button type="button" className="sidebar-btn" onClick={onAddTab} aria-label="Add tab or folder" title="Add tab or folder">
            +
        </button>
    );
}

export default AddTabButton;
