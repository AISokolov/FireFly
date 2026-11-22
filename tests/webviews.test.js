import test from "node:test";
import assert from "node:assert/strict";
import { createWebviewController } from "../src/components/WebViewHost/webviewController.js";
import { createTabWebviewOptions } from "../src/components/WebViewHost/webviewManager.js";
import { restoreSession, updateSession } from "../src/tabs/session.js";

const tabs = [{ id: "a", url: "https://a.example/" }, { id: "b", url: "https://b.example/" }];
const rect = { x: 56, y: 32, width: 744, height: 568 };
const snapshot = (activeTabId, options = {}) => ({ tabs, activeTabId, hidden: false, rect, ...options });
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
    const calls = [];
    const views = new Map();
    let release;
    const adapter = {
        existing: async () => [],
        navigate: async (id, url) => { calls.push([id, "navigate", url]); },
        reload: async (id) => { calls.push([id, "reload"]); },
        setOpacity: async (opacity) => { calls.push(["opacity", opacity]); },
        async create(tab) {
            calls.push([tab.id, "create"]);
            if (release) await release.promise;
            const view = Object.fromEntries(["hide", "close", "show", "setFocus", "setPosition", "setSize"].map((method) => [method, async () => { calls.push([tab.id, method]); }]));
            views.set(tab.id, view);
            return view;
        },
    };
    return {
        manager: createWebviewController(adapter), calls, views, adapter,
        delay() {
            release = {};
            release.promise = new Promise((resolve) => { release.resolve = resolve; });
            return () => { release.resolve(); release = null; };
        },
    };
}

test("new tab webviews enable native Ctrl+wheel zoom controls", () => {
    const options = createTabWebviewOptions(tabs[0], { width: 744.4, height: 567.6 });
    assert.equal(options.zoomHotkeysEnabled, true);
    assert.equal(options.width, 744);
    assert.equal(options.height, 568);
});

test("opacity is exposed by the controller and forwarded to the native adapter", async () => {
    const { manager, calls } = fixture();
    await manager.setOpacity(50);
    assert.deepEqual(calls, [["opacity", 50]]);
});

test("repeated setup and resizing create only one native view and do not steal focus", async () => {
    const { manager, calls } = fixture();
    await Promise.all([manager.sync(snapshot("a")), manager.sync(snapshot("a"))]);
    await manager.sync(snapshot("a"));
    assert.equal(calls.filter(([, operation]) => operation === "create").length, 1);
    assert.equal(calls.filter(([, operation]) => operation === "setFocus").length, 1);
});

test("closing a tab while it is being created destroys it without showing it", async () => {
    const { manager, calls, delay } = fixture();
    const release = delay();
    const first = manager.sync(snapshot("a"));
    await tick();
    const last = manager.sync(snapshot("b", { tabs: [tabs[1]] }));
    release();
    await Promise.all([first, last]);
    assert.ok(calls.some(([id, op]) => id === "a" && op === "close"));
    assert.ok(!calls.some(([id, op]) => id === "a" && op === "show"));
    assert.ok(calls.some(([id, op]) => id === "b" && op === "show"));
});

test("opening the modal during creation leaves every native view hidden", async () => {
    const { manager, calls, delay } = fixture();
    const release = delay();
    const first = manager.sync(snapshot("a"));
    await tick();
    const last = manager.sync(snapshot("a", { hidden: true }));
    release();
    await Promise.all([first, last]);
    assert.ok(!calls.some(([, op]) => op === "show"));
});

test("existing native views are reused; failed closes retain their handle for retry", async () => {
    const { manager, calls, adapter } = fixture();
    let attempts = 0;
    adapter.existing = async () => [["a", {
        hide: async () => {},
        close: async () => { if (++attempts === 1) throw new Error("close failed"); },
    }]];
    await assert.rejects(manager.sync(snapshot(null, { tabs: [] })));
    await manager.sync(snapshot(null, { tabs: [] }));
    assert.equal(attempts, 2);
    assert.equal(calls.length, 0);
});

test("switching then closing the last tab leaves no visible native view", async () => {
    const { manager, calls } = fixture();
    await manager.sync(snapshot("a"));
    await manager.sync(snapshot("b"));
    await manager.sync(snapshot(null, { tabs: [] }));
    assert.deepEqual(calls.filter(([, op]) => op === "close").map(([id]) => id), ["a", "b"]);
});

test("editing a loaded tab navigates the existing webview and reload does not recreate it", async () => {
    const { manager, calls } = fixture();
    await manager.sync(snapshot("a"));
    await manager.sync(snapshot("a", { tabs: [{ ...tabs[0], url: "https://a.example/edited" }, tabs[1]] }));
    await manager.reload("a");
    assert.equal(calls.filter(([, operation]) => operation === "create").length, 1);
    assert.ok(calls.some(([id, operation, url]) => id === "a" && operation === "navigate" && url.endsWith("/edited")));
    assert.ok(calls.some(([id, operation]) => id === "a" && operation === "reload"));
});

test("customizing and moving the active tab through folders keeps its native page alive", async () => {
    const { manager, calls } = fixture();
    let state = restoreSession({ version: 2, tabs, activeTabId: "a" });
    await manager.sync({ ...state, rect, hidden: false });
    await manager.sync({ ...state, rect, hidden: true });
    state = updateSession(state, { type: "createFolder", id: "work", name: "Work" });
    state = updateSession(state, { type: "moveItem", id: "a", folderId: "work" });
    await manager.sync({ ...state, rect, hidden: true });
    state = updateSession(state, { type: "deleteFolder", id: "work" });
    await manager.sync({ ...state, rect, hidden: false });
    assert.equal(state.activeTabId, "a");
    assert.equal(calls.filter(([, operation]) => operation === "create").length, 1);
    assert.equal(calls.some(([, operation]) => ["close", "navigate", "reload"].includes(operation)), false);
});
