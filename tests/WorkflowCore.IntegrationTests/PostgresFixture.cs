using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using WorkflowCore.Data;

namespace WorkflowCore.IntegrationTests;

/// <summary>
/// Shared PostgreSQL container fixture for integration tests.
/// Implements IAsyncLifetime to manage container lifecycle.
/// Uses a single database with table truncation for test isolation.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:15-alpine")
        .WithDatabase("workflow_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public string ConnectionString => _container.GetConnectionString();
    private bool _isMigrated = false;
    private readonly SemaphoreSlim _migrationLock = new SemaphoreSlim(1, 1);

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    /// <summary>
    /// Creates a new DbContext connected to the shared test database.
    /// Database is migrated once on first call.
    /// Note: Tables are NOT truncated automatically. Tests share the database.
    /// Use SaveChangesAsync() to persist data across multiple contexts in the same test.
    /// </summary>
    public async Task<WorkflowDbContext> CreateDbContextAsync()
    {
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        var context = new WorkflowDbContext(options);

        // Migrate database once per fixture (thread-safe)
        if (!_isMigrated)
        {
            await _migrationLock.WaitAsync();
            try
            {
                if (!_isMigrated)
                {
                    await context.Database.MigrateAsync();

                    // Clean tables once at startup
                    await TruncateAllTablesAsync(context);

                    _isMigrated = true;
                }
            }
            finally
            {
                _migrationLock.Release();
            }
        }

        return context;
    }

    /// <summary>
    /// Truncates all tables for test isolation.
    /// Tests using xUnit's IClassFixture get a fresh fixture per test class,
    /// so tables are cleaned once per test class automatically.
    /// Call this method from individual tests if they need complete isolation from other tests.
    /// </summary>
    public async Task CleanTablesAsync()
    {
        var context = await CreateDbContextAsync();
        await TruncateAllTablesAsync(context);
        await context.DisposeAsync();
    }

    private static async Task TruncateAllTablesAsync(WorkflowDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"TaskExecutionRecords\" CASCADE");
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"ExecutionRecords\" CASCADE");
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"WorkflowVersions\" CASCADE");
    }
}
