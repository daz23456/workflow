export interface Snippet {
  prefix: string;
  label: string;
  body: string;
  description: string;
}

const SNIPPETS: Snippet[] = [
  {
    prefix: 'workflow',
    label: 'Workflow',
    description: 'Create a new workflow resource',
    body: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: \${1:my-workflow}
  labels:
    app: \${2:my-app}
spec:
  description: "\${3:Workflow description}"
  input:
    type: object
    properties:
      \${4:inputField}:
        type: string
  tasks:
    - id: \${5:first-task}
      taskRef: \${6:task-name}
      input:
        \${7:param}: "{{input.\${4:inputField}}}"
  output:
    \${8:result}: "{{tasks.\${5:first-task}.output}}"`,
  },
  {
    prefix: 'task',
    label: 'Task Step',
    description: 'Add a task step to a workflow',
    body: `- id: \${1:task-id}
  taskRef: \${2:task-name}
  input:
    \${3:param}: "\${4:value}"`,
  },
  {
    prefix: 'workflowtask',
    label: 'WorkflowTask',
    description: 'Create a new WorkflowTask resource',
    body: `apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: \${1:my-task}
  labels:
    app: \${2:my-app}
spec:
  type: http
  http:
    url: "\${3:https://api.example.com/endpoint}"
    method: \${4|GET,POST,PUT,DELETE|}
    headers:
      Content-Type: application/json
  input:
    type: object
    properties:
      \${5:inputField}:
        type: string
  output:
    type: object
    properties:
      \${6:outputField}:
        type: string`,
  },
  {
    prefix: 'foreach',
    label: 'ForEach Loop',
    description: 'Add a forEach loop to iterate over a collection',
    body: `- id: \${1:loop-task}
  taskRef: \${2:task-name}
  forEach:
    collection: "{{tasks.\${3:previous-task}.output.\${4:items}}}"
    itemVar: item
  input:
    \${5:param}: "{{forEach.item}}"`,
  },
  {
    prefix: 'condition',
    label: 'Conditional Task',
    description: 'Add a task with a condition',
    body: `- id: \${1:conditional-task}
  taskRef: \${2:task-name}
  condition: "{{tasks.\${3:check-task}.output.\${4:shouldRun} == true}}"
  input:
    \${5:param}: "\${6:value}"`,
  },
  {
    prefix: 'trigger-cron',
    label: 'Schedule Trigger',
    description: 'Add a cron schedule trigger to a workflow',
    body: `triggers:
  - type: schedule
    schedule:
      cron: "\${1:0 */5 * * * *}"
      timezone: "\${2:UTC}"`,
  },
  {
    prefix: 'dependson',
    label: 'Dependencies',
    description: 'Add task dependencies',
    body: `dependsOn:
  - \${1:task-id-1}
  - \${2:task-id-2}`,
  },
  {
    prefix: 'input-schema',
    label: 'Input Schema',
    description: 'Define workflow input schema',
    body: `input:
  type: object
  properties:
    \${1:fieldName}:
      type: \${2|string,number,boolean,object,array|}
      description: "\${3:Field description}"
  required:
    - \${1:fieldName}`,
  },
  {
    prefix: 'output',
    label: 'Output Mapping',
    description: 'Define workflow output mapping',
    body: `output:
  \${1:resultField}: "{{tasks.\${2:task-id}.output.\${3:field}}}"`,
  },
  {
    prefix: 'task-with-deps',
    label: 'Task with Dependencies',
    description: 'Add a task that depends on other tasks',
    body: `- id: \${1:task-id}
  taskRef: \${2:task-name}
  dependsOn:
    - \${3:previous-task}
  input:
    \${4:param}: "{{tasks.\${3:previous-task}.output.\${5:field}}}"`,
  },
  {
    prefix: 'parallel-tasks',
    label: 'Parallel Tasks',
    description: 'Add multiple tasks that run in parallel',
    body: `- id: \${1:task-a}
  taskRef: \${2:task-name-a}
  input:
    param: "\${3:value-a}"
- id: \${4:task-b}
  taskRef: \${5:task-name-b}
  input:
    param: "\${6:value-b}"
- id: \${7:aggregator}
  taskRef: \${8:aggregate-task}
  dependsOn:
    - \${1:task-a}
    - \${4:task-b}
  input:
    resultA: "{{tasks.\${1:task-a}.output}}"
    resultB: "{{tasks.\${4:task-b}.output}}"`,
  },
  {
    prefix: 'http-task',
    label: 'HTTP Task Definition',
    description: 'Create an HTTP task with full configuration',
    body: `apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: \${1:http-task}
spec:
  type: http
  http:
    url: "\${2:https://api.example.com}"
    method: \${3|GET,POST,PUT,PATCH,DELETE|}
    headers:
      Content-Type: application/json
      Authorization: "Bearer {{input.token}}"
    body: |
      {
        "\${4:field}": "{{input.\${5:value}}}"
      }
    timeout: \${6:30s}
    retryPolicy:
      maxRetries: \${7:3}
      backoff: exponential`,
  },
];

export class SnippetProvider {
  getSnippets(): Snippet[] {
    return SNIPPETS;
  }

  getSnippetByPrefix(prefix: string): Snippet | null {
    return SNIPPETS.find(s => s.prefix === prefix) || null;
  }
}
