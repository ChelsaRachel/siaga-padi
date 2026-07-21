---
name: python-virtual-environment
description: "Virtual environment rules for Python projects. Load when setting up a new project or installing external Python libraries."
---

# Virtual Environment

## Overview

This rule instructs the AI to always create and utilize a new virtual environment when installing libraries or setting up dependencies for a project.

## Rules

- **Create Virtual Environment**: When setting up a new project or installing external Python libraries, you MUST create a new virtual environment. Use standard tools such as `python -m venv venv` or `python3 -m venv venv` at the root of the project directory.
- **Activate Before Installation**: Before executing any package manager commands like `pip install`, ensure that the newly created virtual environment is activated.
- **Strict Isolation**: Do not install dependencies globally. All project-specific libraries must reside within the isolated virtual environment to prevent conflicts.
- **Version Control Exclusions**: Ensure that the virtual environment directory (e.g., `venv/`, `.venv/`) is ignored in version control by verifying or adding it to the project's `.gitignore` file.
