import "./TransparencyControl.css";

function TransparencyControl({ opacity, alwaysOnTop, onOpacityChange, onAlwaysOnTopChange, onDefault }) {
    const modeEnabled = opacity === 60 && alwaysOnTop;
    return (
        <div className="transparency-control">
            <button
                className="icon-btn"
                onClick={onDefault}
                aria-label={modeEnabled ? "Restore browser opacity to 100% and disable always on top" : "Set browser opacity to 60% and keep FireFly on top"}
                title={modeEnabled ? "Restore opacity" : "Transparency"}
            >⛶</button>
            <div className="transparency-popover">
                <label><span>WebView Opacity <strong>{opacity}%</strong></span><input type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} /></label>
                <label className="top-checkbox"><input type="checkbox" checked={alwaysOnTop} onChange={(event) => onAlwaysOnTopChange(event.target.checked)} /> Always on Top</label>
            </div>
        </div>
    );
}

export default TransparencyControl;
