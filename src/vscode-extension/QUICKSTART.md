# 🚀 Quick Start - Test the Extension in 30 Seconds!

## Step 1: Open This Folder in VSCode

```bash
code /Users/darren/dev/workflow/src/vscode-extension
```

## Step 2: Press F5

This will:
1. Build the extension
2. Launch a new VSCode window with the extension loaded

## Step 3: Open the Test Files

In the **new VSCode window** that opened, you'll see two test files:

### ✅ `test.workflow.yaml` - Valid Workflow
Open this file - it should have **no errors** (green, clean!)

### ❌ `test-invalid.workflow.yaml` - Invalid Workflow
Open this file - you should see **3 red error squiggles**:
1. Missing `metadata.name`
2. Task missing `taskRef`
3. Task missing `id`

Hover over the red squiggles to see the error messages!

## What to Try:

### Test Real-Time Validation:

1. Open `test.workflow.yaml`
2. Delete the line `name: user-signup`
3. **Watch**: Red squiggle appears immediately!
4. Add it back - squiggle disappears!

### Test YAML Parsing:

1. Add invalid YAML syntax (e.g., `bad: [ unclosed`)
2. **Watch**: Parse error appears!

### Test Task Validation:

1. Remove `id:` from a task
2. **Watch**: "Task must have an id" error!

## Expected Behavior:

✅ **Real-time validation** - Errors appear as you type  
✅ **Red squiggly lines** under problems  
✅ **Hover tooltips** showing error messages  
✅ **Problems panel** (Ctrl+Shift+M) lists all errors  

## Debugging:

If something doesn't work:
1. Check the Debug Console in the **original** VSCode window
2. Look for "Workflow Language Server initialized!" message
3. Check for any error messages

## Graph Visualization:

Want to see a visual graph of your workflow?

1. Open `test.workflow.yaml`
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Show Workflow Graph" and press Enter
4. A new panel opens showing the workflow graph with:
   - Task nodes
   - Dependency arrows
   - Parallel tasks highlighted
   - Auto-layout with ReactFlow

## Next Steps:

Try creating your own workflow file:
```bash
touch my-workflow.workflow.yaml
```

Start typing and watch the magic happen! ✨
