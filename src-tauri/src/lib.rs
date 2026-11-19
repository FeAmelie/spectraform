pub mod build_info;
pub mod commands;
pub mod diagnostics {
    pub mod log_writer;
}
pub mod export;
pub mod security;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if build_info::run_headless_smoke_if_requested() {
        return;
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::foundation::foundation_status,
            commands::foundation::set_fullscreen,
            commands::project::load_project_snapshot
        ])
        .run(tauri::generate_context!())
        .expect("Spectraform desktop runtime failed");
}
