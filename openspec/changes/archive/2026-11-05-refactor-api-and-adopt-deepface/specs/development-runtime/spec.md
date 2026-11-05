# Spec Delta

## Purpose

Provide one development entry point for operating the public backend and its private biometric worker together, with clear readiness and predictable process cleanup.

## ADDED Requirements

### Requirement: Start both backend services with one command
After documented dependencies and configuration are prepared, the repository SHALL provide one root development command that starts the public API and the Python biometric service without a second backend terminal. It SHALL work from PowerShell on the supported Windows development environment.

#### Scenario: Start the backend pair
- **WHEN** a developer runs the documented root development command with valid configuration and installed dependencies
- **THEN** both backend processes start and the command displays distinguishable logs for each service
- **AND** the developer does not need to start Python separately

#### Scenario: Missing runtime or invalid configuration
- **WHEN** the command encounters a missing Python runtime, missing dependencies, invalid configuration, or an occupied required port
- **THEN** it reports an actionable failure, exits with a nonzero status, and stops any child process it started

### Requirement: Report biometric readiness before claiming complete startup
The development command SHALL distinguish process startup from biometric readiness. It SHALL report the backend pair ready only after the biometric model and detector are initialized and the public API is reachable. Initialization failure or exceeding the documented startup deadline SHALL fail startup.

#### Scenario: Model initialization is in progress
- **WHEN** the Python process is running but its configured model or detector is not ready
- **THEN** the command reports startup as pending and does not announce the backend pair as ready

#### Scenario: Both services are ready
- **WHEN** biometric initialization completes and the public API accepts connections before the startup deadline
- **THEN** the command reports successful startup and the public API address

#### Scenario: Model initialization fails or times out
- **WHEN** model initialization fails or does not finish before the startup deadline
- **THEN** the command reports failure, stops its child processes, and exits with a nonzero status

### Requirement: Supervise and stop both backend processes
The development command SHALL stop both services and their child processes on developer interruption. If either service terminates unexpectedly, the command SHALL stop the remaining service, report which service exited, and return a nonzero status.

#### Scenario: Developer stops development
- **WHEN** a developer interrupts the development command with Ctrl+C
- **THEN** both backend processes and their descendants terminate and release their listening ports

#### Scenario: A service exits unexpectedly
- **WHEN** either backend service terminates after startup without a developer stop request
- **THEN** the command identifies the failed service, stops the other service, and exits with a nonzero status

### Requirement: Keep biometric processing behind the public API
The browser SHALL send registration and login requests only to the public API. The public API SHALL call the Python biometric service over HTTP. Local development SHALL bind the biometric service to loopback by default and SHALL NOT require browser configuration for its address.

#### Scenario: Complete a browser face verification
- **WHEN** a user submits an enrollment or login capture from the browser
- **THEN** the browser sends the capture to the public API and the public API sends image data to the biometric service
- **AND** the browser receives only the existing application response contract

#### Scenario: Default local worker address
- **WHEN** a developer starts the biometric service using the documented default configuration
- **THEN** it listens only on a loopback address and the frontend requires no worker URL
