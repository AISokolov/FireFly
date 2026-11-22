mod native;
mod session;
mod tray;
use tauri::{webview::PageLoadEvent, Emitter};
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(session::SessionStorage::default())
        .manage(native::OpacityState::default())
        .manage(tray::QuitState::default())
        .setup(|app| {
            tray::setup(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    if let Err(error) = window.hide() {
                        eprintln!("Could not hide FireFly: {error}");
                    }
                    let _ = window.emit("window-hidden", ());
                }
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .on_page_load(|webview, payload| {
            if webview.label().starts_with("tab_") {
                if payload.event() == PageLoadEvent::Finished {
                    native::apply_saved_opacity(webview);
                }
                let _ = webview.emit_to("main", "tab-navigation", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            session::load_tab_session,
            session::save_tab_session,
            session::get_tab_urls,
            native::navigate_tab,
            native::reload_tab,
            native::set_webview_opacity,
            native::clear_browser_cache,
            native::system_info,
            tray::quit_application,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
