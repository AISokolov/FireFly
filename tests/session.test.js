import test from "node:test";
import assert from "node:assert/strict";
import { createSessionStorage, emptySession, normalizeUrl, restoreSession, updateSession } from "../src/tabs/session.js";

const tab = (id) => ({ id, title: id, url: `https://${id}.example/`, icon: "" });
const session = { ...emptySession(), tabs: [tab("a"), tab("b"), tab("c")], activeTabId: "b" };

test("restoration preserves order, IDs and active selection through a JSON round trip", () => {
    assert.deepEqual(restoreSession(JSON.parse(JSON.stringify(session))), session);
});

test("missing, malformed, unsupported and empty sessions restore the default empty state", () => {
    for (const value of [null, undefined, [], {}, { version: 2, tabs: [] }, { version: 1, tabs: null }, emptySession()]) {
        assert.deepEqual(restoreSession(value), emptySession());
    }
});

test("invalid URLs and duplicate IDs are discarded; duplicate URLs with different IDs are valid", () => {
    const restored = restoreSession({ version: 1, tabs: [null, tab("a"), tab("a"), { ...tab("b"), url: "javascript:alert(1)" }, { ...tab("c"), url: tab("a").url }], activeTabId: "b" });
    assert.deepEqual(restored.tabs.map(({ id }) => id), ["a", "c"]);
    assert.equal(restored.activeTabId, "a");
});

test("URL validation normalizes addresses and strips embedded credentials", () => {
    assert.equal(normalizeUrl(" example.com "), "https://example.com/");
    assert.equal(normalizeUrl("https://name:secret@example.com/path?q=1#anchor"), "https://example.com/path?q=1#anchor");
    for (const value of ["", "not a url", "file:///private", "data:text/html,test", "javascript:alert(1)", null]) assert.equal(normalizeUrl(value), null);
});

test("closing an inactive tab never activates it; active close selects right then left", () => {
    assert.equal(updateSession(session, { type: "close", id: "a" }).activeTabId, "b");
    const next = updateSession(session, { type: "close", id: "b" });
    assert.equal(next.activeTabId, "c");
    assert.equal(updateSession(next, { type: "close", id: "c" }).activeTabId, "a");
    const last = updateSession({ ...session, tabs: [tab("b")] }, { type: "close", id: "b", closedAt: "2026-01-01T00:00:00.000Z" });
    assert.equal(last.tabs.length, 0);
    assert.equal(last.activeTabId, null);
    assert.deepEqual(last.recentlyClosed.map(({ id }) => id), ["b"]);
});

test("closed tabs restore at their original position and trash can be managed", () => {
    let state = updateSession(session, { type: "close", id: "b", closedAt: "2026-01-01T00:00:00.000Z" });
    assert.equal(state.recentlyClosed[0].originalIndex, 1);
    state = updateSession(state, { type: "restore", id: "b" });
    assert.deepEqual(state.tabs.map(({ id }) => id), ["a", "b", "c"]);
    assert.equal(state.activeTabId, "b");
    state = updateSession(state, { type: "close", id: "a" });
    state = updateSession(state, { type: "deleteClosed", id: "a" });
    assert.equal(state.recentlyClosed.length, 0);
});

test("session v1 migrates and invalid preferences are repaired", () => {
    const migrated = restoreSession({ version: 1, tabs: [tab("a")], activeTabId: "a" });
    assert.equal(migrated.version, 2);
    assert.deepEqual(migrated.preferences, { webviewOpacity: 100, alwaysOnTop: false });
    const repaired = restoreSession({ ...migrated, preferences: { webviewOpacity: 999, alwaysOnTop: true } });
    assert.deepEqual(repaired.preferences, { webviewOpacity: 100, alwaysOnTop: true });
});

test("add, selection and native navigation keep a valid session and ignore closed tabs", () => {
    let state = updateSession(session, { type: "add", tab: tab("d") });
    assert.equal(state.activeTabId, "d");
    state = updateSession(state, { type: "select", id: "a" });
    assert.equal(state.activeTabId, "a");
    state = updateSession(state, { type: "navigate", urls: { a: "https://a.example/new#route", gone: "https://closed.example/" } });
    assert.equal(state.tabs[0].url, "https://a.example/new#route");
    assert.equal(state.tabs.length, 4);
    assert.equal(updateSession(state, { type: "select", id: "missing" }), state);
    assert.equal(updateSession(state, { type: "add", tab: tab("a") }), state);
});

test("restoration is shared, never triggers a save, and writes cannot finish out of order", async () => {
    const calls = [];
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const storage = createSessionStorage(async (command, args) => {
        calls.push([command, args]);
        if (command === "load_tab_session") return session;
        if (args.session.activeTabId === "b") await gate;
    });
    await Promise.all([storage.load(), storage.load()]);
    assert.equal(calls.length, 1);
    const first = storage.save(session);
    const last = storage.save({ ...session, activeTabId: "c" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(calls.length, 2);
    release();
    await Promise.all([first, last]);
    assert.equal(calls[2][1].session.activeTabId, "c");
});

test("a failed save is reported without poisoning later writes", async () => {
    let calls = 0;
    const storage = createSessionStorage(async () => { if (++calls === 1) throw new Error("disk unavailable"); });
    await assert.rejects(storage.save(session));
    await storage.save(emptySession());
    assert.equal(calls, 2);
});
