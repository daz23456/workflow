using KubeOps.Operator;
using WorkflowCore.Services;
using WorkflowOperator.Controllers;
using WorkflowOperator.Webhooks;

var builder = WebApplication.CreateBuilder(args);

// Add KubeOps operator
builder.Services.AddKubernetesOperator();

// Register WorkflowCore services needed by controllers and webhooks
builder.Services.AddSingleton<ISchemaParser, SchemaParser>();
builder.Services.AddScoped<ISchemaValidator, SchemaValidator>();
builder.Services.AddScoped<ITemplateParser, TemplateParser>();
builder.Services.AddScoped<IWorkflowValidator, WorkflowValidator>();
builder.Services.AddScoped<IExecutionGraphBuilder, ExecutionGraphBuilder>();

// Register operator controllers
builder.Services.AddScoped<WorkflowTaskController>();
builder.Services.AddScoped<WorkflowController>();

// Register validation webhooks
builder.Services.AddScoped<WorkflowTaskValidationWebhook>();
builder.Services.AddScoped<WorkflowValidationWebhook>();

// Add health checks for Kubernetes liveness/readiness probes
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure health check endpoints
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz");

app.Run();
