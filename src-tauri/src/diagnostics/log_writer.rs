use std::fs::{OpenOptions, create_dir_all};
use std::io::{self, Write};
use std::path::Path;

pub const DIAGNOSTIC_EVENT_VERSION: u8 = 1;
pub const TELEMETRY_ENABLED: bool = false;
const _: [(); 1] = [(); (!TELEMETRY_ENABLED) as usize];

pub fn append_local_log(log_directory: &Path, redacted_json_line: &str) -> io::Result<()> {
    create_dir_all(log_directory)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_directory.join("spectraform-diagnostics.jsonl"))?;
    writeln!(file, "{}", redact_paths(redacted_json_line))
}

fn redact_paths(value: &str) -> String {
    let has_drive_path = value.as_bytes().windows(3).any(|window| {
        window[0].is_ascii_alphabetic() && window[1] == b':' && matches!(window[2], b'\\' | b'/')
    });
    let has_local_path = has_drive_path
        || value.contains("\\\\")
        || value.contains("/Users/")
        || value.contains("/home/")
        || value.contains("/private/")
        || value.contains("/tmp/")
        || value.contains("/var/")
        || value.contains("..\\")
        || value.contains("../");

    if has_local_path {
        "[REDACTED_LOCAL_PATH]".to_owned()
    } else {
        value.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_paths_are_redacted_without_network_transport() {
        assert!(!std::hint::black_box(TELEMETRY_ENABLED));
        assert_eq!(DIAGNOSTIC_EVENT_VERSION, 1);
        assert!(!redact_paths("path C:\\Users\\test\\mask.svg").contains("mask.svg"));
        assert!(!redact_paths("path ../../secret/audio.wav").contains("audio.wav"));
        assert_eq!(
            redact_paths("path /Users/test/My Project/audio.wav"),
            "[REDACTED_LOCAL_PATH]"
        );
        assert_eq!(
            redact_paths("path C:\\Users\\test\\My Project\\audio.wav"),
            "[REDACTED_LOCAL_PATH]"
        );
    }
}
