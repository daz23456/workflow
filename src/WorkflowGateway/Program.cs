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

// Register WorkflowCore services
builder.Services.AddSingleton<ISchemaParser, SchemaParser>();
builder.Services.AddScoped<ISchemaValidator, SchemaValidator>();
builder.Services.AddScoped<ITemplateParser, TemplateParser>();
builder.Services.AddScoped<IWorkflowValidator, WorkflowValidator>();
builder.Services.AddScoped<IExecutionGraphBuilder, ExecutionGraphBuilder>();
builder.Services.AddScoped<ITemplateResolver, TemplateResolver>();
builder.Services.AddScoped<IRetryPolicy, RetryPolicy>();
builder.Services.AddScoped<IHttpClientWrapper, HttpClientWrapper>();
builder.Services.AddScoped<IHttpTaskExecutor, HttpTaskExecutor>();
builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();

// Register WorkflowGateway services
builder.Services.AddSingleton<IWorkflowDiscoveryService, WorkflowDiscoveryService>();
builder.Services.AddSingleton<IDynamicEndpointService, DynamicEndpointService>();
builder.Services.AddScoped<IInputValidationService, InputValidationService>();
builder.Services.AddScoped(sp => new WorkflowExecutionService(
    sp.GetRequiredService<IWorkflowOrchestrator>(),
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    executionTimeout));

// Register background service
builder.Services.AddSingleton(sp => new WorkflowWatcherService(
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetRequiredService<IDynamicEndpointService>(),
    sp.GetRequiredService<ILogger<WorkflowWatcherService>>(),
    watcherInterval));
builder.Services.AddHostedService(sp => sp.GetRequiredService<WorkflowWatcherService>());

var app = builder.Build();

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

app.Run();
