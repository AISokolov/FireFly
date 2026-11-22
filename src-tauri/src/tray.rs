use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Webview,
};

#[derive(Default)]
pub struct QuitState(AtomicBool);

fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn finish_quit(app: &AppHandle) {
    // Capture the latest native URLs even if the UI is unresponsive or throttled while hidden.
    if let Err(error) = crate::session::persist_live_urls(app) {
        eprintln!("Could not save final tab URLs: {error}");
    }
    app.exit(0);
}

#[tauri::command]
pub fn quit_application(app: AppHandle, webview: Webview) -> Result<(), String> {
    if webview.label() != "main" {
        return Err("Only the main UI may quit FireFly".into());
    }
    if !app.state::<QuitState>().0.load(Ordering::SeqCst) {
        return Err("Quit must be requested from the tray menu".into());
    }
    finish_quit(&app);
    Ok(())
}

pub fn setup(app: &mut tauri::App) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show-firefly", "Show FireFly", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit-firefly", "Quit FireFly", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
    let mut tray = TrayIconBuilder::with_id("firefly-tray")
        .tooltip("FireFly")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show-firefly" => show(app),
            "quit-firefly" => {
                if app.state::<QuitState>().0.swap(true, Ordering::SeqCst) {
                    return;
                }
                let _ = app.emit_to("main", "quit-requested", ());
                let app = app.clone();
                // Intentional Quit must work even before React loads or if a page hangs.
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    finish_quit(&app);
                });
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                }
            ) {
                show(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    // One native icon for the app lifetime; showing the window never creates another.
    tray.build(app)?;
    Ok(())
}
