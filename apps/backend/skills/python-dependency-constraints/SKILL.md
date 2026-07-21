---
name: python-dependency-constraints
description: "Dependency constraints for Python backend code, specifically regarding the use of boilerplates. Load when installing libraries or setting up dependencies."
---

# Dependency Constraints

## Overview

This rule defines the dependency constraints for Python backend code, specifically regarding the use of boilerplates.

## Rules

- **No Additional Installations for Boilerplate Code**: When implementing, copying, or utilizing code from the `be-python` boilerplate (`.ai/boilerplates/be-python`), **DO NOT** install any additional external libraries or dependencies that are not already present in the project's existing dependency configuration.
- The provided boilerplate code is designed to run with the standard library and the core dependencies already defined for the project (such as those in `.ai/boilerplates/be-python/requirements.txt`).
- If a boilerplate implementation seems to require a new library, adjust the implementation to use existing tools, standard libraries, or already installed dependencies. Do not run `pip install`, `poetry add`, or any other package manager commands to add new dependencies for boilerplate code.
- **New Features Allowed**: You may add new dependencies if they are strictly required for a completely new feature (not derived from the provided boilerplate code). If you add a new dependency, you MUST document and append it to the project's `requirements.txt` file.
