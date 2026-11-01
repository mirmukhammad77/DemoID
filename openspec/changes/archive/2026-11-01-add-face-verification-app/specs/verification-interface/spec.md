# Spec Delta

## Purpose

Provide a minimal browser interface for registering a reference face and completing credential-first webcam login with clear progress and errors.

## ADDED Requirements

### Requirement: Present two-step registration
The interface SHALL present email, password, first name, last name, and birth date on registration step one. It SHALL enable step two only after backend validation succeeds, show webcam capture and confirmation there, and confirm completed registration with navigation to login. Returning to edit details SHALL require validation again before submission.

#### Scenario: Registration progression
- **WHEN** valid profile details pass backend validation
- **THEN** the interface displays the webcam enrollment step

#### Scenario: Registration validation errors
- **WHEN** the backend rejects registration details
- **THEN** the interface remains on step one and displays the relevant field or email-conflict errors

#### Scenario: Registration completes
- **WHEN** the backend confirms successful enrollment
- **THEN** the interface clears registration secrets and provides a way to open login

### Requirement: Present credential-first login
The interface SHALL initially show only email and password entry for login. It SHALL enable webcam verification only after those credentials pass backend validation and SHALL show only the returned profile after successful face verification. It SHALL provide no dashboard or other account features.

#### Scenario: Invalid credentials block the next step
- **WHEN** the backend rejects the submitted credentials
- **THEN** the interface remains on the credentials step, displays a generic error, and does not activate the camera

#### Scenario: Valid credentials open capture
- **WHEN** the backend confirms valid credentials
- **THEN** the interface opens the login webcam step without displaying profile details

#### Scenario: Verified profile display
- **WHEN** the face-verification endpoint returns a profile
- **THEN** the interface displays its email, first name, last name, birth date, and identifier without additional account features

### Requirement: Capture photos exclusively through the webcam UI
The interface SHALL request camera permission only on an active capture step, show a live preview, capture a still image, and allow retaking it before submission. It SHALL NOT provide a file picker. It SHALL stop all camera tracks when capture ends or the user leaves the step.

#### Scenario: Capture and retake
- **WHEN** the user captures a photo and then chooses retake
- **THEN** the interface replaces the prior capture with a new webcam capture before submission

#### Scenario: Camera cannot start
- **WHEN** camera access is denied, no device exists, the device is busy, or the browser cannot access it
- **THEN** the interface shows an actionable camera error and prevents submission without a photo

#### Scenario: Leaving the camera step
- **WHEN** the user leaves capture, switches flows, or finishes submitting the capture
- **THEN** the interface stops its camera tracks

### Requirement: Allow understandable verification retries
The interface SHALL prevent duplicate submissions while a request is pending, show pending state, and distinguish validation, mismatch, and service-unavailable errors. Failed face attempts SHALL display no profile and SHALL allow recapture or return to credentials. A credential rejection during face submission SHALL reset the login flow to step one.

#### Scenario: Face mismatch or invalid capture
- **WHEN** the backend rejects the captured face
- **THEN** the interface displays the error without a profile and offers a new capture

#### Scenario: Service unavailable
- **WHEN** registration or login encounters a dependency failure
- **THEN** the interface shows a retry message without claiming registration or login succeeded

#### Scenario: Credentials rejected on final submission
- **WHEN** the face-verification endpoint rejects the resubmitted credentials
- **THEN** the interface clears the capture and returns to credential entry

### Requirement: Keep flow data in volatile browser state
The interface SHALL keep passwords, captures, and returned profile details only in memory during the active flow. It SHALL NOT save them to browser persistent storage or URLs. Refreshing or restarting a flow SHALL clear the displayed profile and credentials and require starting again.

#### Scenario: Reload after successful verification
- **WHEN** the user reloads the page after viewing a profile
- **THEN** the interface returns to an unauthenticated entry screen without restoring the profile or credentials

#### Scenario: Switching or restarting flows
- **WHEN** the user leaves or restarts registration or login
- **THEN** the interface clears the previous flow's password, image, and profile state
