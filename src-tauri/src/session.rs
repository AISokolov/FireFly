use std::{collections::HashMap, fs, io::Write, path::Path, sync::Mutex};
use tauri::{AppHandle, Manager, State, Webview};

#[derive(Default)]
pub struct SessionStorage(pub Mutex<()>);

fn main_only(webview: &Webview) -> Result<(), String> {
    if webview.label() == "main" {
        Ok(())
    } else {
        Err("Tab session commands are only available to the main UI".into())
    }
}

fn read_session(path: &Path) -> Result<serde_json::Value, String> {
    match fs::read(path) {
        Ok(bytes) => Ok(serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(serde_json::Value::Null),
        Err(error) => Err(error.to_string()),
    }
}

fn write_session(path: &Path, session: &serde_json::Value) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    let bytes = serde_json::to_vec(session).map_err(|error| error.to_string())?;
    let mut file = fs::File::create(&temporary).map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    drop(file);
    // Replace only after a complete write, preserving the previous session on failure.
    fs::rename(temporary, path).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn load_tab_session(
    app: AppHandle,
    webview: Webview,
    storage: State<'_, SessionStorage>,
) -> Result<serde_json::Value, String> {
    main_only(&webview)?;
    let _guard = storage.0.lock().map_err(|error| error.to_string())?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    read_session(&path.join("tab-session.json"))
}

#[tauri::command]
pub async fn save_tab_session(
    app: AppHandle,
    webview: Webview,
    storage: State<'_, SessionStorage>,
    session: serde_json::Value,
) -> Result<(), String> {
    main_only(&webview)?;
    let _guard = storage.0.lock().map_err(|error| error.to_string())?;
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    write_session(&directory.join("tab-session.json"), &session)
}

#[tauri::command]
pub async fn get_tab_urls(
    app: AppHandle,
    webview: Webview,
) -> Result<HashMap<String, String>, String> {
    main_only(&webview)?;
    Ok(app
        .webviews()
        .into_iter()
        .filter_map(|(label, view)| {
            let id = label.strip_prefix("tab_")?;
            let mut url = view.url().ok()?;
            if !matches!(url.scheme(), "http" | "https") {
                return None;
            }
            let _ = url.set_username("");
            let _ = url.set_password(None);
            Some((id.to_owned(), url.to_string()))
        })
        .collect())
}

pub fn persist_live_urls(app: &AppHandle) -> Result<(), String> {
    // Read native views before acquiring the storage lock: webview queries may marshal
    // to the UI thread, which could itself be waiting on a pending session write.
    let urls: HashMap<String, String> = app
        .webviews()
        .into_iter()
        .filter_map(|(label, view)| {
            let id = label.strip_prefix("tab_")?;
            let mut url = view.url().ok()?;
            let _ = url.set_username("");
            let _ = url.set_password(None);
            matches!(url.scheme(), "http" | "https").then(|| (id.to_owned(), url.to_string()))
        })
        .collect();
    let storage = app.state::<SessionStorage>();
    let _guard = storage.0.lock().map_err(|error| error.to_string())?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("tab-session.json");
    let mut session = read_session(&path)?;
    if let Some(tabs) = session
        .get_mut("tabs")
        .and_then(|value| value.as_array_mut())
    {
        for tab in tabs {
            if let Some(url) = tab
                .get("id")
                .and_then(|id| id.as_str())
                .and_then(|id| urls.get(id))
            {
                tab["url"] = serde_json::Value::String(url.clone());
            }
        }
        write_session(&path, &session)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_file_survives_replacement_and_handles_missing_or_corrupt_data() {
        let directory =
            std::env::temp_dir().join(format!("firefly-session-test-{}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("tab-session.json");
        assert!(read_session(&path).unwrap().is_null());
        let first = serde_json::json!({ "version": 1, "tabs": [], "activeTabId": null });
        write_session(&path, &first).unwrap();
        assert_eq!(read_session(&path).unwrap(), first);
        let next = serde_json::json!({ "version": 1, "tabs": [{ "id": "a", "url": "https://example.com/" }], "activeTabId": "a" });
        write_session(&path, &next).unwrap();
        assert_eq!(read_session(&path).unwrap(), next);
        fs::write(&path, b"{broken").unwrap();
        assert!(read_session(&path).unwrap().is_null());
        fs::remove_file(path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
