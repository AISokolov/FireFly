import { useEffect, useState } from "react";
import { getName, getTauriVersion, getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./SettingsModal.css";

function SettingsModal({ isOpen, onClose, repositoryUrl }) {
    const [info, setInfo] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isOpen || info) return;
        Promise.all([getName(), getVersion(), getTauriVersion(), invoke("system_info")])
            .then(([name, version, tauriVersion, system]) => setInfo({ name, version, tauriVersion, ...system }))
            .catch((error) => setFeedback(`Could not read application information: ${error}`));
    }, [isOpen, info]);

    const clearCache = async () => {
        setBusy(true);
        setFeedback("");
        try {
            await invoke("clear_browser_cache");
            setFeedback("Browser cache cleared. Open websites may need to reload.");
            setConfirming(false);
        } catch (error) {
            setFeedback(`Cache could not be cleared: ${error}`);
        } finally { setBusy(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
                <div className="panel-heading"><h2 id="settings-title">Settings</h2><button className="panel-close" onClick={onClose} aria-label="Close settings">×</button></div>
                <section className="settings-section">
                    <h3>Browser data</h3>
                    <p>Remove cached website resources. Cookies, logins, saved tabs, preferences, and recently closed tabs are preserved.</p>
                    {!confirming ? <button className="primary-action" onClick={() => setConfirming(true)}>Clear Browser Cache</button> : (
                        <div className="cache-confirm" role="alert"><span>Cached resources will be removed and websites may need to reload.</span><button onClick={clearCache} disabled={busy}>{busy ? "Clearing…" : "Clear cache"}</button><button onClick={() => setConfirming(false)} disabled={busy}>Cancel</button></div>
                    )}
                    {feedback && <p className="settings-feedback" role="status">{feedback}</p>}
                </section>
                <section className="settings-section">
                    <h3>About FireFly</h3>
                    <p>A lightweight desktop browser overlay for multitasking on a single display.</p>
                    <dl className="about-grid">
                        <dt>Application</dt><dd>{info?.name ?? "Loading…"}</dd>
                        <dt>Version</dt><dd>{info?.version ?? "—"}</dd>
                        <dt>Tauri</dt><dd>{info?.tauriVersion ?? "—"}</dd>
                        <dt>Operating system</dt><dd>{info?.os ?? "—"}</dd>
                        <dt>Architecture</dt><dd>{info?.arch ?? "—"}</dd>
                    </dl>
                    {repositoryUrl && <button className="secondary-action" onClick={() => openUrl(repositoryUrl)}>Open project repository</button>}
                </section>
            </section>
        </div>
    );
}

export default SettingsModal;
