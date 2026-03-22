import { useEffect, useRef } from "react";
import { ensureTabWebview, showOnlyTabWebview } from "./webviewManager";
import "./WebViewHost.css";
function WebviewHost({ activeTab }) {
    const hostRef = useRef(null);

    useEffect(() => {
        if (!activeTab || !hostRef.current) return;

        const host = hostRef.current;

        const syncWebview = async () => {
            const rect = host.getBoundingClientRect();
            await ensureTabWebview(activeTab, rect);
            await showOnlyTabWebview(activeTab.id, rect);
        };

        syncWebview();

        const resizeObserver = new ResizeObserver(() => {
            syncWebview();
        });

        resizeObserver.observe(host);

        const onWindowResize = () => {
            syncWebview();
        };

        window.addEventListener("resize", onWindowResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", onWindowResize);
        };
    }, [activeTab]);

    if (!activeTab) {
        return <h1>No tabs yet</h1>;
    }

    return (
        <div className="webview-wrapper">
            <div ref={hostRef} className="webview-host" />
        </div>
    );
}

export default WebviewHost;