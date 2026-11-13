use std::fs::{OpenOptions, create_dir_all};
use std::io::{self, Write};
use std::path::Path;

pub const DIAGNOSTIC_EVENT_VERSION: u8 = 1;
pub const TELEMETRY_ENABLED: bool = false;

pub fn append_local_log(log_directory: &Path, redacted_json_line: &str) -> io::Result<()> {
    create_dir_all(log_directory)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_directory.join("spectraform-diagnostics.jsonl"))?;
    writeln!(file, "{}", redact_paths(redacted_json_line))
}

fn redact_paths(value: &str) -> String {
    value
        .split_whitespace()
        .map(|token| {
            if token.contains("/Users/")
                || token.contains("/home/")
                || token.contains("..\\")
                || token.contains("../")
                || (token.len() > 2 && token.as_bytes()[1] == b':' && token.as_bytes()[2] == b'\\')
            {
                "[REDACTED_LOCAL_PATH]"
            } else {
                token
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_paths_are_redacted_without_network_transport() {
        assert!(!TELEMETRY_ENABLED);
        assert_eq!(DIAGNOSTIC_EVENT_VERSION, 1);
        assert!(!redact_paths("path C:\\Users\\test\\mask.svg").contains("mask.svg"));
        assert!(!redact_paths("path ../../secret/audio.wav").contains("audio.wav"));
    }
}
