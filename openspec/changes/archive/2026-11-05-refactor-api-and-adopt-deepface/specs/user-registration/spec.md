# Spec Delta

## MODIFIED Requirements

### Requirement: Require a valid single-face enrollment image
The system SHALL require a nonempty decodable JPEG or PNG image no larger than 5,242,880 bytes captured through the registration webcam UI. Enrollment SHALL use a separate Python DeepFace service over HTTP and require exactly one detected face. Invalid images SHALL NOT be stored as reference photos. AWS Rekognition SHALL NOT be used for enrollment detection.

#### Scenario: Valid face enrollment
- **WHEN** the submitted image is valid and DeepFace detects exactly one face
- **THEN** the system accepts the image for reference-photo storage

#### Scenario: Invalid or ambiguous image
- **WHEN** the image is missing, empty, oversized, undecodable, unsupported, or contains zero or multiple detected faces
- **THEN** the system rejects completion with a recapture or validation error and creates no account
- **AND** a decodable image with zero or multiple detected faces returns `INVALID_FACE` and HTTP 422

#### Scenario: DeepFace detection is unavailable or invalid
- **WHEN** the Python service is unavailable, unready, times out, fails inference, or returns a missing, negative, fractional, or otherwise invalid face count
- **THEN** the system returns `SERVICE_UNAVAILABLE` and HTTP 503 without creating an account or storing a reference photo

#### Scenario: Complete enrollment without AWS credentials
- **WHEN** valid profile details and a single-face image are submitted with healthy database, MinIO, and Python services and no AWS Rekognition credentials configured
- **THEN** enrollment can complete without contacting AWS Rekognition

### Requirement: Keep enrollment secrets private
The system SHALL NOT return passwords, password hashes, reference photos, storage locations, or provider metadata in registration responses. Reference photos SHALL NOT allow anonymous retrieval. Plaintext passwords and image contents SHALL NOT be persisted in either backend's application logs. Python SHALL receive only the image data required for detection and SHALL NOT persist enrollment uploads or receive profile, password, or storage credentials.

#### Scenario: Registration success response
- **WHEN** registration succeeds
- **THEN** the response confirms completion without returning secrets, storage identifiers, or authentication tokens

#### Scenario: Anonymous reference-photo access
- **WHEN** an unauthenticated client requests a stored reference photo directly from MinIO
- **THEN** storage denies the request

#### Scenario: Enrollment detection finishes
- **WHEN** Python completes or fails an enrollment detection request
- **THEN** the Python service retains no enrollment upload on disk or in logs
- **AND** any durable accepted reference is owned by the application's existing private storage flow
