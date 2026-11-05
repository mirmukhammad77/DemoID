# Spec Delta

## MODIFIED Requirements

### Requirement: Compare a single captured face to the enrolled reference
The system SHALL compare the stored enrollment image with a valid fresh webcam JPEG or PNG no larger than 5,242,880 bytes through a separate Python DeepFace service over HTTP. Login SHALL succeed only when both images contain exactly one detected face and a finite comparison distance is at or below the server-selected model-specific distance threshold. AWS Rekognition and its 0-100 similarity threshold SHALL NOT be used.

#### Scenario: Matching face
- **WHEN** valid credentials identify an account and the single captured face has a distance at or below the configured threshold against that account's single-face reference
- **THEN** face verification succeeds

#### Scenario: Face mismatch
- **WHEN** both images contain exactly one face but their comparison distance exceeds the configured threshold
- **THEN** login fails with `FACE_MISMATCH` and HTTP 401 without returning any profile fields

#### Scenario: Invalid or ambiguous capture
- **WHEN** the image is missing, empty, oversized, undecodable, unsupported, or contains no face or multiple detected faces
- **THEN** the system rejects verification without returning the profile and allows a new capture
- **AND** a decodable capture with zero or multiple detected faces returns `INVALID_FACE` and HTTP 422

#### Scenario: Stored reference cannot provide one usable face
- **WHEN** valid credentials identify an account whose stored reference contains zero or multiple detected faces under the configured detector
- **THEN** the system returns `SERVICE_UNAVAILABLE` and HTTP 503 without returning any profile fields

#### Scenario: A caller attempts to change comparison policy
- **WHEN** a browser submits model, detector, metric, threshold, or other additional fields with its face-verification request
- **THEN** the public API rejects the unknown fields and does not apply a caller-selected comparison policy

### Requirement: Fail closed on dependency errors
The system SHALL NOT report login success when the reference photo is unavailable or MinIO, the account database, or the Python biometric service fails. Dependency failures SHALL be distinguishable from mismatches through a stable service-unavailable response without raw provider diagnostics or secrets. Missing, malformed, non-finite, or inconsistent biometric results SHALL be treated as dependency failures.

#### Scenario: Reference image unavailable
- **WHEN** valid credentials identify an account whose reference photo cannot be retrieved
- **THEN** the system returns a service-unavailable response without exposing profile details

#### Scenario: AWS failure
- **WHEN** AWS Rekognition is unavailable or AWS credentials are absent, while the account database, MinIO reference, and Python biometric service are healthy
- **THEN** face verification is determined by the local DeepFace result without contacting AWS Rekognition or treating its unavailability as an application dependency failure

#### Scenario: Python biometric service failure
- **WHEN** the Python service is unavailable, unready, times out, rejects the internal request, or fails during inference
- **THEN** the system returns `SERVICE_UNAVAILABLE` and HTTP 503 and does not treat the failure as a match

#### Scenario: Invalid comparison response
- **WHEN** the Python response has missing fields, invalid face counts, a non-finite distance or threshold, or a verification flag inconsistent with its distance and threshold
- **THEN** the system returns `SERVICE_UNAVAILABLE` and HTTP 503 without returning a profile or provider diagnostics

### Requirement: Keep login captures transient
The system SHALL use login photo bytes only for the current verification attempt and SHALL NOT persist them in MinIO, the database, temporary upload files, or application logs in either backend service. Plaintext login credentials SHALL NOT be persisted in application logs or sent to the Python biometric service.

#### Scenario: Verification attempt completes
- **WHEN** a login verification attempt succeeds or fails
- **THEN** neither backend retains the login image and the enrollment reference remains unchanged

#### Scenario: Send a comparison request to Python
- **WHEN** the public API asks Python to compare a capture with its stored reference
- **THEN** it sends image data without the account's email, password, profile, or storage credentials
