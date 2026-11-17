use std::ffi::OsStr;
use std::io::{self, Read};
use std::path::Path;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;

pub const MINIMUM_FFMPEG_VERSION: FfmpegVersion = FfmpegVersion {
    major: 9,
    minor: 0,
    patch: 2,
};
const MAX_VERSION_OUTPUT_BYTES: u64 = 64 * 1024;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegVersion {
    pub major: u16,
    pub minor: u16,
    pub patch: u16,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum FfmpegCapability {
    Available {
        version: FfmpegVersion,
        minimum_version: FfmpegVersion,
    },
    Unsupported {
        version: FfmpegVersion,
        minimum_version: FfmpegVersion,
        reason: String,
    },
    Unavailable {
        minimum_version: FfmpegVersion,
        reason: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyntheticSmokeResult {
    Passed,
    CapabilitySkip { reason: String },
}

pub fn detect_ffmpeg() -> FfmpegCapability {
    detect_ffmpeg_at(OsStr::new("ffmpeg"), Duration::from_secs(2))
}

pub(crate) fn detect_ffmpeg_at(program: &OsStr, timeout: Duration) -> FfmpegCapability {
    let output = match run_with_timeout(program, &["-version"], timeout) {
        Ok(output) if output.status.success() => output.stdout,
        Ok(output) => {
            return FfmpegCapability::Unavailable {
                minimum_version: MINIMUM_FFMPEG_VERSION,
                reason: format!("FFmpeg version probe exited with {}", output.status),
            };
        }
        Err(error) => {
            return FfmpegCapability::Unavailable {
                minimum_version: MINIMUM_FFMPEG_VERSION,
                reason: error.to_string(),
            };
        }
    };
    let Some(version) = parse_ffmpeg_version(&output) else {
        return FfmpegCapability::Unavailable {
            minimum_version: MINIMUM_FFMPEG_VERSION,
            reason: "FFmpeg version output could not be parsed".into(),
        };
    };
    if version < MINIMUM_FFMPEG_VERSION {
        FfmpegCapability::Unsupported {
            version,
            minimum_version: MINIMUM_FFMPEG_VERSION,
            reason: "FFmpeg does not satisfy the minimum version".into(),
        }
    } else {
        FfmpegCapability::Available {
            version,
            minimum_version: MINIMUM_FFMPEG_VERSION,
        }
    }
}

pub fn synthetic_smoke_or_skip(
    program: &OsStr,
    output_path: &Path,
    timeout: Duration,
) -> io::Result<SyntheticSmokeResult> {
    match detect_ffmpeg_at(program, timeout) {
        FfmpegCapability::Available { .. } => {}
        FfmpegCapability::Unavailable { reason, .. }
        | FfmpegCapability::Unsupported { reason, .. } => {
            return Ok(SyntheticSmokeResult::CapabilitySkip { reason });
        }
    }
    let parent_is_directory = output_path.parent().is_some_and(Path::is_dir);
    let path_is_safe = output_path.is_absolute()
        && !output_path
            .components()
            .any(|component| matches!(component, std::path::Component::ParentDir))
        && !output_path.as_os_str().to_string_lossy().contains('\0');
    if !path_is_safe || !parent_is_directory || output_path.exists() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "synthetic output must be a new absolute path",
        ));
    }
    let output = output_path.to_string_lossy().into_owned();
    let arguments = [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=16x16:r=1",
        "-frames:v",
        "1",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-n",
        &output,
    ];
    let result = run_with_timeout(program, &arguments, timeout)?;
    if result.status.success() && output_path.is_file() {
        Ok(SyntheticSmokeResult::Passed)
    } else {
        Err(io::Error::other(format!(
            "synthetic FFmpeg smoke failed with {}: {}",
            result.status, result.stderr
        )))
    }
}

fn parse_ffmpeg_version(output: &str) -> Option<FfmpegVersion> {
    let token = output
        .split_whitespace()
        .skip_while(|part| !part.eq_ignore_ascii_case("version"))
        .nth(1)?
        .trim_start_matches('n');
    let mut numbers = token
        .split(['.', '-'])
        .take(3)
        .map(|value| value.parse::<u16>());
    Some(FfmpegVersion {
        major: numbers.next()?.ok()?,
        minor: numbers.next()?.ok()?,
        patch: numbers.next().and_then(Result::ok).unwrap_or(0),
    })
}

struct ProcessOutput {
    status: ExitStatus,
    stdout: String,
    stderr: String,
}

fn run_with_timeout(
    program: &OsStr,
    arguments: &[&str],
    timeout: Duration,
) -> io::Result<ProcessOutput> {
    let mut child = Command::new(program)
        .args(arguments)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    let deadline = Instant::now() + timeout;
    loop {
        if let Some(status) = child.try_wait()? {
            return collect_output(child, status);
        }
        if Instant::now() >= deadline {
            child.kill()?;
            let _ = child.wait();
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "FFmpeg probe timed out",
            ));
        }
        thread::sleep(Duration::from_millis(10));
    }
}

fn collect_output(mut child: Child, status: ExitStatus) -> io::Result<ProcessOutput> {
    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(stream) = child.stdout.take() {
        stream
            .take(MAX_VERSION_OUTPUT_BYTES)
            .read_to_string(&mut stdout)?;
    }
    if let Some(stream) = child.stderr.take() {
        stream
            .take(MAX_VERSION_OUTPUT_BYTES)
            .read_to_string(&mut stderr)?;
    }
    Ok(ProcessOutput {
        status,
        stdout,
        stderr,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_enforces_the_minimum_version() {
        assert_eq!(
            parse_ffmpeg_version("ffmpeg version 9.0.2 Copyright"),
            Some(MINIMUM_FFMPEG_VERSION)
        );
        assert!(
            FfmpegVersion {
                major: 9,
                minor: 0,
                patch: 1
            } < MINIMUM_FFMPEG_VERSION
        );
    }

    #[test]
    fn missing_ffmpeg_is_an_explicit_capability_skip() {
        let program = OsStr::new("/definitely/missing/spectraform-ffmpeg");
        let output = std::env::temp_dir().join("spectraform-synthetic-smoke.mp4");
        let result = synthetic_smoke_or_skip(program, &output, Duration::from_millis(100))
            .expect("missing capability is not a smoke failure");
        assert!(matches!(
            result,
            SyntheticSmokeResult::CapabilitySkip { .. }
        ));
    }
}
