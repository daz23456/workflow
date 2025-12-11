using k8s;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Hubs;
using WorkflowGateway.Services;

var builder = WebApplication.CreateBuilder(args);

// Add controllers
builder.Services.AddControllers();

// Add SignalR for real-time workflow execution events
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger/OpenAPI
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Workflow Gateway API",
        Version = "v1",
        Description = "Kubernetes-native workflow orchestration engine with dynamic workflow discovery"
    });
    options.DocumentFilter<WorkflowGateway.Swagger.DynamicWorkflowDocumentFilter>();

    // Include XML comments for API documentation
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Configure CORS to allow frontend access
// Note: SignalR WebSockets require AllowCredentials() which is incompatible with AllowAnyOrigin()
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // In development, use specific origins for SignalR WebSocket support
            // AllowCredentials() is required for SignalR but incompatible with AllowAnyOrigin()
            policy.WithOrigins(
                      "http://localhost:3000",
                      "http://localhost:3001",
                      "http://localhost:5173",  // Vite dev server
                      "http://localhost:5001")  // API self-reference
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // In production, be specific about allowed origins
            policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Get configuration
var workflowConfig = builder.Configuration.GetSection("Workflow");
var executionTimeout = workflowConfig.GetValue<int>("ExecutionTimeoutSeconds", 30);
var watcherInterval = workflowConfig.GetValue<int>("WatcherIntervalSeconds", 30);
var discoveryCacheTTL = workflowConfig.GetValue<int>("DiscoveryCacheTTLSeconds", 30);
var triggerPollingInterval = workflowConfig.GetValue<int>("TriggerPollingIntervalSeconds", 10);
// Note: Namespaces are now auto-discovered using cluster-wide queries - no configuration needed

// Register database services
var connectionString = builder.Configuration.GetConnectionString("WorkflowDatabase");
if (!string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddDbContext<WorkflowDbContext>(options =>
        options.UseNpgsql(connectionString));

    builder.Services.AddScoped<IExecutionRepository, ExecutionRepository>();
    builder.Services.AddScoped<ITaskExecutionRepository, TaskExecutionRepository>();
    builder.Services.AddScoped<IWorkflowVersionRepository, WorkflowVersionRepository>();

    // Services that depend on database
    builder.Services.AddScoped<IWorkflowVersioningService, WorkflowVersioningService>();
    builder.Services.AddScoped<IExecutionTraceService, ExecutionTraceService>();
    builder.Services.AddScoped<IStatisticsAggregationService, StatisticsAggregationService>();
    builder.Services.AddScoped<IMetricsService, MetricsService>();

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

// Register circuit breaker services for fault tolerance
builder.Services.AddSingleton<ICircuitBreakerRegistry, CircuitBreakerRegistry>();
builder.Services.AddSingleton<ICircuitStateStore, InMemoryCircuitStateStore>();

// Register HTTP client and related services
builder.Services.AddHttpClient();
builder.Services.AddScoped<HttpClient>(sp =>
    sp.GetRequiredService<IHttpClientFactory>().CreateClient());
builder.Services.AddScoped<IHttpClientWrapper, HttpClientWrapper>();

// Register distributed cache for task-level caching (Stage 39.1)
// Uses Redis if connection string available, otherwise in-memory
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = "workflow:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}
builder.Services.AddSingleton<ITaskCacheProvider, DistributedTaskCacheProvider>();

// Register response storage and handlers
builder.Services.AddScoped<WorkflowCore.Interfaces.IResponseStorage, HybridResponseStorage>();
builder.Services.AddScoped<WorkflowCore.Interfaces.IResponseHandler, WorkflowCore.Services.ResponseHandlers.JsonResponseHandler>();
builder.Services.AddScoped<WorkflowCore.Interfaces.IResponseHandler, WorkflowCore.Services.ResponseHandlers.BinaryResponseHandler>();
builder.Services.AddScoped<WorkflowCore.Interfaces.IResponseHandler, WorkflowCore.Services.ResponseHandlers.TextResponseHandler>();
builder.Services.AddScoped<WorkflowCore.Interfaces.IResponseHandlerFactory, ResponseHandlerFactory>();

// Register HttpTaskExecutor wrapped with CachedHttpTaskExecutor for task-level caching (Stage 39.1)
builder.Services.AddScoped<IHttpTaskExecutor>(sp =>
{
    var templateResolver = sp.GetRequiredService<ITemplateResolver>();
    var schemaValidator = sp.GetRequiredService<ISchemaValidator>();
    var retryPolicy = sp.GetRequiredService<IRetryPolicy>();
    var httpClient = sp.GetRequiredService<IHttpClientWrapper>();
    var responseHandlerFactory = sp.GetRequiredService<WorkflowCore.Interfaces.IResponseHandlerFactory>();

    var innerExecutor = new HttpTaskExecutor(
        templateResolver,
        schemaValidator,
        retryPolicy,
        httpClient,
        responseHandlerFactory);

    var cacheProvider = sp.GetRequiredService<ITaskCacheProvider>();
    var logger = sp.GetRequiredService<ILogger<CachedHttpTaskExecutor>>();

    return new CachedHttpTaskExecutor(innerExecutor, cacheProvider, logger);
});
builder.Services.AddScoped<IDataTransformer, JsonPathTransformer>();
builder.Services.AddScoped<ITransformTaskExecutor, TransformTaskExecutor>();
builder.Services.AddScoped<ITemplatePreviewService, TemplatePreviewService>();

// Register SignalR event notifier for real-time workflow events
builder.Services.AddSingleton<IWorkflowEventNotifier, SignalRWorkflowEventNotifier>();

// Register control flow evaluators for condition, switch, and forEach
builder.Services.AddScoped<IConditionEvaluator, ConditionEvaluator>();
builder.Services.AddScoped<ISwitchEvaluator, SwitchEvaluator>();
builder.Services.AddScoped<IForEachExecutor, ForEachExecutor>();

// Register cron parser for schedule triggers
builder.Services.AddSingleton<ICronParser, CronParser>();

// Register HMAC validator for webhook triggers
builder.Services.AddSingleton<IHmacValidator, HmacValidator>();

// Register WorkflowOrchestrator with event notifier and control flow evaluators injected
builder.Services.AddScoped<IWorkflowOrchestrator>(sp =>
{
    var graphBuilder = sp.GetRequiredService<IExecutionGraphBuilder>();
    var httpExecutor = sp.GetRequiredService<IHttpTaskExecutor>();
    var templateResolver = sp.GetRequiredService<ITemplateResolver>();
    var responseStorage = sp.GetRequiredService<WorkflowCore.Interfaces.IResponseStorage>();
    var transformExecutor = sp.GetService<ITransformTaskExecutor>();
    var eventNotifier = sp.GetService<IWorkflowEventNotifier>();
    var conditionEvaluator = sp.GetService<IConditionEvaluator>();
    var switchEvaluator = sp.GetService<ISwitchEvaluator>();
    var forEachExecutor = sp.GetService<IForEachExecutor>();

    return new WorkflowOrchestrator(
        graphBuilder,
        httpExecutor,
        templateResolver,
        responseStorage,
        maxConcurrentTasks: 10,
        transformExecutor,
        eventNotifier,
        conditionEvaluator,
        switchEvaluator,
        forEachExecutor);
});

// Register Kubernetes client and workflow discovery services
builder.Services.AddSingleton<IKubernetes>(sp =>
{
    var config = KubernetesClientConfiguration.BuildDefaultConfig();
    return new Kubernetes(config);
});
builder.Services.AddSingleton<IKubernetesWorkflowClient, KubernetesWorkflowClient>();
builder.Services.AddSingleton<IWorkflowDiscoveryService>(sp =>
    new WorkflowDiscoveryService(
        sp.GetRequiredService<IKubernetesWorkflowClient>(),
        discoveryCacheTTL));
builder.Services.AddSingleton<ITemplateDiscoveryService, TemplateDiscoveryService>();
builder.Services.AddSingleton<IDynamicEndpointService, DynamicEndpointService>();
builder.Services.AddScoped<IInputValidationService, InputValidationService>();
builder.Services.AddSingleton<IWorkflowInputValidator, WorkflowInputValidator>();
builder.Services.AddSingleton<IWorkflowYamlParser, WorkflowYamlParser>();

// Note: IWorkflowVersionRepository is already registered in database services section above (line 31)
builder.Services.AddScoped<IWorkflowExecutionService>(sp => new WorkflowExecutionService(
    sp.GetRequiredService<IWorkflowOrchestrator>(),
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetService<IExecutionRepository>(),  // Nullable - OK if DB not configured
    sp.GetService<IStatisticsAggregationService>(),  // Nullable - OK if DB not configured
    executionTimeout));

// Register background services
builder.Services.AddSingleton(sp => new WorkflowWatcherService(
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetRequiredService<IDynamicEndpointService>(),
    sp,  // IServiceProvider for creating scopes
    sp.GetRequiredService<ILogger<WorkflowWatcherService>>(),
    watcherInterval));
builder.Services.AddHostedService(sp => sp.GetRequiredService<WorkflowWatcherService>());

// Register schedule trigger background service
builder.Services.AddSingleton(sp => new ScheduleTriggerService(
    sp.GetRequiredService<IWorkflowDiscoveryService>(),
    sp.GetRequiredService<ICronParser>(),
    sp,  // IServiceProvider for creating scopes
    sp.GetRequiredService<ILogger<ScheduleTriggerService>>(),
    triggerPollingInterval));
builder.Services.AddHostedService(sp => sp.GetRequiredService<ScheduleTriggerService>());

// Register anomaly baseline service
builder.Services.AddScoped<IAnomalyBaselineService, AnomalyBaselineService>();

// Register optimization services (Stage 14)
builder.Services.AddScoped<IWorkflowAnalyzer, WorkflowAnalyzer>();
builder.Services.AddScoped<ITransformEquivalenceChecker, TransformEquivalenceChecker>();
builder.Services.AddScoped<IHistoricalReplayEngine, HistoricalReplayEngine>();

// Register CI/CD integration services (Stage 16.6)
// Use Kubernetes-aware tracker that queries K8s directly for task-workflow relationships
builder.Services.AddSingleton<ITaskDependencyTracker, KubernetesTaskDependencyTracker>();
builder.Services.AddSingleton<ITaskLifecycleManager, TaskLifecycleManager>();

// Register blast radius analysis service (Stage 33)
builder.Services.AddSingleton<IBlastRadiusAnalyzer, BlastRadiusAnalyzer>();

// Register field usage tracking services (Stage 16.7)
builder.Services.AddSingleton<IFieldUsageAnalyzer, FieldUsageAnalyzer>();
builder.Services.AddSingleton<IConsumerContractValidator, ConsumerContractValidator>();

// Register contract verification services (Stage 16.8)
builder.Services.AddSingleton<IInteractionRecorder, InteractionRecorder>();
builder.Services.AddSingleton<IContractVerificationService, ContractVerificationService>();
builder.Services.AddSingleton<IDeploymentMatrixService, DeploymentMatrixService>();

// Register baseline refresh background service
builder.Services.Configure<BaselineRefreshOptions>(options =>
{
    options.RefreshInterval = TimeSpan.FromHours(1);
    options.Enabled = true;
});
builder.Services.AddHostedService<BaselineRefreshService>();

// Register anomaly detection services
builder.Services.AddScoped<IAnomalyDetector, ZScoreAnomalyDetector>();
builder.Services.AddScoped<AnomalyEvaluationService>();

// Register alert routing services (Stage 27.3)
builder.Services.AddMemoryCache();
builder.Services.Configure<WorkflowCore.Services.AlertChannels.WebhookAlertChannelOptions>(
    builder.Configuration.GetSection(WorkflowCore.Services.AlertChannels.WebhookAlertChannelOptions.SectionName));
builder.Services.Configure<WorkflowCore.Services.AlertChannels.SlackAlertChannelOptions>(
    builder.Configuration.GetSection(WorkflowCore.Services.AlertChannels.SlackAlertChannelOptions.SectionName));
builder.Services.Configure<WorkflowCore.Services.AlertChannels.PagerDutyAlertChannelOptions>(
    builder.Configuration.GetSection(WorkflowCore.Services.AlertChannels.PagerDutyAlertChannelOptions.SectionName));
builder.Services.Configure<WorkflowCore.Services.AlertChannels.EmailAlertChannelOptions>(
    builder.Configuration.GetSection(WorkflowCore.Services.AlertChannels.EmailAlertChannelOptions.SectionName));

builder.Services.AddScoped<IAlertChannel, WorkflowCore.Services.AlertChannels.WebhookAlertChannel>();
builder.Services.AddScoped<IAlertChannel, WorkflowCore.Services.AlertChannels.SlackAlertChannel>();
builder.Services.AddScoped<IAlertChannel, WorkflowCore.Services.AlertChannels.PagerDutyAlertChannel>();
builder.Services.AddScoped<IAlertChannel, WorkflowCore.Services.AlertChannels.EmailAlertChannel>();
builder.Services.AddScoped<IAlertRouter, AlertRouter>();

// Register synthetic health check services (Stage 18.1)
builder.Services.Configure<SyntheticCheckOptions>(
    builder.Configuration.GetSection(SyntheticCheckOptions.SectionName));

// SyntheticCheckService needs a dedicated HttpClient for health checks
builder.Services.AddHttpClient<ISyntheticCheckService, SyntheticCheckService>();
builder.Services.AddHostedService<SyntheticCheckBackgroundService>();

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

// Enable CORS
app.UseCors();

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

// Map SignalR hub for real-time workflow execution events
app.MapHub<WorkflowExecutionHub>("/hubs/workflow");

app.Run();

// Make Program accessible for testing
public partial class Program { }
