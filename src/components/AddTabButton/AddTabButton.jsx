import "./AddTabButton.css";
function AddTabButton({ onAddTab }) {
    return (
        <button className="sidebar-btn active" onClick={onAddTab}>
            +
        </button>
    );
}

export default AddTabButton;