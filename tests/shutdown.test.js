import test from "node:test";
import assert from "node:assert/strict";
import { finishBeforeClose } from "../src/shutdown.js";

test("close destroys the app even when a webview operation never settles", async () => {
    let destroyed = false;
    await finishBeforeClose({
        ready: true,
        flushWebviews: () => new Promise(() => {}),
        flushSession: async () => {},
        destroy: async () => { destroyed = true; },
        timeoutMs: 5,
    });
    assert.equal(destroyed, true);
});

test("close works before session restoration is ready", async () => {
    let destroyed = false;
    await finishBeforeClose({
        ready: false,
        flushWebviews: () => { throw new Error("must not run"); },
        flushSession: () => { throw new Error("must not run"); },
        destroy: async () => { destroyed = true; },
    });
    assert.equal(destroyed, true);
});
