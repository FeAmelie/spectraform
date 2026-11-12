fn main() {
    // Foundation assets stay out of the repository. Generate the temporary
    // icon and bundled local shell in Cargo's build output, then overlay their
    // absolute paths onto Tauri's compile-time config.
    const PLACEHOLDER_ICON: &[u8] = &[
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
        0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0x64,
        0xf8, 0xcf, 0xf0, 0x1f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0x5f, 0x81, 0x6e, 0xc5, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ];

    let out_dir =
        std::path::PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo must define OUT_DIR"));
    let icon_path = out_dir.join("spectraform-foundation-icon.png");
    std::fs::write(&icon_path, PLACEHOLDER_ICON).expect("write generated foundation icon");

    let frontend_dist = out_dir.join("foundation-dist");
    std::fs::create_dir_all(&frontend_dist).expect("create generated frontend directory");
    std::fs::write(
        frontend_dist.join("index.html"),
        r#"<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spectraform</title><main id="spectraform-shell" role="application" aria-label="Spectraform"><h1>Spectraform</h1><p role="status">Local desktop shell ready.</p></main></html>"#,
    )
    .expect("write generated local frontend");

    println!(
        "cargo:rustc-env=TAURI_CONFIG={{\"build\":{{\"frontendDist\":\"{}\"}},\"bundle\":{{\"icon\":[\"{}\"]}}}}",
        frontend_dist.display(),
        icon_path.display()
    );

    tauri_build::build();
}
