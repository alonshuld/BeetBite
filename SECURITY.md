# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository.
Include what you found, how to reproduce it, and the impact you expect.

You can expect an acknowledgement within 5 working days and a status update within 14 days.

## Supported versions

Only the latest commit on `main` is supported. Fixes land on `main` and ship through the normal deploy.

## Scope

In scope: the backend API, the frontend, the Docker images, and the infrastructure code in this repository.
Out of scope: social engineering, denial-of-service, and findings that need a compromised admin account.

## Secrets

No credentials belong in this repository. If you spot one, report it as above so it can be rotated.
