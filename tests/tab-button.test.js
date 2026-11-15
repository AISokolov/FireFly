import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { closeTabFromButton } from "../src/components/TabButton/tabButtonActions.js";

// Compile the actual JSX component with the already-installed Vite compiler.
const source = readFileSync(new URL("../src/components/TabButton/TabButton.jsx", import.meta.url), "utf8")
    .replace('import { useEffect, useRef } from "react";', "const { useEffect, useRef } = React;")
    .replace('import "./TabButton.css";', "")
    .replace('import { closeTabFromButton } from "./tabButtonActions";', "");
const compiled = transformSync(source, { loader: "jsx", format: "cjs" }).code;
const module = { exports: {} };
new Function("module", "exports", "React", "closeTabFromButton", compiled)(module, module.exports, React, closeTabFromButton);
const TabButton = module.exports.default;

test("close is a sibling button, stops bubbling and never selects the tab", () => {
    const events = [];
    closeTabFromButton({ stopPropagation: () => events.push("stopped") }, "b", (id) => events.push(id));
    assert.deepEqual(events, ["stopped", "b"]);
});

test("active state is visible in markup and exposed to assistive technology", () => {
    const markup = renderToStaticMarkup(React.createElement(TabButton, { tab: { id: "a", title: "First" }, isActive: true }));
    assert.match(markup, /tab-select selected/);
    assert.match(markup, /aria-pressed="true"/);
    assert.match(markup, /aria-label="Close tab: First"/);
});
