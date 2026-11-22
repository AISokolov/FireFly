import "./TitleBar.css";
import TransparencyControl from "../TransparencyControl/TransparencyControl";
function TitleBar({ OnMinimize, OnMaximize, OnClose, title, onSettings, transparency }) {
    return (
        <div className="titlebar" data-tauri-drag-region>
            <div className="titlebar-left">
                <button className="icon-btn" onClick={onSettings} aria-label="Open settings" title="Settings">⚙</button>
                <TransparencyControl {...transparency} />
            </div>

            <div className="titlebar-center" data-tauri-drag-region>
                {title}
            </div>

            <div className="titlebar-right">
                <div className="traffic-buttons">
                    <button className="win-btn min" onClick={OnMinimize} aria-label="Minimize FireFly"></button>
                    <button className="win-btn max" onClick={OnMaximize} aria-label="Maximize FireFly"></button>
                    <button className="win-btn close" onClick={OnClose} aria-label="Hide FireFly to tray" title="Hide FireFly to tray"></button>
                </div>
            </div>
        </div>
    );
}

export default TitleBar;
