use std::ffi::OsString;
use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::security::path_policy::{CanonicalPathPolicy, PathScope};

pub const ENCODER_JOB_VERSION: u16 = 1;
pub const ALLOWED_FRAMERATES: [u16; 5] = [24, 25, 30, 50, 60];

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EncoderCodec {
    H264,
    Vp9,
    Prores,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EncoderJobV1 {
    pub encoder_job_version: u16,
    pub codec: EncoderCodec,
    pub width: u32,
    pub height: u32,
    pub framerate: u16,
    pub input_path_pattern: PathBuf,
    pub output_path: PathBuf,
    pub overwrite: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum EncoderJobError {
    UnsupportedVersion { expected: u16, received: u16 },
    InvalidDimension { field: &'static str },
    UnsupportedFramerate,
    UnsafeInputPattern,
    UnsafeOutputPath,
    OutputExists,
    OverwriteForbidden,
    PathRejected,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidatedEncoderJob {
    codec: EncoderCodec,
    width: u32,
    height: u32,
    framerate: u16,
    input_path_pattern: PathBuf,
    output_path: PathBuf,
}

impl EncoderJobV1 {
    pub fn validate(
        &self,
        policy: &CanonicalPathPolicy,
    ) -> Result<ValidatedEncoderJob, EncoderJobError> {
        self.validate_shape()?;
        let input_parent = self
            .input_path_pattern
            .parent()
            .ok_or(EncoderJobError::UnsafeInputPattern)?;
        let approved_input_parent = policy
            .authorize_existing(PathScope::Project, input_parent)
            .map_err(|_| EncoderJobError::PathRejected)?;
        let input_name = self
            .input_path_pattern
            .file_name()
            .ok_or(EncoderJobError::UnsafeInputPattern)?;
        let input_path_pattern = approved_input_parent.join(input_name);
        let output_path = policy
            .authorize_new_file(PathScope::Export, &self.output_path)
            .map_err(|_| EncoderJobError::PathRejected)?;

        match fs::symlink_metadata(&output_path) {
            Ok(_) => return Err(EncoderJobError::OutputExists),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err(EncoderJobError::PathRejected),
        }

        Ok(ValidatedEncoderJob {
            codec: self.codec,
            width: self.width,
            height: self.height,
            framerate: self.framerate,
            input_path_pattern,
            output_path,
        })
    }

    pub fn validate_shape(&self) -> Result<(), EncoderJobError> {
        if self.encoder_job_version != ENCODER_JOB_VERSION {
            return Err(EncoderJobError::UnsupportedVersion {
                expected: ENCODER_JOB_VERSION,
                received: self.encoder_job_version,
            });
        }
        validate_dimension(self.width, "width")?;
        validate_dimension(self.height, "height")?;
        if !ALLOWED_FRAMERATES.contains(&self.framerate) {
            return Err(EncoderJobError::UnsupportedFramerate);
        }
        if self.overwrite {
            return Err(EncoderJobError::OverwriteForbidden);
        }
        validate_input_pattern(&self.input_path_pattern)?;
        validate_output_path(&self.output_path, self.codec)
    }
}

impl ValidatedEncoderJob {
    pub fn ffmpeg_arguments(&self) -> Vec<OsString> {
        let (codec, pixel_format) = match self.codec {
            EncoderCodec::H264 => ("libx264", "yuv420p"),
            EncoderCodec::Vp9 => ("libvpx-vp9", "yuv420p"),
            EncoderCodec::Prores => ("prores_ks", "yuv422p10le"),
        };
        vec![
            "-nostdin".into(),
            "-hide_banner".into(),
            "-loglevel".into(),
            "error".into(),
            "-n".into(),
            "-framerate".into(),
            self.framerate.to_string().into(),
            "-i".into(),
            self.input_path_pattern.as_os_str().to_os_string(),
            "-c:v".into(),
            codec.into(),
            "-s:v".into(),
            format!("{}x{}", self.width, self.height).into(),
            "-pix_fmt".into(),
            pixel_format.into(),
            self.output_path.as_os_str().to_os_string(),
        ]
    }
}

fn validate_dimension(value: u32, field: &'static str) -> Result<(), EncoderJobError> {
    if (2..=16_384).contains(&value) && value.is_multiple_of(2) {
        Ok(())
    } else {
        Err(EncoderJobError::InvalidDimension { field })
    }
}

fn validate_input_pattern(path: &Path) -> Result<(), EncoderJobError> {
    validate_absolute_traversal_free(path).map_err(|_| EncoderJobError::UnsafeInputPattern)?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or(EncoderJobError::UnsafeInputPattern)?;
    let valid_extension = name.ends_with(".png") || name.ends_with(".ppm");
    let valid_counters = ["%03d", "%04d", "%05d", "%06d", "%07d", "%08d", "%09d"];
    let counter_count = valid_counters
        .iter()
        .map(|counter| name.matches(counter).count())
        .sum::<usize>();
    if valid_extension
        && counter_count == 1
        && name.matches('%').count() == 1
        && safe_file_name(name)
    {
        Ok(())
    } else {
        Err(EncoderJobError::UnsafeInputPattern)
    }
}

fn validate_output_path(path: &Path, codec: EncoderCodec) -> Result<(), EncoderJobError> {
    validate_absolute_traversal_free(path).map_err(|_| EncoderJobError::UnsafeOutputPath)?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or(EncoderJobError::UnsafeOutputPath)?;
    let extension = path.extension().and_then(|value| value.to_str());
    let expected = match codec {
        EncoderCodec::H264 => "mp4",
        EncoderCodec::Vp9 => "webm",
        EncoderCodec::Prores => "mov",
    };
    if extension == Some(expected) && safe_file_name(name) {
        Ok(())
    } else {
        Err(EncoderJobError::UnsafeOutputPath)
    }
}

fn validate_absolute_traversal_free(path: &Path) -> Result<(), ()> {
    if !path.is_absolute() || path.as_os_str().to_string_lossy().contains('\0') {
        return Err(());
    }
    if path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::Prefix(_) | Component::CurDir
        )
    }) {
        return Err(());
    }
    Ok(())
}

fn safe_file_name(name: &str) -> bool {
    name.chars()
        .all(|character| character.is_ascii_alphanumeric() || "._-%".contains(character))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct Roots {
        base: PathBuf,
        project: PathBuf,
        export: PathBuf,
        diagnostics: PathBuf,
    }

    impl Roots {
        fn create() -> Self {
            let base = std::env::temp_dir().join(format!(
                "spectraform-encoder-job-{}-{}",
                std::process::id(),
                TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&base).expect("unique test root");
            let project = base.join("project");
            let export = base.join("export");
            let diagnostics = base.join("diagnostics");
            for directory in [&project, &export, &diagnostics] {
                fs::create_dir(directory).expect("test directory");
            }
            Self {
                base,
                project,
                export,
                diagnostics,
            }
        }

        fn policy(&self) -> CanonicalPathPolicy {
            CanonicalPathPolicy::new(&self.project, &self.export, &self.diagnostics)
                .expect("test roots are valid")
        }

        fn job(&self) -> EncoderJobV1 {
            EncoderJobV1 {
                encoder_job_version: 1,
                codec: EncoderCodec::H264,
                width: 1920,
                height: 1080,
                framerate: 30,
                input_path_pattern: self.project.join("frame-%06d.png"),
                output_path: self.export.join("render.mp4"),
                overwrite: false,
            }
        }
    }

    impl Drop for Roots {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.base).expect("test root cleanup");
        }
    }

    #[test]
    fn validates_a_v1_job_and_builds_only_allowlisted_arguments() {
        let roots = Roots::create();
        let arguments = roots
            .job()
            .validate(&roots.policy())
            .expect("job is valid")
            .ffmpeg_arguments();

        assert!(arguments.contains(&OsString::from("-n")));
        assert!(!arguments.contains(&OsString::from("-y")));
        assert!(arguments.contains(&OsString::from("libx264")));
    }

    #[test]
    fn rejects_traversal_overwrite_and_existing_outputs() {
        let roots = Roots::create();
        let mut traversal = roots.job();
        traversal.output_path = roots.export.join("nested/../../escape.mp4");
        assert_eq!(
            traversal.validate_shape(),
            Err(EncoderJobError::UnsafeOutputPath)
        );

        let mut overwrite = roots.job();
        overwrite.overwrite = true;
        assert_eq!(
            overwrite.validate_shape(),
            Err(EncoderJobError::OverwriteForbidden)
        );

        let existing = roots.job();
        fs::write(&existing.output_path, b"synthetic").expect("fixture");
        assert_eq!(
            existing.validate(&roots.policy()),
            Err(EncoderJobError::OutputExists)
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_a_broken_symlink_at_the_final_output_path() {
        use std::os::unix::fs::symlink;

        let roots = Roots::create();
        let job = roots.job();
        symlink(roots.export.join("missing-target.mp4"), &job.output_path)
            .expect("broken output symlink fixture");

        assert_eq!(
            job.validate(&roots.policy()),
            Err(EncoderJobError::OutputExists)
        );
    }
}
