# FireFly

FireFly is a React + Tauri v2 desktop browser overlay for Windows.

## Development and checks

```powershell
npm install
npm run tauri dev
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build --debug --no-bundle -- --offline
```

The frontend uses JavaScript/JSX, so there is no separate TypeScript check. The installed native stack is Tauri 2.10.3, Wry 0.54.4, and `webview2-com` 0.38.2.

## Tabs and persistence

The sidebar keeps Add Tab fixed at the top and Recently Closed fixed at the bottom. Only the tab list scrolls. Selecting a tab scrolls it into view, and right-clicking opens Edit, Reload, Duplicate, and Close actions. Create and Edit share the same validated form.

Session format v2 stores ordered tabs, the active ID, up to 50 recently closed tabs, and always-on-top preferences. It migrates the previous v1 format. Closing a tab records its configuration, close time, and original index; restoring recreates its webview lazily and inserts it at that index when possible. Normal application shutdown does not close tabs individually and therefore does not add them to Trash.

Session data is written to `tab-session.json` under Tauri's app-data directory (`%APPDATA%\com.alex.firefly` on Windows). It contains URLs, titles, icon references, IDs, and preferences. It does not copy cookies, credentials, page contents, form data, or navigation history. Embedded URL credentials are removed. A one-second URL poll supplements native page-load events for SPA and hash navigation.

## Windows-native browser behavior

Tauri's child webviews are native WebView2 HWNDs, so React styles on the FireFly UI cannot clip or fade them. On Windows, FireFly applies alpha only to WebView2's inner document HWND. The Wry container and FireFly's own UI remain normal, so the title bar and sidebar stay visible while the browser content fades.

The title-bar control provides live 0–100% browser opacity and persistent always-on-top behavior. Opacity is stored in session preferences and reapplied by the Rust page-load hook after navigation or reload. FireFly's title bar, sidebar, menus, and settings remain fully opaque because only each remote page document is faded.

Cache clearing uses WebView2's `ClearBrowsingData` with only `DISK_CACHE | CACHE_STORAGE`. The broader Wry/Tauri convenience API was deliberately not used because it clears all browsing data, including cookies. Saved tabs, preferences, Trash, cookies, login state, browsing history, autofill, and passwords are not targeted. Settings reads application name/version and Tauri version dynamically and reports Rust's current OS/architecture. Set `VITE_REPOSITORY_URL` at build time to show the repository button.

## Manual verification

1. Run `npm run tauri dev`, create 20 or more tabs, resize the window, and verify that only the middle tab list scrolls while Add and Trash remain visible.
2. Right-click active and inactive tabs. Edit names/icons/URLs, reload a loaded tab, duplicate tabs, and close without unintended activation.
3. Close first, middle, active, and last tabs. Verify Trash metadata, individual restore/delete, Restore All ordering, Empty Trash confirmation, the 50-item limit, and persistence after restart.
4. Open Settings and verify dynamic metadata. Clear cache after its confirmation, then confirm that sessions and website login cookies remain while cached resources reload.
5. Click ⟳ and confirm browser content changes to 60% while FireFly controls stay opaque and the window remains above ordinary windows. Click it again and confirm opacity returns to 100% and always-on-top turns off. Exercise 0%, 60%, and 100%, reload, navigate, resize, and restart.
6. Confirm normal browser scrolling, clicking, text selection, page input, and resizing. Hold Ctrl while scrolling over the webpage and verify that WebView2 zooms the page in and out without scaling FireFly's own controls.
7. Test URL redirects, SPA/hash navigation, malformed URLs, rapid create/select/close operations, Alt+F4 persistence, title-bar dragging, minimize/maximize, and failed page loads.

## Main implementation files

- `src/tabs/{session.js,useTabSession.js}`: session v2 validation, migration, tab/Trash transitions, ordered persistence, and URL tracking.
- `src/App.jsx`: coordinated overlay, tab, Trash, transparency, always-on-top, and shutdown state.
- `src/components/Sidebar`, `TabButton`, `TabContextMenu`, `AddTabModal`, `TrashModal`: scrollable tab management and shared create/edit UI.
- `src/components/SettingsModal`, `TransparencyControl`, `TitleBar`: cache confirmation, application information, and persistent native controls.
- `src/components/WebViewHost/{WebViewHost.jsx,webviewManager.js,webviewController.js}`: serialized native lifecycle, navigation/reload, reuse, and race prevention.
- `src-tauri/src/{native.rs,session.rs,lib.rs}`: WebView2 cache operations, native navigation/reload, metadata, session files, and command registration.
- `tests/*.test.js`: session migration/Trash, close-button behavior, and native-view controller regression coverage.

## Current limitations

- Recently closed entries restore tab configuration and URL only; unsaved page state and back/forward history are outside the session format.
- Background tabs remain lazy and do not have a native webview until selected. Reload on a never-loaded background tab is therefore a safe no-op.
- Browser opacity uses the Windows WebView2 document child window and is not currently available on other platforms.
- Reliable native rounded clipping remains unavailable with the current child WebView2 architecture; the unstable layered-child approach stays removed.
- Custom local icon display still depends on the existing Tauri asset-loading configuration.
