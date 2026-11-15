import "./AddTabButton.css";
function AddTabButton({ onAddTab }) {
    return (
        <button type="button" className="sidebar-btn" onClick={onAddTab} aria-label="Add tab" title="Add tab">
            +
        </button>
    );
}

export default AddTabButton;
