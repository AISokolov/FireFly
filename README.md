# FireFly (working title)

A Windows desktop browser-overlay prototype for exploring how semi-transparent browser content can support or interfere with work on a single laptop display. The project is being developed in connection with a bachelor’s thesis; the final application name and research design are still to be decided.

> **Working thesis topic**
>
> **When Does Interface Transparency Help? Task Performance and Visual Interference in Single-Screen Laptop Multitasking**
>
> **Central question:** Under which task conditions does a semi-transparent browser overlay support or hinder performance and usability during computer-based work on a single laptop display?

## Project overview

FireFly combines an application sidebar and controls with embedded browser tabs in one desktop window. The current prototype supports tab and folder organization, session persistence, recently closed tabs, browser-content opacity, and an always-on-top control. On Windows, the browser pages are native WebView2 child views hosted by Tauri. Opacity is applied to the browser document view, while the app controls remain opaque.

The prototype provides a basis for investigating transparency and single-screen multitasking. It does not yet implement a research protocol, collect study data, or establish that transparency improves performance. Those outcomes depend on the tasks, conditions, measures, and study design selected for the thesis.

## Technologies

| Area | Technologies and tools | Role in the project |
| --- | --- | --- |
| Desktop application | Tauri 2, Rust stable, Cargo | Desktop shell, native commands, window behavior, packaging, and native webview management |
| Frontend | React 19, JavaScript (ES modules), JSX, HTML, CSS | Application interface, sidebar, tabs, dialogs, settings, and user interactions |
| Frontend build and development | Vite 7, @vitejs/plugin-react, Tauri CLI | Local development server, frontend bundling, and Tauri development/build commands |
| Embedded browser | WebView2 on Windows, Tauri/Wry | Hosts web pages in native child webviews |
| Windows integration | webview2-com, windows, windows-core Rust crates | WebView2 controller access and Windows window APIs, including browser-content opacity |
| Data and serialization | serde, serde_json, JSON session file | Validate, serialize, and persist tabs, layout, recently closed tabs, and preferences |
| Tauri plugins | tauri-plugin-dialog, tauri-plugin-opener | Native dialogs and opening supported links |
| Testing | Node.js built-in test runner (node:test), Rust test tooling | Frontend/session/controller regression tests and Rust tests |

Dependency versions and scripts are defined in package.json and src-tauri/Cargo.toml. The frontend is JavaScript/JSX; TypeScript is not configured.

## Current features

- Browser tabs with add, edit, duplicate, reload, and close actions.
- Folders for organizing tabs, with rename, color, and delete controls.
- Drag-and-drop layout customization for tabs and folders.
- Session persistence, including tab URLs, active tab, layout, preferences, and up to 50 recently closed tabs.
- Restore recently closed tabs individually or restore all.
- Adjustable browser-page opacity; the FireFly interface remains opaque.
- Persistent always-on-top preference.
- Windows tray behavior: closing the window hides the app, while the tray menu can restore or quit it.
- Cache clearing targeted at disk and cache storage, preserving cookies and login state.

## Thesis context

The research focus is whether and when transparency changes the balance between seeing underlying material and keeping the overlaid browser content legible. The application currently supplies an adjustable opacity control and a single-screen overlay arrangement that may support prototype-based evaluation.

Possible study conditions and measures should be specified as part of the thesis methodology. For example, a study could compare opaque and semi-transparent presentation across task types and measure task completion, errors, completion time, perceived workload, and usability. These are suggestions for future study design, not existing app capabilities or finalized thesis commitments.

## Requirements

- Windows 10/11 with Microsoft Edge WebView2 Runtime.
- Node.js and npm.
- Rust stable toolchain and Cargo.
- Tauri 2 development prerequisites for Windows, including the Microsoft C++ Build Tools and WebView2 Runtime.

The current browser-opacity implementation uses Windows WebView2 APIs. Opacity is not currently implemented on other operating systems.

## Data and privacy

The app stores its session in tab-session.json in the Tauri application data directory (on Windows, %APPDATA%\com.alex.firefly). Session data includes browser URLs, titles, icon references, IDs, layout, and preferences. Embedded URL credentials are removed before saving. The session file does not store cookies, page contents, form data, or browsing history. WebView2 maintains website cookies and login state separately.

## Current limitations

- Browser-page opacity is currently implemented only for Windows WebView2.
- Recently closed tabs restore their configuration and URL, not unsaved page state or back/forward history.
- Background tabs are lazy-loaded; a tab that has not created a webview cannot be reloaded yet.
- Rounded clipping of the native browser views is not currently supported reliably.
- The application name is provisional, and study conditions, tasks, and measures have not been finalized.

## Repository layout

- src/ — React interface and tab/session state logic.
- src/components/WebViewHost/ — native webview lifecycle and frontend integration.
- src-tauri/src/ — Rust commands, session persistence, Windows behavior, and tray integration.
- tests/ — JavaScript regression tests.

## License

No license has been specified yet.
