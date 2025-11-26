# Workflow YAML VSCode Extension

Language support for Workflow YAML files with real-time validation and auto-completion.

## Features

- ✅ **Real-time YAML validation** - Errors show up as you type
- ✅ **Schema validation** - Validates workflow and task structure
- ✅ **Error diagnostics** - Red squiggly lines under errors
- 🚧 **Auto-completion** (Coming soon)
- 🚧 **Hover tooltips** (Coming soon)

## How to Test

### Option 1: Run in Development Mode

1. Open this directory in VSCode:
   ```bash
   code /Users/darren/dev/workflow/src/vscode-extension
   ```

2. Press `F5` to launch the Extension Development Host

3. In the new window, create a test file:
   ```bash
   touch test.workflow.yaml
   ```

4. Add some workflow YAML and see validation in action!

### Option 2: Package and Install

1. Install vsce (VSCode Extension packager):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the `.vsix` file:
   - Open VSCode
   - Go to Extensions
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

## Example Workflow YAML

Try this in a `.workflow.yaml` file:

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: user-signup
spec:
  input:
    userId:
      type: string
      required: true
  tasks:
    - id: fetch-user
      taskRef: get-user-data
      input:
        userId: "{{input.userId}}"
    
    - id: send-email
      taskRef: send-welcome-email
      dependsOn: [fetch-user]
      input:
        email: "{{tasks.fetch-user.output.email}}"
```

**What the Extension Validates:**

- ✅ `metadata.name` is required
- ✅ `spec.tasks` must be an array
- ✅ Each task must have `id` and `taskRef`
- ❌ Missing `metadata.name` → Error!
- ❌ Task without `id` → Error!

## Development

```bash
# Build
pnpm run compile

# Watch mode (auto-rebuild)
pnpm run watch

# Clean
pnpm run clean
```

## Architecture

```
vscode-extension/
├── client/          # VSCode extension client (UI process)
│   └── src/
│       └── extension.ts
├── server/          # Language Server (validation logic)
│   └── src/
│       └── server.ts
└── package.json     # Extension manifest
```

**Client**: Handles VSCode activation and starts the language server

**Server**: Performs YAML parsing, validation, and sends diagnostics to VSCode
