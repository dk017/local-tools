use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandEvent, CommandChild};
use tauri_plugin_shell::ShellExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PythonRequest {
    pub request_id: String,
    pub module: String,
    pub action: String,
    pub payload: Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PythonResponse {
    #[serde(rename = "type")]
    pub msg_type: String, // "progress" or "result"
    pub request_id: String,
    pub status: Option<String>,
    pub data: Option<Value>,
    pub error: Option<Value>,
    pub progress: Option<u32>,
    pub message: Option<String>,
}

pub struct PythonBridge {
    child: Arc<Mutex<Option<CommandChild>>>,
}

impl PythonBridge {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, app: &AppHandle) {
        let child_process = self.child.clone();
        let app_handle = app.clone();

        tauri::async_runtime::spawn(async move {
            let sidecar_command = app_handle.shell().sidecar("python-backend").unwrap();
            let (mut rx, child) = sidecar_command.spawn().expect("Failed to spawn python sidecar");
            
            // Store child to write to stdin later
            *child_process.lock().unwrap() = Some(child);

            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line_bytes) => {
                        let line = String::from_utf8_lossy(&line_bytes);
                        // The line might contain multiple JSON objects if they came in fast, 
                        // or partial lines. But for now assuming line-delimited JSON.
                        // In a robust app we might need a buffer.
                        // For this MVP, let's assume the Python side flushes correctly per line.
                        
                        // Python sidecar output might have newlines, so we trim
                        let clean_line = line.trim();
                        if clean_line.is_empty() { continue; }

                        match serde_json::from_str::<PythonResponse>(clean_line) {
                            Ok(response) => {
                                // Emit event to frontend
                                // Event name: "python-event"
                                let _ = app_handle.emit("python-event", &response);
                            }
                            Err(e) => {
                                eprintln!("Failed to parse Python output: {} | Line: {}", e, clean_line);
                            }
                        }
                    }
                    CommandEvent::Stderr(line_bytes) => {
                        let line = String::from_utf8_lossy(&line_bytes);
                        eprintln!("PYTHON LOG: {}", line);
                    }
                    CommandEvent::Error(e) => {
                         eprintln!("Python Sidecar Error: {}", e);
                    }
                    CommandEvent::Terminated(payload) => {
                         eprintln!("Python Sidecar Terminated: {:?}", payload);
                         // TODO: Restart logic could go here
                    }
                    _ => {}
                }
            }
        });
    }

    pub fn send_command(&self, request: PythonRequest) -> Result<(), String> {
        let mut child_guard = self.child.lock().unwrap();
        if let Some(child) = &mut *child_guard {
            let json_str = serde_json::to_string(&request).map_err(|e| e.to_string())?;
            let msg = format!("{}\n", json_str);
            child.write(msg.as_bytes()).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Python backend not running".to_string())
        }
    }
}
