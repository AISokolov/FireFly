use std::{
    sync::{
        atomic::{AtomicU8, Ordering},
        mpsc,
    },
    time::Duration,
};
use tauri::{AppHandle, Manager, State, Webview};

pub struct OpacityState(AtomicU8);

impl Default for OpacityState {
    fn default() -> Self {
        Self(AtomicU8::new(100))
    }
}

fn opacity_alpha(opacity: u8) -> u8 {
    ((u16::from(opacity.min(100)) * 255) / 100) as u8
}

#[cfg(windows)]
fn apply_opacity(webview: &Webview, opacity: u8) -> Result<(), String> {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Controller;
    use windows::Win32::{
        Foundation::{COLORREF, HWND},
        UI::WindowsAndMessaging::{
            GetWindow, GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW,
            GWL_EXSTYLE, GW_CHILD, LWA_ALPHA, WS_EX_LAYERED,
        },
    };

    webview
        .with_webview(move |platform| {
            let result = (|| -> Result<(), String> {
                let controller: ICoreWebView2Controller = platform.controller();
                let mut container = HWND::default();
                unsafe { controller.ParentWindow(&mut container) }
                    .map_err(|error| error.to_string())?;
                let document =
                    unsafe { GetWindow(container, GW_CHILD) }.map_err(|error| error.to_string())?;
                let style = unsafe { GetWindowLongPtrW(document, GWL_EXSTYLE) };

                if opacity >= 100 {
                    unsafe { SetLayeredWindowAttributes(document, COLORREF(0), 255, LWA_ALPHA) }
                        .map_err(|error| error.to_string())?;
                    unsafe {
                        SetWindowLongPtrW(
                            document,
                            GWL_EXSTYLE,
                            style & !(WS_EX_LAYERED.0 as isize),
                        )
                    };
                } else {
                    unsafe {
                        SetWindowLongPtrW(document, GWL_EXSTYLE, style | WS_EX_LAYERED.0 as isize)
                    };
                    unsafe {
                        SetLayeredWindowAttributes(
                            document,
                            COLORREF(0),
                            opacity_alpha(opacity),
                            LWA_ALPHA,
                        )
                    }
                    .map_err(|error| error.to_string())?;
                }
                Ok(())
            })();
            if let Err(error) = result {
                eprintln!("Could not update WebView2 opacity: {error}");
            }
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn apply_opacity(_webview: &Webview, _opacity: u8) -> Result<(), String> {
    Err("Native browser opacity is currently implemented for WebView2 on Windows".into())
}

pub fn apply_saved_opacity(webview: &Webview) {
    let opacity = webview.state::<OpacityState>().0.load(Ordering::Relaxed);
    let _ = apply_opacity(webview, opacity);
}

#[tauri::command]
pub fn set_webview_opacity(
    app: AppHandle,
    webview: Webview,
    state: State<'_, OpacityState>,
    opacity: u8,
) -> Result<(), String> {
    main_only(&webview)?;
    let opacity = opacity.min(100);
    state.0.store(opacity, Ordering::Relaxed);
    let errors: Vec<_> = app
        .webviews()
        .into_iter()
        .filter(|(label, _)| label.starts_with("tab_"))
        .filter_map(|(_, target)| apply_opacity(&target, opacity).err())
        .collect();
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("; "))
    }
}

fn main_only(webview: &Webview) -> Result<(), String> {
    (webview.label() == "main")
        .then_some(())
        .ok_or_else(|| "This command is only available to the main UI".into())
}

fn tab(app: &AppHandle, id: &str) -> Result<Webview, String> {
    app.get_webview(&format!("tab_{id}"))
        .ok_or_else(|| format!("Tab {id} is not currently loaded"))
}

#[tauri::command]
pub fn navigate_tab(
    app: AppHandle,
    webview: Webview,
    tab_id: String,
    url: String,
) -> Result<(), String> {
    main_only(&webview)?;
    let parsed = url
        .parse()
        .map_err(|error| format!("Invalid URL: {error}"))?;
    tab(&app, &tab_id)?
        .navigate(parsed)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reload_tab(app: AppHandle, webview: Webview, tab_id: String) -> Result<(), String> {
    main_only(&webview)?;
    tab(&app, &tab_id)?
        .reload()
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
fn clear_cache(target: Webview) -> Result<(), String> {
    use webview2_com::{
        ClearBrowsingDataCompletedHandler,
        Microsoft::Web::WebView2::Win32::{
            ICoreWebView2Profile2, ICoreWebView2_13,
            COREWEBVIEW2_BROWSING_DATA_KINDS_CACHE_STORAGE,
            COREWEBVIEW2_BROWSING_DATA_KINDS_DISK_CACHE,
        },
    };
    use windows_core::Interface;

    let (sender, receiver) = mpsc::channel();
    target
        .with_webview(move |platform| {
            let sender_for_callback = sender.clone();
            let result = (|| -> Result<(), String> {
                let webview = unsafe { platform.controller().CoreWebView2() }
                    .map_err(|error| error.to_string())?;
                let profile = webview
                    .cast::<ICoreWebView2_13>()
                    .map_err(|error| error.to_string())?;
                let profile = unsafe { profile.Profile() }
                    .map_err(|error| error.to_string())?
                    .cast::<ICoreWebView2Profile2>()
                    .map_err(|error| error.to_string())?;
                let kinds = COREWEBVIEW2_BROWSING_DATA_KINDS_DISK_CACHE
                    | COREWEBVIEW2_BROWSING_DATA_KINDS_CACHE_STORAGE;
                unsafe {
                    profile.ClearBrowsingData(
                        kinds,
                        &ClearBrowsingDataCompletedHandler::create(Box::new(move |result| {
                            let _ =
                                sender_for_callback.send(result.map_err(|error| error.to_string()));
                            Ok(())
                        })),
                    )
                }
                .map_err(|error| error.to_string())?;
                Ok(())
            })();
            if let Err(error) = result {
                let _ = sender.send(Err(error));
            }
        })
        .map_err(|error| error.to_string())?;
    receiver
        .recv_timeout(Duration::from_secs(15))
        .map_err(|error| error.to_string())?
}

#[cfg(not(windows))]
fn clear_cache(_target: Webview) -> Result<(), String> {
    Err("Cache-only clearing is currently implemented for WebView2 on Windows".into())
}

#[tauri::command]
pub async fn clear_browser_cache(app: AppHandle, webview: Webview) -> Result<(), String> {
    main_only(&webview)?;
    let target = app
        .webviews()
        .into_iter()
        .find(|(label, _)| label.starts_with("tab_"))
        .map(|(_, view)| view)
        .unwrap_or(webview);
    tauri::async_runtime::spawn_blocking(move || clear_cache(target))
        .await
        .map_err(|error| error.to_string())?
}

#[derive(serde::Serialize)]
pub struct SystemInfo {
    os: &'static str,
    arch: &'static str,
}

#[tauri::command]
pub fn system_info(webview: Webview) -> Result<SystemInfo, String> {
    main_only(&webview)?;
    Ok(SystemInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    })
}

#[cfg(test)]
mod tests {
    use super::opacity_alpha;

    #[test]
    fn opacity_alpha_clamps_and_converts_percentages() {
        assert_eq!(opacity_alpha(0), 0);
        assert_eq!(opacity_alpha(50), 127);
        assert_eq!(opacity_alpha(100), 255);
        assert_eq!(opacity_alpha(255), 255);
    }
}
