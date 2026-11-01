# Spec Delta

## Purpose

Let users register profile details and a webcam reference photo that can later be used to verify their face during login.

## ADDED Requirements

### Requirement: Validate registration details before face capture
The system SHALL validate email, password, first name, last name, and birth date before advancing registration. Email SHALL be trimmed and case-normalized; names SHALL be trimmed and contain 1-100 characters; passwords SHALL contain 8-128 characters without trimming; birth dates SHALL be real past dates in YYYY-MM-DD format. Unknown fields SHALL be rejected.

#### Scenario: Valid details advance registration
- **WHEN** all required details satisfy validation and the normalized email is not registered
- **THEN** the system allows the webcam step without creating an account or storing the password

#### Scenario: Invalid details remain on the first step
- **WHEN** a required field is missing, malformed, out of bounds, or accompanied by an unknown field
- **THEN** the system returns field validation errors and does not advance registration

#### Scenario: Duplicate normalized email
- **WHEN** registration uses an email already registered, including case or surrounding whitespace variations
- **THEN** the system rejects registration as an email conflict without changing that account

### Requirement: Require a valid single-face enrollment image
The system SHALL require a nonempty decodable JPEG or PNG image no larger than 5,242,880 bytes captured through the registration webcam UI. Enrollment SHALL require exactly one detected face. Invalid images SHALL NOT be stored as reference photos.

#### Scenario: Valid face enrollment
- **WHEN** the submitted image is valid and contains exactly one detected face
- **THEN** the system accepts the image for reference-photo storage

#### Scenario: Invalid or ambiguous image
- **WHEN** the image is missing, empty, oversized, undecodable, unsupported, or contains zero or multiple detected faces
- **THEN** the system rejects completion with a recapture or validation error and creates no account

### Requirement: Complete account and reference-photo enrollment together
The system SHALL revalidate all submitted profile fields and email uniqueness when completing registration, persist a salted password hash and profile, and store the reference photo privately in local MinIO. Registration SHALL succeed only after both the account and photo are durable. The final write SHALL enforce email uniqueness independently of the first step.

#### Scenario: Completed registration survives restart
- **WHEN** valid details and a valid face are submitted and both storage operations succeed
- **THEN** the system confirms registration and the account remains available after application restart

#### Scenario: Incomplete registration
- **WHEN** the user abandons registration before final submission
- **THEN** no account or reference photo is created

#### Scenario: Email becomes unavailable after the first step
- **WHEN** another completed registration claims the same normalized email before final completion
- **THEN** the system rejects the later completion without replacing the existing profile or photo

#### Scenario: Registration dependency failure
- **WHEN** face validation, photo storage, or database persistence fails
- **THEN** the system returns a retryable service error without reporting registration success or exposing a partially created account to login
- **AND** an uploaded photo without a committed account is removed, or its failed cleanup is recorded for operator retry

### Requirement: Keep enrollment secrets private
The system SHALL NOT return passwords, password hashes, reference photos, storage locations, or provider metadata in registration responses. Reference photos SHALL NOT allow anonymous retrieval. Plaintext passwords and image contents SHALL NOT be persisted in application logs.

#### Scenario: Registration success response
- **WHEN** registration succeeds
- **THEN** the response confirms completion without returning secrets, storage identifiers, or authentication tokens

#### Scenario: Anonymous reference-photo access
- **WHEN** an unauthenticated client requests a stored reference photo directly from MinIO
- **THEN** storage denies the request
