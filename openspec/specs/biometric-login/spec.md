# biometric-login Specification

## Purpose

Verify a returning user's password and enrolled face before returning their profile, without establishing an authenticated session.

## Requirements

### Requirement: Validate credentials before enabling face verification
The system SHALL validate normalized email and password against a completed registration before enabling the login webcam step. The first login step SHALL return only confirmation that face verification can proceed, without profile details, tokens, or authentication cookies.

#### Scenario: Correct credentials
- **WHEN** a registered user submits the correct email and password
- **THEN** the system permits progression to face verification without returning a profile or creating a session

#### Scenario: Invalid credentials
- **WHEN** the email is unknown or the password is incorrect
- **THEN** the system returns the same generic invalid-credentials response and does not initiate biometric or reference-storage calls

### Requirement: Enforce credentials again on face submission
The face-verification endpoint SHALL require email, password, and the captured photo, and SHALL revalidate credentials before retrieving the reference image or making biometric calls. A prior UI step or client-supplied user identifier SHALL NOT authorize verification. Only the account resolved from valid credentials SHALL determine the reference photo.

#### Scenario: Direct face submission without valid credentials
- **WHEN** a client calls face verification directly with missing or incorrect credentials
- **THEN** the request fails without retrieving a reference photo, making biometric calls, or returning profile details

#### Scenario: Attempt to select another user's reference
- **WHEN** a face submission includes an additional user identifier or storage key
- **THEN** the system rejects the unknown field and does not select a reference from client-supplied identifiers

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

### Requirement: Return a profile only after both checks succeed
Successful face verification SHALL return exactly id, email, firstName, lastName, and birthDate for the verified account. It SHALL NOT return passwords, hashes, reference photos, object keys, similarity scores, provider metadata, session tokens, or access tokens, and SHALL NOT create authentication cookies or a server-side login session.

#### Scenario: Profile-only success
- **WHEN** both credential validation and face comparison succeed
- **THEN** the response contains exactly the verified account's five profile fields and establishes no authenticated session

#### Scenario: Failed verification
- **WHEN** either credential validation or face comparison fails
- **THEN** the response contains no profile fields

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
