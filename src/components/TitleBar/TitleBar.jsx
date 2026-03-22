import "./TitleBar.css";
function TitleBar({ OnMinimize, OnMaximize, OnClose, title }) {
    return (
        <div className="titlebar" data-tauri-drag-region>
            <div className="titlebar-left">
                <button className="icon-btn">⟳</button>
                <button className="icon-btn">⚙</button>
            </div>

            <div className="titlebar-center" data-tauri-drag-region>
                {title}
            </div>

            <div className="titlebar-right">
                <div className="traffic-buttons">
                    <button className="win-btn min" onClick={OnMinimize}></button>
                    <button className="win-btn max" onClick={OnMaximize}></button>
                    <button className="win-btn close" onClick={OnClose}></button>
                </div>
            </div>
        </div>
    );
}

export default TitleBar;