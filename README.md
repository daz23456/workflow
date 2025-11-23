# Workflow Operator

A production-grade, enterprise-ready Kubernetes-native workflow orchestration engine for synchronous, user-facing API calls built with .NET 8.

## Overview

Workflow Operator is a Kubernetes operator that orchestrates multi-step workflows defined as Custom Resources (CRDs). It enables you to define reusable HTTP tasks and compose them into workflows with automatic dependency resolution, schema validation, and template-based parameter passing.

## Key Features

- **Kubernetes-Native**: Full CRD-based workflow and task definitions with validating admission webhooks
- **Type-Safe**: JSON Schema validation for all inputs and outputs with compile-time type checking
- **Template-Based**: Dynamic parameter binding using `{{input.x}}` and `{{tasks.y.output.z}}` syntax
- **Dependency-Aware**: Automatic execution graph building with circular dependency detection
- **Fail-Fast Validation**: Validation webhooks reject invalid workflows at `kubectl apply` time
- **Production-Ready**: >90% test coverage, comprehensive mutation testing, strict TDD development

## Architecture

The project consists of three main components:

### 1. **WorkflowCore** (`src/WorkflowCore/`)
Shared domain models and core services used across all components:
- Schema definition and validation (JsonSchema.Net)
- Template parsing and resolution
- Type compatibility checking
- Execution graph building
- HTTP task execution with retry policies

### 2. **WorkflowOperator** (`src/WorkflowOperator/`)
Kubernetes operator built with KubeOps 8.x:
- Custom resource controllers for WorkflowTask and Workflow CRDs
- Validating admission webhooks for fail-fast validation
- Reconciliation loops for resource status management

### 3. **WorkflowGateway** (`src/WorkflowGateway/`)
API Gateway for workflow execution:
- Synchronous workflow execution API
- Workflow discovery and validation
- Real-time execution monitoring
- Integration with Kubernetes operator

## Getting Started

### Prerequisites

- .NET 8 SDK
- Docker (for running tests with TestContainers)
- Kubernetes cluster (for operator deployment) - optional for development

### Building the Solution

```bash
# Clone the repository
cd workflow

# Restore dependencies
dotnet restore

# Build all projects
dotnet build

# Run all tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Running Tests

```bash
# Run all tests
dotnet test

# Run specific project tests
dotnet test tests/WorkflowCore.Tests/
dotnet test tests/WorkflowOperator.Tests/
dotnet test tests/WorkflowGateway.Tests/

# Run with coverage report
dotnet test --collect:"XPlat Code Coverage"
dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator -reports:tests/**/coverage.cobertura.xml -targetdir:coverage/report -reporttypes:Html
```

### Mutation Testing

This project uses Stryker.NET for mutation testing to ensure test quality:

```bash
# Run mutation testing for WorkflowCore
cd tests/WorkflowCore.Tests
dotnet stryker --config-file ../../stryker-config-workflowcore.json

# Run mutation testing for WorkflowOperator
cd tests/WorkflowOperator.Tests
dotnet stryker --config-file ../../stryker-config-workflowoperator.json

# Run mutation testing for WorkflowGateway
cd tests/WorkflowGateway.Tests
dotnet stryker --config-file ../../stryker-config-workflowgateway.json
```

Target mutation score: **≥80%**

## Project Structure

```
workflow/
├── src/
│   ├── WorkflowCore/              # Shared domain models and services
│   ├── WorkflowOperator/          # Kubernetes operator (KubeOps)
│   └── WorkflowGateway/           # API gateway for workflow execution
├── tests/
│   ├── WorkflowCore.Tests/        # Unit tests for WorkflowCore
│   ├── WorkflowOperator.Tests/    # Unit tests for WorkflowOperator
│   └── WorkflowGateway.Tests/     # Unit tests for WorkflowGateway
├── deploy/
│   └── crds/                      # Custom Resource Definitions
├── stryker-config-*.json          # Mutation testing configurations
├── CLAUDE.md                      # Project specification
└── README.md                      # This file
```

## Example Workflow

Define a reusable HTTP task:

```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: fetch-user
spec:
  type: http
  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  outputSchema:
    type: object
    properties:
      name:
        type: string
      email:
        type: string
  request:
    method: GET
    url: "https://api.example.com/users/{{input.userId}}"
```

Compose tasks into a workflow:

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: user-enrichment
spec:
  input:
    userId:
      type: string
      required: true
  tasks:
    - id: fetch-user
      taskRef: fetch-user
      input:
        userId: "{{input.userId}}"

    - id: fetch-orders
      taskRef: fetch-orders
      input:
        userId: "{{input.userId}}"
        userEmail: "{{tasks.fetch-user.output.email}}"
```

## Development Workflow

This project follows strict **Test-Driven Development (TDD)**:

1. **RED**: Write a failing test
2. **GREEN**: Write minimal code to pass the test
3. **REFACTOR**: Improve code while keeping tests green

### Quality Gates

- ✅ All tests must pass (100%)
- ✅ Code coverage ≥90%
- ✅ Mutation score ≥80%
- ✅ No compiler warnings
- ✅ Zero tolerance for test failures

## Technology Stack

- **.NET 8** with ASP.NET Core
- **System.Text.Json** for serialization
- **KubeOps 8.x** for Kubernetes operator
- **JsonSchema.Net 5.x** for schema validation
- **xUnit, Moq, FluentAssertions** for testing
- **Stryker.NET** for mutation testing

## Documentation

- [CLAUDE.md](CLAUDE.md) - Complete project specification
- [WorkflowCore README](src/WorkflowCore/README.md) - Core services documentation
- [WorkflowOperator README](src/WorkflowOperator/README.md) - Kubernetes operator documentation
- [WorkflowGateway README](src/WorkflowGateway/README.md) - API gateway documentation

## Contributing

This project maintains strict quality standards:

1. All new features must follow TDD (test-first development)
2. All tests must pass before committing
3. Code coverage must remain ≥90%
4. Mutation score must remain ≥80%
5. No compiler warnings allowed

## License

[Add license information]

## Status

**Current Development Stage**: Stage 6 Complete - Kubernetes Operator with Validation Webhooks

See [CLAUDE.md](CLAUDE.md) for the complete roadmap and stage completion proof files.
