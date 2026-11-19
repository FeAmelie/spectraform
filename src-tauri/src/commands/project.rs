use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::security::path_policy::{CanonicalPathPolicy, PathPolicyError, PathScope};

use super::foundation::COMMAND_CONTRACT_VERSION;

pub const PROJECT_LAYOUT_VERSION: u16 = 1;
const CONFIG_FAMILIES: [&str; 10] = [
    "app", "audio", "asset", "mapping", "palette", "scene", "show", "import", "contrast", "export",
];

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSnapshotRequest {
    pub command_contract_version: u16,
    pub project_layout_version: u16,
    pub project_root: String,
    pub config_files: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSnapshotResponse {
    pub command_contract_version: u16,
    pub project_layout_version: u16,
    pub project_root: String,
    pub sources: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum ProjectCommandError {
    UnsupportedContractVersion {
        expected: u16,
        received: u16,
    },
    UnsupportedProjectLayout {
        expected: u16,
        received: u16,
    },
    InvalidConfigSet,
    InvalidProjectRoot {
        reason: &'static str,
    },
    PathRejected {
        family: String,
        reason: &'static str,
    },
    ReadFailed {
        family: String,
    },
}

fn path_error_code(error: &PathPolicyError) -> &'static str {
    match error {
        PathPolicyError::NonAbsolutePath => "non_absolute_path",
        PathPolicyError::ForeignPlatformPath => "foreign_platform_path",
        PathPolicyError::Traversal => "traversal",
        PathPolicyError::RootUnavailable => "root_unavailable",
        PathPolicyError::RootIsNotDirectory => "root_not_directory",
        PathPolicyError::CandidateUnavailable => "candidate_unavailable",
        PathPolicyError::MissingFileName => "missing_file_name",
        PathPolicyError::OutsideApprovedRoot => "outside_project_root",
        PathPolicyError::SymlinkEscape => "symlink_escape",
    }
}

fn validate_config_set(config_files: &BTreeMap<String, String>) -> Result<(), ProjectCommandError> {
    let expected = CONFIG_FAMILIES.into_iter().collect::<BTreeSet<_>>();
    let received = config_files
        .keys()
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    if received == expected {
        Ok(())
    } else {
        Err(ProjectCommandError::InvalidConfigSet)
    }
}

#[tauri::command]
pub fn load_project_snapshot(
    request: ProjectSnapshotRequest,
) -> Result<ProjectSnapshotResponse, ProjectCommandError> {
    if request.command_contract_version != COMMAND_CONTRACT_VERSION {
        return Err(ProjectCommandError::UnsupportedContractVersion {
            expected: COMMAND_CONTRACT_VERSION,
            received: request.command_contract_version,
        });
    }
    if request.project_layout_version != PROJECT_LAYOUT_VERSION {
        return Err(ProjectCommandError::UnsupportedProjectLayout {
            expected: PROJECT_LAYOUT_VERSION,
            received: request.project_layout_version,
        });
    }
    validate_config_set(&request.config_files)?;

    let root = PathBuf::from(&request.project_root);
    let policy = CanonicalPathPolicy::new(&root, &root, &root).map_err(|error| {
        ProjectCommandError::InvalidProjectRoot {
            reason: path_error_code(&error),
        }
    })?;
    let mut sources = BTreeMap::new();
    for family in CONFIG_FAMILIES {
        let reference = request
            .config_files
            .get(family)
            .ok_or(ProjectCommandError::InvalidConfigSet)?;
        let candidate = root.join(Path::new(reference));
        let approved = policy
            .authorize_existing(PathScope::Project, &candidate)
            .map_err(|error| ProjectCommandError::PathRejected {
                family: family.to_owned(),
                reason: path_error_code(&error),
            })?;
        let source = fs::read_to_string(approved).map_err(|_| ProjectCommandError::ReadFailed {
            family: family.to_owned(),
        })?;
        sources.insert(family.to_owned(), source);
    }

    Ok(ProjectSnapshotResponse {
        command_contract_version: COMMAND_CONTRACT_VERSION,
        project_layout_version: PROJECT_LAYOUT_VERSION,
        project_root: policy
            .root(PathScope::Project)
            .to_string_lossy()
            .into_owned(),
        sources,
    })
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU64, Ordering};

    use super::*;

    static ROOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct ProjectFixture {
        base: PathBuf,
        root: PathBuf,
        outside: PathBuf,
        files: BTreeMap<String, String>,
    }

    impl ProjectFixture {
        fn create() -> Self {
            let sequence = ROOT_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let base = std::env::temp_dir().join(format!(
                "spectraform-project-command-{}-{sequence}",
                std::process::id()
            ));
            let root = base.join("project");
            let outside = base.join("outside.yaml");
            fs::create_dir_all(root.join("config")).expect("fixture root must be created");
            fs::write(&outside, "schema_version: 1\n")
                .expect("synthetic outside file must be written");
            let files = CONFIG_FAMILIES
                .into_iter()
                .map(|family| (family.to_owned(), format!("config/{family}.yaml")))
                .collect::<BTreeMap<_, _>>();
            for (family, reference) in &files {
                fs::write(
                    root.join(reference),
                    format!("schema_version: 1\nfamily: {family}\n"),
                )
                .expect("synthetic config must be written");
            }
            Self {
                base,
                root,
                outside,
                files,
            }
        }

        fn request(&self) -> ProjectSnapshotRequest {
            ProjectSnapshotRequest {
                command_contract_version: 1,
                project_layout_version: 1,
                project_root: self.root.to_string_lossy().into_owned(),
                config_files: self.files.clone(),
            }
        }
    }

    impl Drop for ProjectFixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.base).expect("fixture root must be removable");
        }
    }

    #[test]
    fn reads_one_complete_snapshot_without_modifying_sources() {
        let fixture = ProjectFixture::create();
        let before = fixture
            .files
            .values()
            .map(|reference| fs::read(fixture.root.join(reference)).expect("source must exist"))
            .collect::<Vec<_>>();
        let response = load_project_snapshot(fixture.request()).expect("snapshot must load");
        let after = fixture
            .files
            .values()
            .map(|reference| fs::read(fixture.root.join(reference)).expect("source must exist"))
            .collect::<Vec<_>>();

        assert_eq!(response.sources.len(), CONFIG_FAMILIES.len());
        assert_eq!(before, after);
    }

    #[test]
    fn rejects_traversal_and_outside_paths() {
        let fixture = ProjectFixture::create();
        let mut traversal = fixture.request();
        traversal
            .config_files
            .insert("app".to_owned(), "../outside.yaml".to_owned());
        assert!(matches!(
            load_project_snapshot(traversal),
            Err(ProjectCommandError::PathRejected {
                reason: "traversal",
                ..
            })
        ));

        let mut outside = fixture.request();
        outside.config_files.insert(
            "app".to_owned(),
            fixture.outside.to_string_lossy().into_owned(),
        );
        assert!(matches!(
            load_project_snapshot(outside),
            Err(ProjectCommandError::PathRejected {
                reason: "outside_project_root",
                ..
            })
        ));
    }
}
