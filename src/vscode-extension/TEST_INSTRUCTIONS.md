# How to Test the Graph Visualization

## Step-by-Step Instructions:

### 1. **Close the Extension Development Host** (if it's open)
   - Close any extra VSCode windows that opened when you pressed F5

### 2. **In the ORIGINAL VSCode window** (where you're developing the extension):
   - Make sure you're in: `/Users/darren/dev/workflow/src/vscode-extension`
   - Press **F5** to launch the Extension Development Host
   - A new VSCode window will open

### 3. **In the NEW VSCode window** that just opened:

   #### Open the test workflow file:
   - Click "Open Folder" or File > Open
   - Navigate to: `/Users/darren/dev/workflow/src/vscode-extension`
   - Click "Open"

   #### Now you should see the file explorer with:
   - `test.workflow.yaml`
   - `test-invalid.workflow.yaml`
   - Other extension files

   #### Open the test workflow:
   - Click on `test.workflow.yaml` in the file explorer
   - The file should open showing the workflow YAML

### 4. **Activate the Command:**
   - Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux)
   - Type: `Workflow: Show Workflow Graph`
   - Press Enter

### 5. **Expected Result:**
   - A new panel opens on the right side
   - You should see a visual graph with:
     - 2 nodes: "fetch-user" and "send-email"
     - An arrow from fetch-user → send-email
     - ReactFlow controls (zoom buttons, fit view, etc.)

## Troubleshooting:

### If the command doesn't appear:
1. **IMPORTANT**: First open `test.workflow.yaml` in the editor - the extension needs a workflow file open to activate
2. Then press Cmd+Shift+P to open the command palette
3. Try typing just "graph" or "workflow" in the command palette
4. Check the Debug Console (original VSCode window) for errors
5. If still not working, reload the Extension Development Host window (Cmd+R or Ctrl+R)

### If you see an error:
- Check the Debug Console in the **original** VSCode window
- Look for error messages
- The extension might not have loaded correctly

### Alternative: Use the Command Palette Filter
- Press Cmd+Shift+P
- Type: `>Workflow`
- You should see "Workflow: Show Workflow Graph" in the list

## What You Should See:

```
┌─────────────────────────────────────────────────────────┐
│ test.workflow.yaml                 │  Workflow Graph    │
│                                    │                    │
│ apiVersion: workflow...            │   ┌──────────┐     │
│ kind: Workflow                     │   │fetch-user│     │
│ metadata:                          │   └─────┬────┘     │
│   name: user-signup                │         │          │
│ spec:                              │         ▼          │
│   tasks:                           │   ┌──────────┐     │
│     - id: fetch-user               │   │send-email│     │
│       ...                          │   └──────────┘     │
│                                    │                    │
│                                    │  [Zoom] [Fit View] │
└─────────────────────────────────────────────────────────┘
```

The graph should be interactive - you can zoom and pan!
