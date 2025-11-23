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
                    _isMigrated = true;
                }
            }
            finally
            {
                _migrationLock.Release();
            }
        }

        // Clean tables for test isolation
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"TaskExecutionRecords\" CASCADE");
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"ExecutionRecords\" CASCADE");
        await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"WorkflowVersions\" CASCADE");

        return context;
    }
}
