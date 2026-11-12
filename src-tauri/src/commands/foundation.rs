use serde::{Deserialize, Serialize};
use tauri::WebviewWindow;

pub const COMMAND_CONTRACT_VERSION: u16 = 1;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FoundationRequest {
    pub command_contract_version: u16,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FoundationResponse {
    pub command_contract_version: u16,
    pub runtime_network_capability: &'static str,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FullscreenRequest {
    pub command_contract_version: u16,
    pub fullscreen: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FullscreenResponse {
    pub command_contract_version: u16,
    pub fullscreen: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum FoundationError {
    UnsupportedContractVersion {
        expected: u16,
        received: u16,
    },
    WindowOperationFailed {
        operation: &'static str,
        message: String,
    },
}

fn validate_contract_version(received: u16) -> Result<(), FoundationError> {
    if received == COMMAND_CONTRACT_VERSION {
        Ok(())
    } else {
        Err(FoundationError::UnsupportedContractVersion {
            expected: COMMAND_CONTRACT_VERSION,
            received,
        })
    }
}

#[tauri::command]
pub fn foundation_status(
    request: FoundationRequest,
) -> Result<FoundationResponse, FoundationError> {
    validate_contract_version(request.command_contract_version)?;

    Ok(FoundationResponse {
        command_contract_version: COMMAND_CONTRACT_VERSION,
        runtime_network_capability: "none",
    })
}

#[tauri::command]
pub fn set_fullscreen(
    request: FullscreenRequest,
    window: WebviewWindow,
) -> Result<FullscreenResponse, FoundationError> {
    validate_contract_version(request.command_contract_version)?;
    window.set_fullscreen(request.fullscreen).map_err(|error| {
        FoundationError::WindowOperationFailed {
            operation: "set_fullscreen",
            message: error.to_string(),
        }
    })?;
    let fullscreen =
        window
            .is_fullscreen()
            .map_err(|error| FoundationError::WindowOperationFailed {
                operation: "is_fullscreen",
                message: error.to_string(),
            })?;

    Ok(FullscreenResponse {
        command_contract_version: COMMAND_CONTRACT_VERSION,
        fullscreen,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_the_v1_contract() {
        assert_eq!(validate_contract_version(1), Ok(()));
        assert_eq!(
            foundation_status(FoundationRequest {
                command_contract_version: 1,
            })
            .expect("v1 must be accepted"),
            FoundationResponse {
                command_contract_version: 1,
                runtime_network_capability: "none",
            }
        );
    }

    #[test]
    fn rejects_unknown_major_versions() {
        assert_eq!(
            validate_contract_version(2),
            Err(FoundationError::UnsupportedContractVersion {
                expected: 1,
                received: 2,
            })
        );
    }
}
