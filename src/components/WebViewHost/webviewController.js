// All native mutations share one queue. New requests invalidate work awaiting creation.
export function createWebviewController(adapter) {
    const webviews = new Map();
    let pending = Promise.resolve();
    let revision = 0;
    let initialized = false;
    let focusedId = null;
    const urls = new Map();
    return {
        sync({ tabs, activeTabId, hidden, rect }) {
            const request = ++revision;
            const stale = () => request !== revision;
            const selected = hidden ? null : tabs.find((tab) => tab.id === activeTabId);
            pending = pending.catch(() => {}).then(async () => {
                if (stale()) return;
                if (!initialized) {
                    for (const [id, view] of await adapter.existing()) webviews.set(id, view);
                    initialized = true;
                }
                for (const [id, view] of webviews) {
                    if (stale()) return;
                    if (!tabs.some((tab) => tab.id === id)) {
                        await view.hide();
                        await view.close();
                        webviews.delete(id);
                        urls.delete(id);
                    } else if (id !== selected?.id) {
                        await view.hide();
                    }
                }
                if (stale()) return;
                if (!selected || !rect) {
                    focusedId = null;
                    return;
                }
                let view = webviews.get(selected.id);
                if (!view) {
                    view = await adapter.create(selected, rect);
                    webviews.set(selected.id, view);
                    // New views stay offscreen until ready and still wanted.
                    await view.hide();
                    urls.set(selected.id, selected.url);
                } else if (urls.get(selected.id) !== selected.url) {
                    await adapter.navigate(selected.id, selected.url);
                    urls.set(selected.id, selected.url);
                }
                if (stale()) return;
                await view.setPosition({ type: "Logical", x: Math.round(rect.x), y: Math.round(rect.y) });
                await view.setSize({
                    type: "Logical",
                    width: Math.max(1, Math.round(rect.width)),
                    height: Math.max(1, Math.round(rect.height)),
                });
                if (stale()) return;
                await view.show();
                if (stale()) {
                    await view.hide();
                    return;
                }
                if (focusedId !== selected.id) await view.setFocus();
                focusedId = selected.id;
            });
            return pending;
        },
        reload(id) {
            pending = pending.catch(() => {}).then(() => webviews.has(id) ? adapter.reload(id) : undefined);
            return pending;
        },
        setOpacity(opacity) {
            pending = pending.catch(() => {}).then(() => adapter.setOpacity(opacity));
            return pending;
        },
        flush() { return pending; },
    };
}
