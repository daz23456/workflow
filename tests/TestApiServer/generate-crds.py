#!/usr/bin/env python3
"""Generate WorkflowTask CRDs from OpenAPI spec."""
import json
import os
import re
import urllib.request

def to_task_name(operation_id):
    """Convert operationId to task name (lowercase)."""
    return operation_id.lower()

def generate_crd(operation_id, method, path, operation):
    """Generate a WorkflowTask CRD for an operation."""
    task_name = to_task_name(operation_id)

    crd = f"""apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: {task_name}
  namespace: test
  labels:
    workflow.io/generated-from: openapi
    workflow.io/operation-id: {operation_id}
  annotations:
    workflow.io/source-path: {path}
spec:
  type: http
  http:
    url: "http://localhost:5100{path}"
    method: {method.upper()}
"""

    # Always add input schema (required by CRD)
    params = operation.get('parameters', [])
    request_body = operation.get('requestBody', {})

    crd += """  inputSchema:
    type: object
    properties: {}
"""
    # Note: Properties are optional but inputSchema must exist

    # Add output schema
    responses = operation.get('responses', {})
    success_response = responses.get('200', responses.get('201', {}))

    crd += """  outputSchema:
    type: object
"""

    return crd

def main():
    # Fetch swagger spec
    url = "http://localhost:5100/swagger/v1/swagger.json"
    with urllib.request.urlopen(url) as response:
        spec = json.loads(response.read().decode())

    output_dir = "/Users/darren/dev/workflow/tests/TestApiServer/crds/test"
    os.makedirs(output_dir, exist_ok=True)

    # Track existing and new CRDs
    existing = set(os.listdir(output_dir))
    generated = 0

    for path, path_item in spec['paths'].items():
        for method, operation in path_item.items():
            if method in ['get', 'post', 'put', 'delete', 'patch']:
                operation_id = operation.get('operationId', f"{method}{path.replace('/', '_')}")
                task_name = to_task_name(operation_id)
                filename = f"task-{task_name}.yaml"

                if filename not in existing:
                    crd = generate_crd(operation_id, method, path, operation)
                    filepath = os.path.join(output_dir, filename)
                    with open(filepath, 'w') as f:
                        f.write(crd)
                    print(f"Generated: {filename}")
                    generated += 1

    print(f"\nGenerated {generated} new CRDs")
    print(f"Total CRDs: {len(os.listdir(output_dir))}")

if __name__ == "__main__":
    main()
