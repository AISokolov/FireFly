import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

const webviews = new Map();

function normalizeUrl(url) {
    if (!url) return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

export async function ensureTabWebview(tab, rect) {
    const label = `tab_${tab.id}`;
    let webview = webviews.get(label);

    if (!webview) {
        const appWindow = getCurrentWindow();

        webview = new Webview(appWindow, label, {
            url: normalizeUrl(tab.url),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.max(100, Math.round(rect.width)),
            height: Math.max(100, Math.round(rect.height)),
        });

        webview.once("tauri://error", (error) => {
            console.error("Webview creation error:", error);
        });

        webviews.set(label, webview);
    }

    return webview;
}

export async function showOnlyTabWebview(tabId, rect) {
    const labelToShow = `tab_${tabId}`;

    for (const [label, webview] of webviews.entries()) {
        try {
            if (label === labelToShow) {
                if (rect) {
                    await webview.setPosition({
                        type: "Logical",
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                    });

                    await webview.setSize({
                        type: "Logical",
                        width: Math.max(100, Math.round(rect.width)),
                        height: Math.max(100, Math.round(rect.height)),
                    });
                }

                await webview.show();
                await webview.setFocus();
            } else {
                await webview.hide();
            }
        } catch (error) {
            console.error("Webview show/hide error:", error);
        }
    }
}

export async function hideAllWebviews() {
    for (const [, webview] of webviews.entries()) {
        try {
            await webview.hide();
        } catch (error) {
            console.error("Failed to hide webview:", error);
        }
    }
}

export async function closeTabWebview(tabId) {
    const label = `tab_${tabId}`;
    const webview = webviews.get(label);

    if (!webview) return;

    try {
        await webview.close();
    } catch (error) {
        console.error("Failed to close webview:", error);
    }

    webviews.delete(label);
}