import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createSessionStorage, emptySession, normalizeUrl, updateSession } from "./session";

const storage = createSessionStorage(invoke);

export default function useTabSession() {
    const [session, setSession] = useState(emptySession);
    const current = useRef(session);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");
    const readQueue = useRef(Promise.resolve());

    const reportError = useCallback((cause) => {
        console.error("Tab session error:", cause);
        setError("Could not save or restore tabs. Check available disk space and app data permissions.");
    }, []);

    const update = useCallback((action) => {
        const next = updateSession(current.current, action);
        if (next === current.current) return;
        current.current = next;
        setSession(next);
        storage.save(next).then(() => setError(""), reportError);
    }, [reportError]);

    const refreshUrls = useCallback(() => {
        readQueue.current = readQueue.current.catch(() => {}).then(async () => {
            const urls = await invoke("get_tab_urls");
            update({ type: "navigate", urls });
        });
        return readQueue.current;
    }, [update]);

    useEffect(() => {
        let cancelled = false;
        storage.load().then((saved) => {
            if (cancelled) return;
            current.current = saved;
            setSession(saved);
            setReady(true);
        }, (cause) => {
            if (cancelled) return;
            reportError(cause);
            setReady(true);
        });
        return () => { cancelled = true; };
    }, [reportError]);

    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        let unlisten;
        let timer;
        const refresh = () => refreshUrls().catch(reportError);
        // Polling also covers pushState/replaceState and hash changes that do not load a page.
        const poll = async () => {
            await refresh();
            if (!cancelled) timer = setTimeout(poll, 1000);
        };
        listen("tab-navigation", refresh).then((stop) => {
            if (cancelled) stop();
            else unlisten = stop;
        }, reportError);
        poll();
        return () => {
            cancelled = true;
            clearTimeout(timer);
            unlisten?.();
        };
    }, [ready, refreshUrls, reportError]);

    const flush = useCallback(async () => {
        await refreshUrls();
        await storage.save(current.current);
    }, [refreshUrls]);

    const addTab = (data, folderId = null) => {
        const url = normalizeUrl(data.url);
        if (!url) return false;
        update({ type: "add", tab: { ...data, url, id: crypto.randomUUID() }, folderId });
        return true;
    };

    const editTab = (id, data) => {
        const url = normalizeUrl(data.url);
        if (!url) return false;
        update({ type: "edit", tab: { id, ...data, url } });
        return true;
    };

    const duplicateTab = (id) => {
        const source = current.current.tabs.find((tab) => tab.id === id);
        if (!source) return;
        const index = current.current.tabs.findIndex((tab) => tab.id === id) + 1;
        update({ type: "add", tab: { ...source, id: crypto.randomUUID(), title: `${source.title} copy` }, index, afterId: id });
    };

    return { session, ready, error, reportError, addTab, editTab, duplicateTab, update, flush };
}
