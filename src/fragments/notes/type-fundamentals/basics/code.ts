export const psScript = `
# Enable advanced parameter binding and metadata support
[CmdletBinding()]
param (
    # Name of the project directory to create and initialize
    [Parameter(Mandatory)]
    [string]
    $ProjectName
)

# Build the full path to the new project directory
$projectPath = Join-Path -Path (Get-Location) -ChildPath $ProjectName

# Create the project directory if it doesn't exist
if (-not (Test-Path -Path $projectPath)) {
    New-Item -Path $projectPath -ItemType Directory | Out-Null
} else {
    Write-Warning "Directory '$ProjectName' already exists. Reusing it."
}

# Change into the project directory
Push-Location -Path $projectPath
try {
    # Run Gradle to initialize a basic Kotlin application project
    & gradle init --use-defaults --type kotlin-application
} finally {
    # Return to the original directory after initialization
    Pop-Location
}
`;

export const bashScript = `
#!/usr/bin/env bash
set -euo pipefail  # Exit on error, unset vars, or failed pipe

# Require exactly one argument (project name)
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <ProjectName>" >&2
    exit 1
fi

PROJECT_NAME=$1
PROJECT_PATH="\${PWD}/\${PROJECT_NAME}"

# Create project directory if it doesn't exist
if [[ ! -d $PROJECT_PATH ]]; then
    mkdir -p "$PROJECT_PATH"
else
    echo "Warning: Directory '$PROJECT_NAME' already exists. Reusing it." >&2
fi

# Change into project directory and initialize Kotlin app with Gradle
# This creates a subshell to isolate the directory change
(
    cd "$PROJECT_PATH"
    gradle init --use-defaults --type kotlin-application
)
`;
