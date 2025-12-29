# Ad-Shield Hosts Generator

This repository contains a tool to automatically generate and update a `hosts` file for blocking Ad-Shield related domains.

## Overview

The main script analyzes obfuscated Ad-Shield scripts to extract delivery domains. These domains are then formatted into a standard `hosts` file structure (`0.0.0.0 domain`) to be used as a blocklist for advertisements and tracking.

## Repository Structure

- **`index.js`**: The core logic for domain extraction. It fetches the script, deobfuscates it, traverses the AST to find specific patterns, and outputs the found domains.
- **`hosts`**: The generated blocklist file containing the extracted domains.
- **`.github/workflows/generate.yml`**: A GitHub Actions workflow that runs periodically to update the `hosts` file and commit changes automatically.
- **`package.json`**: Defines the project dependencies.

## Usage

To generate the list locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the script:
   ```bash
   node index.js
   ```

## Automation

The project includes a GitHub Action (`generate.yml`) that:
- Runs every hour.
- Executes the generation script.
- Updates and sorts the `hosts` file.
- Commits and pushes any changes to the repository.
