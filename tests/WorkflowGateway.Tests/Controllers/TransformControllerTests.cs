using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class TransformControllerTests
{
    private readonly Mock<ITransformDslParser> _mockParser = new();
    private readonly Mock<ITransformExecutor> _mockExecutor = new();
    private readonly TransformController _controller;

    public TransformControllerTests()
    {
        _controller = new TransformController(_mockParser.Object, _mockExecutor.Object);
    }

    [Fact]
    public async Task Transform_ValidRequest_ReturnsTransformedData()
    {
        // Arrange
        var request = new TransformRequest
        {
            Dsl = """
            {
                "version": "1.0",
                "pipeline": [
                    { "operation": "select", "fields": { "name": "$.name" } }
                ]
            }
            """,
            Data = new[]
            {
                JsonSerializer.SerializeToElement(new { name = "Alice", age = 30 })
            }
        };

        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SelectOperation { Fields = new Dictionary<string, string> { ["name"] = "$.name" } }
            }
        };

        var transformedData = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice" })
        };

        _mockParser.Setup(p => p.ParseAsync(request.Dsl))
            .ReturnsAsync(new TransformDslParseResult
            {
                IsValid = true,
                Dsl = dsl
            });

        _mockParser.Setup(p => p.ValidateAsync(dsl))
            .ReturnsAsync(new TransformDslValidationResult { IsValid = true });

        _mockExecutor.Setup(e => e.ExecuteAsync(dsl, request.Data, It.IsAny<CancellationToken>()))
            .ReturnsAsync(transformedData);

        // Act
        var result = await _controller.Transform(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TransformResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().HaveCount(1);
        response.Data![0].GetProperty("name").GetString().Should().Be("Alice");
    }

    [Fact]
    public async Task Transform_InvalidDslSyntax_ReturnsBadRequest()
    {
        // Arrange
        var request = new TransformRequest
        {
            Dsl = "{ invalid json",
            Data = Array.Empty<JsonElement>()
        };

        _mockParser.Setup(p => p.ParseAsync(request.Dsl))
            .ReturnsAsync(new TransformDslParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Invalid JSON syntax" }
            });

        // Act
        var result = await _controller.Transform(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<TransformResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Invalid JSON syntax");
    }

    [Fact]
    public async Task Transform_InvalidDslValidation_ReturnsBadRequest()
    {
        // Arrange
        var request = new TransformRequest
        {
            Dsl = """
            {
                "version": "1.0",
                "pipeline": [
                    { "operation": "filter", "field": "", "operator": "invalid" }
                ]
            }
            """,
            Data = Array.Empty<JsonElement>()
        };

        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation { Field = "", Operator = "invalid", Value = null }
            }
        };

        _mockParser.Setup(p => p.ParseAsync(request.Dsl))
            .ReturnsAsync(new TransformDslParseResult { IsValid = true, Dsl = dsl });

        _mockParser.Setup(p => p.ValidateAsync(dsl))
            .ReturnsAsync(new TransformDslValidationResult
            {
                IsValid = false,
                Errors = new List<string>
                {
                    "Operation 0 (filter): field is required",
                    "Operation 0 (filter): operator 'invalid' is invalid"
                }
            });

        // Act
        var result = await _controller.Transform(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeOfType<TransformResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().HaveCount(2);
    }

    [Fact]
    public async Task Transform_EmptyData_ReturnsEmptyResult()
    {
        // Arrange
        var request = new TransformRequest
        {
            Dsl = """
            {
                "version": "1.0",
                "pipeline": [
                    { "operation": "select", "fields": { "name": "$.name" } }
                ]
            }
            """,
            Data = Array.Empty<JsonElement>()
        };

        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SelectOperation { Fields = new Dictionary<string, string> { ["name"] = "$.name" } }
            }
        };

        _mockParser.Setup(p => p.ParseAsync(request.Dsl))
            .ReturnsAsync(new TransformDslParseResult { IsValid = true, Dsl = dsl });

        _mockParser.Setup(p => p.ValidateAsync(dsl))
            .ReturnsAsync(new TransformDslValidationResult { IsValid = true });

        _mockExecutor.Setup(e => e.ExecuteAsync(dsl, request.Data, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<JsonElement>());

        // Act
        var result = await _controller.Transform(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TransformResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Data.Should().BeEmpty();
    }

    [Fact]
    public async Task Transform_ExecutorThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var request = new TransformRequest
        {
            Dsl = """
            {
                "version": "1.0",
                "pipeline": []
            }
            """,
            Data = new[] { JsonSerializer.SerializeToElement(new { id = 1 }) }
        };

        var dsl = new TransformDslDefinition { Pipeline = new List<TransformOperation>() };

        _mockParser.Setup(p => p.ParseAsync(request.Dsl))
            .ReturnsAsync(new TransformDslParseResult { IsValid = true, Dsl = dsl });

        _mockParser.Setup(p => p.ValidateAsync(dsl))
            .ReturnsAsync(new TransformDslValidationResult { IsValid = true });

        _mockExecutor.Setup(e => e.ExecuteAsync(dsl, request.Data, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Execution failed"));

        // Act
        var result = await _controller.Transform(request);

        // Assert
        var errorResult = result.Should().BeOfType<ObjectResult>().Subject;
        errorResult.StatusCode.Should().Be(500);
        var response = errorResult.Value.Should().BeOfType<TransformResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Errors.Should().Contain("Execution failed");
    }
}
