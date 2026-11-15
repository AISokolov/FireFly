import { useLayoutEffect, useRef, useState } from "react";
import { webviewManager } from "./webviewManager";
import "./WebViewHost.css";

function WebviewHost({ tabs, activeTabId, hidden }) {
    const hostRef = useRef(null);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useLayoutEffect(() => {
        const host = hostRef.current;
        let cancelled = false;
        const sync = () => {
            webviewManager.sync({ tabs, activeTabId, hidden, rect: host.getBoundingClientRect() })
                .then(() => { if (!cancelled) setError(""); }, (cause) => {
                    console.error("Webview synchronization failed:", cause);
                    if (!cancelled) setError("Could not update the browser tab.");
                });
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(host);
        window.addEventListener("resize", sync);
        return () => {
            cancelled = true;
            observer.disconnect();
            window.removeEventListener("resize", sync);
        };
    }, [tabs, activeTabId, hidden, retry]);

    return (
        <div className="webview-wrapper">
            <div ref={hostRef} className="webview-host">
                {!tabs.length && <h1>No tabs yet</h1>}
                {error && <div role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
            </div>
        </div>
    );
}

export default WebviewHost;
