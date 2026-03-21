import "./App.css";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

function App() {
  const minimize = async () => {
    await appWindow.minimize();
  };

  const toggleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const close = async () => {
    await appWindow.close();
  };

  return (
    <div className="app">
        <div className="titlebar" data-tauri-drag-region>
        {/* LEFT (was right) */}
        <div className="titlebar-left">
          <button className="icon-btn">⟳</button>
          <button className="icon-btn">⚙</button>
        </div>

        {/* CENTER */}
        <div className="titlebar-center" data-tauri-drag-region>
          FireFly
        </div>

        {/* RIGHT (was left) */}
        <div className="titlebar-right">
          <div className="traffic-buttons">
            <button className="win-btn min" imgSrc="minimize.png" onClick={minimize} />
            <button className="win-btn max" imgSrc="maximize.png" onClick={toggleMaximize} />
            <button className="win-btn close" imgSrc="assets/window-control-buttons/close.png"  onClick={close} />
          </div>
        </div>
      </div>

      <div className="body">
        <aside className="sidebar" data-tauri-drag-region>
          <button className="sidebar-btn active">+</button>
          <button className="sidebar-btn">◎</button>
        </aside>

        <main className="content">
          <div className="content-inner">
            <h1>What’s on your mind today?</h1>
            <div className="searchbar">
              <span className="search-icon">+</span>
              <input type="text" placeholder="Ask anything" />
              <button className="voice-btn">◉</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;