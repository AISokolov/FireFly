import { useEffect, useRef } from "react";
import "./TabButton.css";
import { closeTabFromButton } from "./tabButtonActions";
function TabButton({ tab, isActive, onClick, onClose, onContextMenu }) {
  const ref = useRef(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isActive]);
  return (
    <div ref={ref} className="tab-button" onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onContextMenu(event, tab); }}>
      <button
        type="button"
        className={`sidebar-btn tab-select ${isActive ? "selected" : ""}`}
        onClick={() => onClick(tab.id)}
        aria-pressed={isActive}
        aria-label={tab.title}
        role="tab"
        aria-selected={isActive}
      >
        {tab.icon ? (
          <img className="tab-icon" src={tab.icon} alt="" />
        ) : (
          <span>{tab.title?.[0] || "•"}</span>
        )}
      </button>
      <button
        type="button"
        className="tab-close"
        title="Close tab"
        aria-label={`Close tab: ${tab.title}`}
        onClick={(event) => closeTabFromButton(event, tab.id, onClose)}
      >
      </button>
    </div>
  );
}

export default TabButton;
