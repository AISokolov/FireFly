import "./TabButton.css";
function TabButton({ tab, isActive, onClick }) {
    return (
        <button
            className={`sidebar-btn ${isActive ? "selected" : ""}`}
            onClick={() => onClick(tab.id)}
        >
            {tab.icon ? (
                <img className="tab-icon" src={tab.icon} alt={tab.title} />
            ) : (
                <span>{tab.title?.[0] || "•"}</span>
            )}
        </button>
    );
}

export default TabButton;