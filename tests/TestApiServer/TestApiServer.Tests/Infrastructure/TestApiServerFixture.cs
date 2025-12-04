using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TestApiServer.Tests.Infrastructure;

/// <summary>
/// Test fixture for integration testing the Test API Server
/// </summary>
public class TestApiServerFixture : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
    }
}

/// <summary>
/// Collection definition for sharing the fixture across tests
/// </summary>
[CollectionDefinition("TestApiServer")]
public class TestApiServerCollection : ICollectionFixture<TestApiServerFixture>
{
}
