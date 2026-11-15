import { getCurrentWindow } from "@tauri-apps/api/window";
import { getAllWebviews, Webview } from "@tauri-apps/api/webview";
import { createWebviewController } from "./webviewController.js";
import { invoke } from "@tauri-apps/api/core";

export function createTabWebviewOptions(tab, rect) {
    return {
        url: tab.url,
        x: -10000,
        y: -10000,
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        focus: false,
        zoomHotkeysEnabled: true,
    };
}

export const webviewManager = createWebviewController({
    async existing() {
        return (await getAllWebviews())
            .filter((view) => view.label.startsWith("tab_"))
            .map((view) => [view.label.slice(4), view]);
    },
    create(tab, rect) {
        return new Promise((resolve, reject) => {
            const view = new Webview(
                getCurrentWindow(),
                `tab_${tab.id}`,
                createTabWebviewOptions(tab, rect),
            );
            const listeners = [];
            let settled = false;
            const finish = (error) => {
                if (settled) return;
                settled = true;
                listeners.forEach((unlisten) => unlisten());
                if (error) reject(error);
                else resolve(view);
            };
            const register = (event, callback) => {
                view.once(event, callback).then((unlisten) => {
                    if (settled) unlisten();
                    else listeners.push(unlisten);
                }, finish);
            };
            register("tauri://created", () => finish());
            register("tauri://error", (event) => finish(new Error(String(event.payload))));
        });
    },
    navigate(id, url) { return invoke("navigate_tab", { tabId: id, url }); },
    reload(id) { return invoke("reload_tab", { tabId: id }); },
    setOpacity(opacity) { return invoke("set_webview_opacity", { opacity }); },
});
