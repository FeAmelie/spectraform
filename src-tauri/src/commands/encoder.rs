use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::export::encoder_job::{EncoderJobError, EncoderJobV1, ENCODER_JOB_VERSION};
use crate::export::ffmpeg::{detect_ffmpeg, FfmpegCapability};
use crate::security::path_policy::CanonicalPathPolicy;

pub const ENCODER_COMMAND_CONTRACT_VERSION: u16 = 1;

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EncoderCapabilityRequest {
    pub command_contract_version: u16,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EncoderJobRequest {
    pub command_contract_version: u16,
    pub project_root: PathBuf,
    pub export_root: PathBuf,
    pub diagnostics_root: PathBuf,
    pub job: EncoderJobV1,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EncoderJobValidationResponse {
    pub encoder_job_version: u16,
    pub valid: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum EncoderCommandError {
    UnsupportedContractVersion { expected: u16, received: u16 },
    InvalidRoots,
    InvalidJob { error: EncoderJobError },
}

pub fn inspect_ffmpeg_capability(
    request: EncoderCapabilityRequest,
) -> Result<FfmpegCapability, EncoderCommandError> {
    validate_contract(request.command_contract_version)?;
    Ok(detect_ffmpeg())
}

pub fn validate_encoder_job(
    request: EncoderJobRequest,
) -> Result<EncoderJobValidationResponse, EncoderCommandError> {
    validate_contract(request.command_contract_version)?;
    let policy = CanonicalPathPolicy::new(
        &request.project_root,
        &request.export_root,
        &request.diagnostics_root,
    )
    .map_err(|_| EncoderCommandError::InvalidRoots)?;
    request
        .job
        .validate(&policy)
        .map_err(|error| EncoderCommandError::InvalidJob { error })?;
    Ok(EncoderJobValidationResponse {
        encoder_job_version: ENCODER_JOB_VERSION,
        valid: true,
    })
}

fn validate_contract(received: u16) -> Result<(), EncoderCommandError> {
    if received == ENCODER_COMMAND_CONTRACT_VERSION {
        Ok(())
    } else {
        Err(EncoderCommandError::UnsupportedContractVersion {
            expected: ENCODER_COMMAND_CONTRACT_VERSION,
            received,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::export::encoder_job::EncoderCodec;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    #[test]
    fn rejects_unknown_command_versions_and_unsafe_jobs() {
        assert!(matches!(
            inspect_ffmpeg_capability(EncoderCapabilityRequest {
                command_contract_version: 2
            }),
            Err(EncoderCommandError::UnsupportedContractVersion { .. })
        ));
        let base = std::env::temp_dir().join(format!(
            "spectraform-encoder-command-{}-{}",
            std::process::id(),
            TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        let project = base.join("project");
        let export = base.join("export");
        let diagnostics = base.join("diagnostics");
        for directory in [&base, &project, &export, &diagnostics] {
            fs::create_dir(directory).expect("command test root");
        }
        let response = validate_encoder_job(EncoderJobRequest {
            command_contract_version: 1,
            project_root: project,
            export_root: export,
            diagnostics_root: diagnostics,
            job: EncoderJobV1 {
                encoder_job_version: 1,
                codec: EncoderCodec::H264,
                width: 1920,
                height: 1080,
                framerate: 30,
                input_path_pattern: PathBuf::from("../frames/frame-%06d.png"),
                output_path: PathBuf::from("/tmp/render.mp4"),
                overwrite: false,
            },
        });
        assert!(matches!(
            response,
            Err(EncoderCommandError::InvalidJob { .. })
        ));
        fs::remove_dir_all(base).expect("command test cleanup");
    }
}
