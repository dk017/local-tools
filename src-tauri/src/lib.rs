// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod python_bridge;

// Trigger rebuild for sidecar restart

use python_bridge::{PythonBridge, PythonRequest};
use serde_json::Value;
use tauri::{Manager, State};

// Manage the bridge state
struct AppState {
    python_bridge: PythonBridge,
}

#[tauri::command]
fn invoke_python(
    state: State<AppState>,
    module: String,
    action: String,
    payload: Value,
    request_id: String,
) -> Result<(), String> {
    let request = PythonRequest {
        request_id,
        module,
        action,
        payload,
    };
    state.python_bridge.send_command(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let bridge = PythonBridge::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            python_bridge: bridge,
        })
        .setup(|app| {
            let state = app.state::<AppState>();
            state.python_bridge.start(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![invoke_python])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
