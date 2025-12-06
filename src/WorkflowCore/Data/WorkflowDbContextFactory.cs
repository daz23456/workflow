using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System.Diagnostics.CodeAnalysis;

namespace WorkflowCore.Data;

/// <summary>
/// Design-time factory for creating WorkflowDbContext instances during migrations.
/// This is only used by EF Core tooling (dotnet ef) and not at runtime.
/// </summary>
[ExcludeFromCodeCoverage]
public class WorkflowDbContextFactory : IDesignTimeDbContextFactory<WorkflowDbContext>
{
    public WorkflowDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<WorkflowDbContext>();

        // Use a temporary connection string for migrations
        // In production, the actual connection string will be provided via DI
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=workflow_dev;Username=workflow;Password=workflow");

        return new WorkflowDbContext(optionsBuilder.Options);
    }
}
