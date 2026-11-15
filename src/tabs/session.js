export const DEFAULT_PREFERENCES = Object.freeze({ webviewOpacity: 100, alwaysOnTop: false });
export const emptySession = () => ({ version: 2, tabs: [], activeTabId: null, recentlyClosed: [], preferences: { ...DEFAULT_PREFERENCES } });

export function normalizeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    const input = value.trim();
    try {
        const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
        if (!["http:", "https:"].includes(url.protocol)) return null;
        url.username = "";
        url.password = "";
        return url.href;
    } catch { return null; }
}

function normalizeTab(tab, ids) {
    if (!tab || typeof tab.id !== "string" || !/^[\w-]{1,128}$/.test(tab.id) || ids.has(tab.id)) return null;
    const url = normalizeUrl(tab.url);
    if (!url) return null;
    ids.add(tab.id);
    return { id: tab.id, url, title: typeof tab.title === "string" && tab.title.trim() ? tab.title.trim() : "New Tab", icon: typeof tab.icon === "string" ? tab.icon : "" };
}

export function restoreSession(value) {
    if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.tabs)) return emptySession();
    const ids = new Set();
    const tabs = value.tabs.map((tab) => normalizeTab(tab, ids)).filter(Boolean);
    const closedIds = new Set(ids);
    const recentlyClosed = (Array.isArray(value.recentlyClosed) ? value.recentlyClosed : []).map((entry) => {
        const restored = normalizeTab(entry, closedIds);
        if (!restored) return null;
        return { ...restored, closedAt: Number.isFinite(Date.parse(entry.closedAt)) ? entry.closedAt : new Date(0).toISOString(), originalIndex: Number.isInteger(entry.originalIndex) && entry.originalIndex >= 0 ? entry.originalIndex : tabs.length };
    }).filter(Boolean).slice(0, 50);
    const opacity = Number(value.preferences?.webviewOpacity);
    return {
        version: 2,
        tabs,
        activeTabId: ids.has(value.activeTabId) ? value.activeTabId : tabs[0]?.id ?? null,
        recentlyClosed,
        preferences: {
            webviewOpacity: Number.isFinite(opacity) ? Math.min(100, Math.max(0, Math.round(opacity))) : 100,
            alwaysOnTop: value.preferences?.alwaysOnTop === true,
        },
    };
}

function insertAt(items, item, index) {
    const next = [...items];
    next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
    return next;
}

export function updateSession(session, action) {
    switch (action.type) {
        case "add": {
            if (session.tabs.some((tab) => tab.id === action.tab.id)) return session;
            const index = Number.isInteger(action.index) ? action.index : session.tabs.length;
            return { ...session, tabs: insertAt(session.tabs, action.tab, index), activeTabId: action.activate === false ? session.activeTabId : action.tab.id };
        }
        case "select":
            return session.activeTabId !== action.id && session.tabs.some((tab) => tab.id === action.id) ? { ...session, activeTabId: action.id } : session;
        case "edit": {
            const index = session.tabs.findIndex((tab) => tab.id === action.tab.id);
            if (index < 0) return session;
            const tabs = [...session.tabs];
            tabs[index] = action.tab;
            return { ...session, tabs };
        }
        case "close": {
            const index = session.tabs.findIndex((tab) => tab.id === action.id);
            if (index === -1) return session;
            const closed = session.tabs[index];
            const tabs = session.tabs.filter((tab) => tab.id !== action.id);
            const currentTrash = session.recentlyClosed ?? [];
            const recentlyClosed = action.toTrash === false ? currentTrash : [{ ...closed, closedAt: action.closedAt ?? new Date().toISOString(), originalIndex: index }, ...currentTrash.filter((tab) => tab.id !== action.id)].slice(0, 50);
            return { ...session, tabs, recentlyClosed, activeTabId: session.activeTabId === action.id ? (tabs[index] ?? tabs[index - 1])?.id ?? null : session.activeTabId };
        }
        case "restore": {
            const closed = session.recentlyClosed.find((tab) => tab.id === action.id);
            if (!closed || session.tabs.some((tab) => tab.id === closed.id)) return session;
            const { closedAt, originalIndex, ...tab } = closed;
            return { ...session, tabs: insertAt(session.tabs, tab, originalIndex), recentlyClosed: session.recentlyClosed.filter((item) => item.id !== action.id), activeTabId: action.activate === false ? session.activeTabId : tab.id };
        }
        case "restoreAll": {
            if (!session.recentlyClosed.length) return session;
            let tabs = [...session.tabs];
            const restored = [...session.recentlyClosed].reverse();
            for (const entry of restored) {
                if (tabs.some((tab) => tab.id === entry.id)) continue;
                const { closedAt, originalIndex, ...tab } = entry;
                tabs = insertAt(tabs, tab, originalIndex);
            }
            return { ...session, tabs, recentlyClosed: [], activeTabId: restored.at(-1)?.id ?? session.activeTabId };
        }
        case "deleteClosed":
            return session.recentlyClosed.some((tab) => tab.id === action.id) ? { ...session, recentlyClosed: session.recentlyClosed.filter((tab) => tab.id !== action.id) } : session;
        case "emptyTrash":
            return session.recentlyClosed.length ? { ...session, recentlyClosed: [] } : session;
        case "preferences":
            return { ...session, preferences: { ...session.preferences, ...action.value } };
        case "navigate": {
            let changed = false;
            const tabs = session.tabs.map((tab) => {
                const url = normalizeUrl(action.urls[tab.id]);
                if (!url || url === tab.url) return tab;
                changed = true;
                return { ...tab, url };
            });
            return changed ? { ...session, tabs } : session;
        }
        default: return session;
    }
}

export function createSessionStorage(invoke) {
    let pending = Promise.resolve();
    let initial;
    return {
        load() { initial ??= invoke("load_tab_session").then(restoreSession); return initial; },
        save(session) { pending = pending.catch(() => {}).then(() => invoke("save_tab_session", { session })); return pending; },
    };
}
