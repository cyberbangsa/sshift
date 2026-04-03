use crate::domain::entities::{FileEntry, FileEntryType};
use crate::domain::repositories::{MockFileRepository, RepositoryError};
use crate::domain::usecases::ListFiles;
use chrono::Utc;
use std::sync::Arc;

fn test_entries() -> Vec<FileEntry> {
    vec![
        FileEntry {
            name: "readme.md".to_string(),
            path: "/readme.md".to_string(),
            entry_type: FileEntryType::File,
            size: 1024,
            permissions: "644".to_string(),
            modified_at: Utc::now(),
        },
        FileEntry {
            name: "src".to_string(),
            path: "/src".to_string(),
            entry_type: FileEntryType::Directory,
            size: 0,
            permissions: "755".to_string(),
            modified_at: Utc::now(),
        },
        FileEntry {
            name: "docs".to_string(),
            path: "/docs".to_string(),
            entry_type: FileEntryType::Directory,
            size: 0,
            permissions: "755".to_string(),
            modified_at: Utc::now(),
        },
    ]
}

#[tokio::test]
async fn test_list_files_sorts_directories_first() {
    let mut mock_repo = MockFileRepository::new();
    mock_repo
        .expect_list_directory()
        .returning(|_, _| Ok(test_entries()));

    let use_case = ListFiles::new(Arc::new(mock_repo));
    let result = use_case.execute("session-1", "/").await;

    assert!(result.is_ok());
    let entries = result.unwrap();

    // Directories first, then files, both alphabetically
    assert_eq!(entries[0].name, "docs");
    assert_eq!(entries[0].entry_type, FileEntryType::Directory);
    assert_eq!(entries[1].name, "src");
    assert_eq!(entries[1].entry_type, FileEntryType::Directory);
    assert_eq!(entries[2].name, "readme.md");
    assert_eq!(entries[2].entry_type, FileEntryType::File);
}

#[tokio::test]
async fn test_list_files_handles_error() {
    let mut mock_repo = MockFileRepository::new();
    mock_repo
        .expect_list_directory()
        .returning(|_, _| Err(RepositoryError::FileOperationFailed("Permission denied".to_string())));

    let use_case = ListFiles::new(Arc::new(mock_repo));
    let result = use_case.execute("session-1", "/root").await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_list_files_empty_directory() {
    let mut mock_repo = MockFileRepository::new();
    mock_repo
        .expect_list_directory()
        .returning(|_, _| Ok(Vec::new()));

    let use_case = ListFiles::new(Arc::new(mock_repo));
    let result = use_case.execute("session-1", "/empty").await;

    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}
