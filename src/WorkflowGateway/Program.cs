using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;

var builder = WebApplication.CreateBuilder(args);

// Add controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger/OpenAPI
builder.Services.AddSwaggerGen();

// Get configuration
var workflowConfig = builder.Configuration.GetSection("Workflow");
var executionTimeout = workflowConfig.GetValue<int>("ExecutionTimeoutSeconds", 30);
var watcherInterval = workflowConfig.GetValue<int>("WatcherIntervalSeconds", 30);

// Register database services
var connectionString = builder.Configuration.GetConnectionString("WorkflowDatabase");
if (!string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddDbContext<WorkflowDbContext>(options =>
        options.UseNpgsql(connectionString));

    builder.Services.AddScoped<IExecutionRepository, ExecutionRepository>();
    builder.Services.AddScoped<ITaskExecutionRepository, TaskExecutionRepository>();
    builder.Services.AddScoped<IWorkflowVersionRepository, WorkflowVersionRepository>();

    // Add health checks
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<WorkflowDbContext>("database", tags: new[] { "ready" });
}
else
{
    // For testing: Add health checks without database
    builder.Services.AddHealthChecks();
}

// Register WorkflowCore services
builder.Services.AddSingleton<ISchemaParser, SchemaParser>();
builder.Services.AddScoped<ISchemaValidator, SchemaValidator>();
builder.Services.AddScoped<ITemplateParser, TemplateParser>();
builder.Services.AddScoped<ITypeCompatibilityChecker, TypeCompatibilityChecker>();
builder.Services.AddScoped<IWorkflowValidator, WorkflowValidator>();
builder.Services.AddScoped<IExecutionGraphBuilder, ExecutionGraphBuilder>();
builder.Services.AddScoped<ITemplateResolver, TemplateResolver>();

// Register retry policy options and services
builder.Services.AddSingleton(new RetryPolicyOptions
{
    InitialDelayMilliseconds = 100,
    MaxDelayMilliseconds = 30000,
    BackoffMultiplier = 2.0,
    MaxRetryCount = 3
});
builder.Services.AddScoped<IRetryPolicy, RetryPolicy>();

// Register HTTP client and related services
builder.Services.AddHttpClient();
builder.Services.AddScoped<HttpClient>(sp =>
    sp.GetRequiredService<IHttpClientFactory>().CreateClient());
builder.Services.AddScoped<IHttpClientWrapper, HttpClientWrapper>();
builder.Services.AddScoped<IHttpTaskExecutor, HttpTaskExecutor>();
builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
builder.Services.AddScoped<ITemplatePreviewService, TemplatePreviewService>();
builder.Services.AddScoped<IWorkflowVersioningService, WorkflowVersioningService>();
builder.Services.AddScoped<IExecutionTraceService, ExecutionTraceService>();

// Register WorkflowGateway services
builder.Services.AddSingleton<IKubernetesWorkflowClient>(sp =>
{
    // For now, return a stub - in production this would use real IKubernetes
    // This allows health checks to work even without Kubernetes configured
    return new KubernetesWorkflowClient(null!); // TODO: Configure properly for production
});
builder.Services.AddSingleton<IWorkflowDiscoveryService, WorkflowDiscoveryService>();
builder.Services.AddSingleton<IDynamicEndpointService, DynamicEndpointService>();
builder.Services.AddScoped<IInputValidationService, InputValidationService>();

// Note: IWorkflowVersionRepository is already registered in database services section above (line 31)
builder.Services.AddScoped(sp => new WorkflowExecutionService(
    sp.GetRequiredService<IWorkflowOrchestrator>(),
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetService<IExecutionRepository>(),  // Nullable - OK if DB not configured
    executionTimeout));

// Register background service
builder.Services.AddSingleton(sp => new WorkflowWatcherService(
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetRequiredService<IDynamicEndpointService>(),
    sp,  // IServiceProvider for creating scopes
    sp.GetRequiredService<ILogger<WorkflowWatcherService>>(),
    watcherInterval));
builder.Services.AddHostedService(sp => sp.GetRequiredService<WorkflowWatcherService>());

var app = builder.Build();

// Apply database migrations on startup (only if connection string configured and using relational database)
if (!string.IsNullOrEmpty(connectionString))
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<WorkflowDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        try
        {
            // Only migrate if using a relational database (skip for InMemory in tests)
            if (dbContext.Database.IsRelational())
            {
                logger.LogInformation("Applying database migrations...");
                await dbContext.Database.MigrateAsync();
                logger.LogInformation("Database migrations applied successfully");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error applying database migrations");
            throw;
        }
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Workflow Gateway API v1");
        options.RoutePrefix = string.Empty; // Serve Swagger UI at root
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Map health check endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // No checks, just returns 200 if app is running
});

app.Run();

// Make Program accessible for testing
public partial class Program { }
