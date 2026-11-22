import test from "node:test";
import assert from "node:assert/strict";
import { restoreSession, updateSession } from "../src/tabs/session.js";
import { FOLDER_COLORS } from "../src/tabs/layout.js";

const initial = () => restoreSession({ version: 2, tabs: ["a", "b", "c", "d"].map((id) => ({ id, title: id, icon: "", url: `https://${id}.example/` })), activeTabId: "b" });
const folder = (state, id) => updateSession(state, { type: "createFolder", id, name: `Folder ${id}`, color: FOLDER_COLORS[2] });
const move = (state, id, folderId = null, beforeId = null) => updateSession(state, { type: "moveItem", id, folderId, beforeId });
const roundTrip = (state) => restoreSession(JSON.parse(JSON.stringify(state)));

test("v1 and v2 sessions migrate to an ordered root without changing tabs or active selection", () => {
    for (const version of [1, 2]) {
        const state = restoreSession({ ...initial(), version, layout: undefined });
        assert.deepEqual(state.layout, { rootIds: ["a", "b", "c", "d"], folders: [] });
        assert.equal(state.activeTabId, "b");
        assert.equal(state.version, 3);
    }
});

test("root and folder moves persist and never mutate live tab metadata or selection", () => {
    const original = initial();
    let state = folder(folder(original, "work"), "home");
    state = move(state, "work", null, "a");
    state = move(state, "d", null, "b");
    state = move(state, "b", "work");
    state = move(state, "c", "work", "b");
    assert.deepEqual(state.layout.rootIds, ["work", "a", "d", "home"]);
    assert.deepEqual(state.layout.folders[0].tabIds, ["c", "b"]);
    state = move(state, "b", "home");
    state = move(state, "c", null, "a");
    assert.deepEqual(state.layout.rootIds, ["work", "c", "a", "d", "home"]);
    assert.deepEqual(state.layout.folders[1].tabIds, ["b"]);
    assert.equal(state.tabs, original.tabs);
    assert.equal(state.activeTabId, original.activeTabId);
    assert.deepEqual(roundTrip(state), state);
    assert.deepEqual(move(state, "work", "home"), state, "folders cannot be nested");
    assert.deepEqual(move(state, "missing", "home"), state);
});

test("folder edits validate names/colors and deleting a folder expands its contents in place", () => {
    let state = move(folder(initial(), "work"), "work", null, "b");
    state = move(move(state, "b", "work"), "d", "work", "b");
    state = updateSession(state, { type: "editFolder", id: "work", name: "  Research  ", color: FOLDER_COLORS[4] });
    assert.equal(state.layout.folders[0].name, "Research");
    state = updateSession(state, { type: "editFolder", id: "work", name: " ", color: "red" });
    assert.equal(state.layout.folders[0].name, "Research");
    assert.equal(state.layout.folders[0].color, FOLDER_COLORS[4]);
    const tabs = state.tabs;
    state = updateSession(state, { type: "deleteFolder", id: "work" });
    assert.deepEqual(state.layout.rootIds, ["a", "d", "b", "c"]);
    assert.equal(state.tabs, tabs);
    assert.equal(state.activeTabId, "b");
    assert.deepEqual(state.layout.folders, []);
});

test("trash restores to the original folder and position across restart, or root if deleted", () => {
    let state = folder(initial(), "work");
    for (const id of ["d", "b", "a"]) state = move(state, id, "work");
    state = roundTrip(updateSession(state, { type: "close", id: "b" }));
    assert.equal(state.recentlyClosed[0].folderId, "work");
    state = updateSession(state, { type: "restore", id: "b" });
    assert.deepEqual(state.layout.folders[0].tabIds, ["d", "b", "a"]);
    state = updateSession(state, { type: "close", id: "b" });
    state = updateSession(state, { type: "deleteFolder", id: "work" });
    state = updateSession(roundTrip(state), { type: "restore", id: "b" });
    assert.equal(state.layout.rootIds.includes("b"), true);
    assert.equal(state.tabs.filter((tab) => tab.id === "b").length, 1);
    assert.equal(state.activeTabId, "b");
});

test("restore all reverses closures to recover folder ordering, and duplicate stays beside source", () => {
    let state = folder(initial(), "work");
    for (const id of ["a", "b", "c"]) state = move(state, id, "work");
    for (const id of ["b", "a", "c"]) state = updateSession(state, { type: "close", id });
    state = updateSession(roundTrip(state), { type: "restoreAll" });
    assert.deepEqual(state.layout.folders[0].tabIds, ["a", "b", "c"]);
    state = updateSession(state, { type: "add", tab: { ...state.tabs.find((tab) => tab.id === "b"), id: "copy" }, afterId: "b" });
    assert.deepEqual(state.layout.folders[0].tabIds, ["a", "b", "copy", "c"]);
    assert.deepEqual(roundTrip(state), state);
});

test("malformed layouts repair duplicate references, missing tabs and invalid colors", () => {
    const state = restoreSession({ ...initial(), layout: {
        rootIds: ["a", "work", "work", "gone", "b"],
        folders: [{ id: "work", name: " ", color: "red", tabIds: ["a", "a", "gone"] }, { id: "work" }, { id: "b" }, null],
    } });
    assert.deepEqual(state.layout.rootIds, ["work", "b", "c", "d"]);
    assert.deepEqual(state.layout.folders, [{ id: "work", name: "Folder", color: FOLDER_COLORS[0], tabIds: ["a"] }]);
    assert.deepEqual(roundTrip(state), state);
});
