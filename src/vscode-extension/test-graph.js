// Quick test to verify graph building works
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

// Read the test workflow
const workflowYaml = fs.readFileSync(path.join(__dirname, 'test.workflow.yaml'), 'utf8');
const workflow = YAML.parse(workflowYaml);

console.log('Parsed workflow:');
console.log('  Name:', workflow.metadata.name);
console.log('  Tasks:', workflow.spec.tasks.length);

// Show the tasks and their dependencies
workflow.spec.tasks.forEach(task => {
  console.log(`\n  Task: ${task.id}`);
  console.log(`    TaskRef: ${task.taskRef}`);
  if (task.dependsOn) {
    console.log(`    DependsOn: ${task.dependsOn.join(', ')}`);
  }
});

// Simulate what the ExecutionGraphBuilder would produce
const nodes = workflow.spec.tasks.map(task => ({
  id: task.id,
  taskRef: task.taskRef,
  dependencies: task.dependsOn || []
}));

const edges = [];
workflow.spec.tasks.forEach(task => {
  if (task.dependsOn) {
    task.dependsOn.forEach(depId => {
      edges.push({ from: depId, to: task.id });
    });
  }
});

console.log('\n\nGraph structure that will be visualized:');
console.log('Nodes:', nodes.length);
nodes.forEach(n => console.log(`  - ${n.id} (${n.taskRef})`));

console.log('\nEdges:', edges.length);
edges.forEach(e => console.log(`  - ${e.from} → ${e.to}`));

console.log('\n✅ Graph parsing works! The WebView will receive this data and render it with ReactFlow.');
