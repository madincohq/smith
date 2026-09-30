# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `File`, `Directory` and `Symlink` models for working with paths from a command
- Symlinks that can be created safely: linking twice is fine, and existing entries are never overwritten
- `files()`, `folders()` and `symlinks()` queries on a directory, with filters by extension, contained file, broken link or target
- `Collection`, returned by queries, with helpers such as `pluck`, `reject` and `contains`
