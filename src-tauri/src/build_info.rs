use serde::Serialize;

pub const BUILD_INFO_CONTRACT_VERSION: u8 = 1;
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const COMMIT_ID: &str = match option_env!("SPECTRAFORM_COMMIT_ID") {
    Some(value) => value,
    None => "unknown",
};
#[cfg(target_arch = "aarch64")]
pub const TARGET_ARCHITECTURE: &str = "arm64";
#[cfg(not(target_arch = "aarch64"))]
pub const TARGET_ARCHITECTURE: &str = std::env::consts::ARCH;

#[derive(Debug, Serialize)]
pub struct BuildInfoV1 {
    pub contract_version: u8,
    pub version: &'static str,
    pub commit_id: &'static str,
    pub architecture: &'static str,
    pub signature: &'static str,
}

pub fn current() -> BuildInfoV1 {
    BuildInfoV1 {
        contract_version: BUILD_INFO_CONTRACT_VERSION,
        version: APP_VERSION,
        commit_id: COMMIT_ID,
        architecture: TARGET_ARCHITECTURE,
        signature: "adhoc",
    }
}

/// Returns before Tauri initializes whenever the packaging smoke requests the
/// non-visual path. This keeps automated verification in the current terminal
/// and guarantees that it cannot create a window.
pub fn run_headless_smoke_if_requested() -> bool {
    if std::env::var_os("SPECTRAFORM_HEADLESS_SMOKE").is_none() {
        return false;
    }

    let info = current();
    assert_eq!(info.architecture, "arm64");
    assert_ne!(info.commit_id, "unknown");
    assert_eq!(info.commit_id.len(), 40);
    println!(
        "spectraform-headless-smoke contract={} version={} commit={} architecture={} signature={}",
        info.contract_version, info.version, info.commit_id, info.architecture, info.signature
    );
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_info_contract_is_stable() {
        let info = current();
        assert_eq!(info.contract_version, 1);
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(info.architecture, "arm64");
        assert_eq!(info.signature, "adhoc");
    }
}
