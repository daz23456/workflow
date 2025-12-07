using TestApiServer.Endpoints;
using TestApiServer.Middleware;
using TestApiServer.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure port
builder.WebHost.UseUrls("http://localhost:5100");

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Test API Server",
        Version = "v1",
        Description = "Test API for workflow orchestration testing - provides primitive, array, large response, and chainable domain endpoints with chaos engineering support"
    });
});

// Register chaos services
builder.Services.AddSingleton<IChaosService, ChaosService>();
builder.Services.AddSingleton<IChaosStatsService, ChaosStatsService>();

// Register retry/failure services
builder.Services.AddSingleton<IRetryCounterService, RetryCounterService>();
builder.Services.AddSingleton<IFailureStateService, FailureStateService>();

var app = builder.Build();

// Always enable Swagger (not just in Development)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Test API Server v1");
    c.RoutePrefix = "swagger";
});

// Chaos middleware - applies failures/delays based on configuration
app.UseChaos();

// Health endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("Health")
    .WithTags("Health")
    .WithOpenApi();

// Register endpoint groups
app.MapPrimitiveEndpoints();
app.MapArrayEndpoints();
app.MapLargeResponseEndpoints();
app.MapChainableEndpoints();
app.MapOrderEndpoints();
app.MapInventoryEndpoints();
app.MapChaosControlEndpoints();
app.MapPaymentEndpoints();
app.MapUserEndpoints();
app.MapNotificationEndpoints();
app.MapRetryEndpoints();

app.Run();

// Required for WebApplicationFactory in tests
public partial class Program { }
