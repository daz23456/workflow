using FluentAssertions;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class EndpointInfoTests
{
    [Fact]
    public void EndpointInfo_ShouldInitializeWithDefaultValues()
    {
        // Act
        var info = new EndpointInfo();

        // Assert
        info.WorkflowName.Should().Be(string.Empty);
        info.Pattern.Should().Be(string.Empty);
        info.HttpMethod.Should().Be(string.Empty);
        info.EndpointType.Should().Be(string.Empty);
    }

    [Fact]
    public void EndpointInfo_ShouldAllowSettingProperties()
    {
        // Act
        var info = new EndpointInfo
        {
            WorkflowName = "user-enrichment",
            Pattern = "/api/v1/workflows/user-enrichment/execute",
            HttpMethod = "POST",
            EndpointType = "execute"
        };

        // Assert
        info.WorkflowName.Should().Be("user-enrichment");
        info.Pattern.Should().Be("/api/v1/workflows/user-enrichment/execute");
        info.HttpMethod.Should().Be("POST");
        info.EndpointType.Should().Be("execute");
    }

    [Fact]
    public void EndpointInfo_ShouldSupportTestEndpointType()
    {
        // Act
        var info = new EndpointInfo
        {
            WorkflowName = "order-processing",
            Pattern = "/api/v1/workflows/order-processing/test",
            HttpMethod = "POST",
            EndpointType = "test"
        };

        // Assert
        info.EndpointType.Should().Be("test");
    }

    [Fact]
    public void EndpointInfo_ShouldSupportGetEndpointType()
    {
        // Act
        var info = new EndpointInfo
        {
            WorkflowName = "user-data",
            Pattern = "/api/v1/workflows/user-data",
            HttpMethod = "GET",
            EndpointType = "get"
        };

        // Assert
        info.EndpointType.Should().Be("get");
        info.HttpMethod.Should().Be("GET");
    }
}
