use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathScope {
    Project,
    Export,
    Diagnostics,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathPolicyError {
    NonAbsolutePath,
    ForeignPlatformPath,
    Traversal,
    RootUnavailable,
    RootIsNotDirectory,
    CandidateUnavailable,
    MissingFileName,
    OutsideApprovedRoot,
    SymlinkEscape,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CanonicalPathPolicy {
    project_root_lexical: PathBuf,
    project_root: PathBuf,
    export_root_lexical: PathBuf,
    export_root: PathBuf,
    diagnostics_root_lexical: PathBuf,
    diagnostics_root: PathBuf,
}

impl CanonicalPathPolicy {
    pub fn new(
        project_root: &Path,
        export_root: &Path,
        diagnostics_root: &Path,
    ) -> Result<Self, PathPolicyError> {
        let (project_root_lexical, project_root) = canonical_directory_root(project_root)?;
        let (export_root_lexical, export_root) = canonical_directory_root(export_root)?;
        let (diagnostics_root_lexical, diagnostics_root) =
            canonical_directory_root(diagnostics_root)?;

        Ok(Self {
            project_root_lexical,
            project_root,
            export_root_lexical,
            export_root,
            diagnostics_root_lexical,
            diagnostics_root,
        })
    }

    fn lexical_root(&self, scope: PathScope) -> &Path {
        match scope {
            PathScope::Project => &self.project_root_lexical,
            PathScope::Export => &self.export_root_lexical,
            PathScope::Diagnostics => &self.diagnostics_root_lexical,
        }
    }

    pub fn root(&self, scope: PathScope) -> &Path {
        match scope {
            PathScope::Project => &self.project_root,
            PathScope::Export => &self.export_root,
            PathScope::Diagnostics => &self.diagnostics_root,
        }
    }

    pub fn authorize_existing(
        &self,
        scope: PathScope,
        candidate: &Path,
    ) -> Result<PathBuf, PathPolicyError> {
        inspect_raw_path(candidate)?;
        let canonical = candidate
            .canonicalize()
            .map_err(|_| PathPolicyError::CandidateUnavailable)?;
        self.enforce_containment(scope, candidate, canonical)
    }

    pub fn authorize_new_file(
        &self,
        scope: PathScope,
        candidate: &Path,
    ) -> Result<PathBuf, PathPolicyError> {
        inspect_raw_path(candidate)?;

        if candidate.exists() {
            return self.authorize_existing(scope, candidate);
        }

        let file_name = candidate
            .file_name()
            .filter(|name| !name.is_empty())
            .ok_or(PathPolicyError::MissingFileName)?;
        let parent = candidate.parent().ok_or(PathPolicyError::MissingFileName)?;
        let canonical_parent = parent
            .canonicalize()
            .map_err(|_| PathPolicyError::CandidateUnavailable)?;
        let canonical_candidate = canonical_parent.join(file_name);

        self.enforce_containment(scope, candidate, canonical_candidate)
    }

    fn enforce_containment(
        &self,
        scope: PathScope,
        raw_candidate: &Path,
        canonical_candidate: PathBuf,
    ) -> Result<PathBuf, PathPolicyError> {
        let root = self.root(scope);
        if canonical_candidate.starts_with(root) {
            return Ok(canonical_candidate);
        }

        if raw_candidate.starts_with(self.lexical_root(scope)) {
            Err(PathPolicyError::SymlinkEscape)
        } else {
            Err(PathPolicyError::OutsideApprovedRoot)
        }
    }
}

fn canonical_directory_root(root: &Path) -> Result<(PathBuf, PathBuf), PathPolicyError> {
    inspect_raw_path(root)?;
    let canonical = root
        .canonicalize()
        .map_err(|_| PathPolicyError::RootUnavailable)?;
    if canonical.is_dir() {
        Ok((root.to_path_buf(), canonical))
    } else {
        Err(PathPolicyError::RootIsNotDirectory)
    }
}

fn inspect_raw_path(path: &Path) -> Result<(), PathPolicyError> {
    let raw = path.as_os_str().to_string_lossy();
    if looks_like_foreign_platform_path(&raw) {
        return Err(PathPolicyError::ForeignPlatformPath);
    }
    if !path.is_absolute() {
        return Err(PathPolicyError::NonAbsolutePath);
    }

    for component in path.components() {
        match component {
            Component::ParentDir => return Err(PathPolicyError::Traversal),
            Component::Prefix(_) => return Err(PathPolicyError::ForeignPlatformPath),
            Component::RootDir | Component::CurDir | Component::Normal(_) => {}
        }
    }

    Ok(())
}

fn looks_like_foreign_platform_path(raw: &str) -> bool {
    let bytes = raw.as_bytes();
    let has_windows_drive_prefix = bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && matches!(bytes[2], b'\\' | b'/');
    let has_unc_prefix = raw.starts_with("\\\\") || raw.starts_with("//");

    has_windows_drive_prefix || has_unc_prefix || raw.contains('\0')
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestRoots {
        base: PathBuf,
        project: PathBuf,
        export: PathBuf,
        diagnostics: PathBuf,
        outside: PathBuf,
    }

    impl TestRoots {
        fn create() -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock must be after unix epoch")
                .as_nanos();
            let base = std::env::temp_dir().join(format!(
                "spectraform-path-policy-{}-{nonce}",
                std::process::id()
            ));
            let project = base.join("project");
            let export = base.join("export");
            let diagnostics = base.join("diagnostics");
            let outside = base.join("outside");
            for directory in [&project, &export, &diagnostics, &outside] {
                fs::create_dir_all(directory).expect("test root must be created");
            }
            fs::write(project.join("show.yaml"), b"schema_version: 1\n")
                .expect("project fixture must be created");
            fs::write(outside.join("private.svg"), b"<svg/>\n")
                .expect("outside fixture must be created");

            Self {
                base,
                project,
                export,
                diagnostics,
                outside,
            }
        }

        fn policy(&self) -> CanonicalPathPolicy {
            CanonicalPathPolicy::new(&self.project, &self.export, &self.diagnostics)
                .expect("roots must be accepted")
        }
    }

    impl Drop for TestRoots {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.base).expect("temporary roots must be removable");
        }
    }

    #[test]
    fn accepts_existing_files_only_inside_the_selected_scope() {
        let roots = TestRoots::create();
        let approved = roots
            .policy()
            .authorize_existing(PathScope::Project, &roots.project.join("show.yaml"))
            .expect("project file must be approved");

        assert!(approved.starts_with(roots.project.canonicalize().expect("canonical root")));
    }

    #[test]
    fn rejects_traversal_before_touching_the_filesystem() {
        let roots = TestRoots::create();
        let result = roots.policy().authorize_existing(
            PathScope::Project,
            &roots.project.join("nested/../../outside/private.svg"),
        );

        assert_eq!(result, Err(PathPolicyError::Traversal));
    }

    #[test]
    fn rejects_paths_outside_the_approved_scope() {
        let roots = TestRoots::create();
        let result = roots
            .policy()
            .authorize_existing(PathScope::Project, &roots.outside.join("private.svg"));

        assert_eq!(result, Err(PathPolicyError::OutsideApprovedRoot));
    }

    #[test]
    fn rejects_windows_and_unc_paths_on_non_windows_hosts() {
        let roots = TestRoots::create();
        let policy = roots.policy();

        assert_eq!(
            policy.authorize_existing(PathScope::Project, Path::new(r"C:\Users\asset.svg")),
            Err(PathPolicyError::ForeignPlatformPath)
        );
        assert_eq!(
            policy.authorize_existing(PathScope::Project, Path::new(r"\\server\share\asset.svg")),
            Err(PathPolicyError::ForeignPlatformPath)
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_that_escape_an_approved_root() {
        use std::os::unix::fs::symlink;

        let roots = TestRoots::create();
        let escape = roots.project.join("escape.svg");
        symlink(roots.outside.join("private.svg"), &escape).expect("symlink must be created");

        assert_eq!(
            roots
                .policy()
                .authorize_existing(PathScope::Project, &escape),
            Err(PathPolicyError::SymlinkEscape)
        );
    }

    #[test]
    fn permits_new_outputs_only_below_a_canonical_export_parent() {
        let roots = TestRoots::create();
        let output = roots.export.join("render.mov");
        let approved = roots
            .policy()
            .authorize_new_file(PathScope::Export, &output)
            .expect("new export must be approved");

        assert_eq!(
            approved,
            roots
                .export
                .canonicalize()
                .expect("canonical export root")
                .join("render.mov")
        );
    }

    #[cfg(unix)]
    #[test]
    fn rejects_new_outputs_below_a_symlink_escape() {
        use std::os::unix::fs::symlink;

        let roots = TestRoots::create();
        let escape = roots.export.join("escape");
        symlink(&roots.outside, &escape).expect("directory symlink must be created");
        let output = escape.join("render.mov");

        assert_eq!(
            roots
                .policy()
                .authorize_new_file(PathScope::Export, &output),
            Err(PathPolicyError::SymlinkEscape)
        );
    }
}
