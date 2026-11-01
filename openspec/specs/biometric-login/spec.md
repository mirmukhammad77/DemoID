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
The system SHALL compare the stored enrollment image with a valid fresh webcam JPEG or PNG no larger than 5,242,880 bytes using AWS Rekognition CompareFaces. Login SHALL succeed only when the target contains exactly one detected face and its returned similarity meets the server-configured threshold. The default threshold SHALL be 95 on the 0-100 similarity scale.

#### Scenario: Matching face
- **WHEN** valid credentials identify an account and the single captured face meets or exceeds the configured threshold against that account's reference
- **THEN** face verification succeeds

#### Scenario: Face mismatch
- **WHEN** the captured face has no returned match meeting the configured threshold
- **THEN** login fails without returning any profile fields

#### Scenario: Invalid or ambiguous capture
- **WHEN** the image is missing, empty, oversized, undecodable, unsupported, or contains no face or multiple detected faces
- **THEN** the system rejects verification without returning the profile and allows a new capture

### Requirement: Return a profile only after both checks succeed
Successful face verification SHALL return exactly id, email, firstName, lastName, and birthDate for the verified account. It SHALL NOT return passwords, hashes, reference photos, object keys, similarity scores, provider metadata, session tokens, or access tokens, and SHALL NOT create authentication cookies or a server-side login session.

#### Scenario: Profile-only success
- **WHEN** both credential validation and face comparison succeed
- **THEN** the response contains exactly the verified account's five profile fields and establishes no authenticated session

#### Scenario: Failed verification
- **WHEN** either credential validation or face comparison fails
- **THEN** the response contains no profile fields

### Requirement: Fail closed on dependency errors
The system SHALL NOT report login success when the reference photo is unavailable or MinIO, the account database, or AWS Rekognition fails. Dependency failures SHALL be distinguishable from mismatches through a stable service-unavailable response without raw provider diagnostics or secrets.

#### Scenario: Reference image unavailable
- **WHEN** valid credentials identify an account whose reference photo cannot be retrieved
- **THEN** the system returns a service-unavailable response without exposing profile details

#### Scenario: AWS failure
- **WHEN** Rekognition is unavailable, times out, throttles, or denies access
- **THEN** the system returns a service-unavailable response and does not treat the failure as a match

### Requirement: Keep login captures transient
The system SHALL use login photo bytes only for the current verification attempt and SHALL NOT persist them in MinIO, the database, or application logs. Plaintext login credentials SHALL NOT be persisted in application logs.

#### Scenario: Verification attempt completes
- **WHEN** a login verification attempt succeeds or fails
- **THEN** no login image is retained by the application and the enrollment reference remains unchanged
