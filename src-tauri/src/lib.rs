mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::foundation::foundation_status,
            commands::foundation::set_fullscreen
        ])
        .run(tauri::generate_context!())
        .expect("Spectraform desktop runtime failed");
}
