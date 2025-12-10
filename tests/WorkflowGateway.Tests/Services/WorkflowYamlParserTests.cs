using FluentAssertions;
using WorkflowGateway.Services;

namespace WorkflowGateway.Tests.Services;

/// <summary>
/// Tests for WorkflowYamlParser - YAML to WorkflowResource parsing.
/// </summary>
public class WorkflowYamlParserTests
{
    private readonly WorkflowYamlParser _parser = new();

    #region Valid YAML Tests

    [Fact]
    public void Parse_ValidYaml_ReturnsWorkflowResource()
    {
        // Arrange
        var yaml = @"
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test-workflow
spec:
  description: Test workflow
  tasks:
    - id: step1
      taskRef: task1
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
        result.Metadata!.Name.Should().Be("test-workflow");
        result.Spec.Should().NotBeNull();
        result.Spec.Description.Should().Be("Test workflow");
        result.Spec.Tasks.Should().HaveCount(1);
        result.Spec.Tasks[0].Id.Should().Be("step1");
        result.Spec.Tasks[0].TaskRef.Should().Be("task1");
    }

    [Fact]
    public void Parse_MinimalYaml_ReturnsWorkflowResource()
    {
        // Arrange
        var yaml = @"
metadata:
  name: minimal-workflow
spec:
  tasks: []
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Should().NotBeNull();
        result.Metadata!.Name.Should().Be("minimal-workflow");
        result.Spec.Tasks.Should().BeEmpty();
    }

    [Fact]
    public void Parse_YamlWithMultipleTasks_ParsesAllTasks()
    {
        // Arrange
        var yaml = @"
metadata:
  name: multi-task-workflow
spec:
  tasks:
    - id: step1
      taskRef: task1
    - id: step2
      taskRef: task2
      dependsOn:
        - step1
    - id: step3
      taskRef: task3
      dependsOn:
        - step1
        - step2
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Spec.Tasks.Should().HaveCount(3);
        result.Spec.Tasks[0].Id.Should().Be("step1");
        result.Spec.Tasks[1].Id.Should().Be("step2");
        result.Spec.Tasks[1].DependsOn.Should().Contain("step1");
        result.Spec.Tasks[2].Id.Should().Be("step3");
        result.Spec.Tasks[2].DependsOn.Should().HaveCount(2);
    }

    [Fact]
    public void Parse_YamlWithInputs_ParsesInputSchema()
    {
        // Arrange
        var yaml = @"
metadata:
  name: workflow-with-inputs
spec:
  input:
    userId:
      type: string
      required: true
    amount:
      type: number
  tasks: []
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Spec.Input.Should().NotBeNull();
        result.Spec.Input.Should().ContainKey("userId");
        result.Spec.Input.Should().ContainKey("amount");
    }

    [Fact]
    public void Parse_YamlWithOutputMapping_ParsesOutputs()
    {
        // Arrange
        var yaml = @"
metadata:
  name: workflow-with-outputs
spec:
  output:
    result: ""${step1.output.data}""
    status: ""${step2.output.status}""
  tasks:
    - id: step1
      taskRef: task1
    - id: step2
      taskRef: task2
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Spec.Output.Should().NotBeNull();
        result.Spec.Output.Should().ContainKey("result");
        result.Spec.Output.Should().ContainKey("status");
    }

    [Fact]
    public void Parse_IgnoresUnknownProperties()
    {
        // Arrange - YAML with extra fields that don't map to WorkflowResource
        var yaml = @"
metadata:
  name: test-workflow
  unknownField: should-be-ignored
spec:
  tasks: []
  extraProperty: ignored
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert - Should parse without error, ignoring unknown fields
        result.Should().NotBeNull();
        result.Metadata!.Name.Should().Be("test-workflow");
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public void Parse_EmptyYaml_ThrowsYamlParseException()
    {
        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse(""));
        exception.Message.Should().Contain("cannot be empty");
    }

    [Fact]
    public void Parse_WhitespaceOnlyYaml_ThrowsYamlParseException()
    {
        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse("   \n\t  "));
        exception.Message.Should().Contain("cannot be empty");
    }

    [Fact]
    public void Parse_NullYaml_ThrowsYamlParseException()
    {
        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse(null!));
        exception.Message.Should().Contain("cannot be empty");
    }

    [Fact]
    public void Parse_InvalidYamlSyntax_ThrowsYamlParseException()
    {
        // Arrange - Invalid YAML with bad indentation
        var yaml = @"
metadata:
name: broken
  spec:
tasks: []
";

        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse(yaml));
        exception.Message.Should().Contain("Invalid YAML syntax");
    }

    [Fact]
    public void Parse_MissingMetadataName_ThrowsYamlParseException()
    {
        // Arrange
        var yaml = @"
metadata:
  labels: {}
spec:
  tasks: []
";

        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse(yaml));
        exception.Message.Should().Contain("metadata.name is required");
    }

    [Fact]
    public void Parse_MissingMetadata_ThrowsYamlParseException()
    {
        // Arrange
        var yaml = @"
spec:
  tasks: []
";

        // Act & Assert
        var exception = Assert.Throws<YamlParseException>(() => _parser.Parse(yaml));
        exception.Message.Should().Contain("metadata.name is required");
    }

    [Fact]
    public void Parse_InvalidYamlStructure_ThrowsYamlParseException()
    {
        // Arrange - Valid YAML but wrong structure (array instead of object)
        var yaml = @"
- item1
- item2
";

        // Act & Assert
        Assert.Throws<YamlParseException>(() => _parser.Parse(yaml));
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Parse_YamlWithCamelCaseProperties_ParsesCorrectly()
    {
        // Arrange
        var yaml = @"
metadata:
  name: camel-case-workflow
spec:
  tasks:
    - id: step1
      taskRef: myTask
      dependsOn: []
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Metadata!.Name.Should().Be("camel-case-workflow");
        result.Spec.Tasks[0].TaskRef.Should().Be("myTask");
    }

    [Fact]
    public void Parse_YamlWithSpecialCharactersInName_ParsesCorrectly()
    {
        // Arrange
        var yaml = @"
metadata:
  name: workflow-with-dashes-123
spec:
  tasks: []
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Metadata!.Name.Should().Be("workflow-with-dashes-123");
    }

    [Fact]
    public void Parse_YamlWithEmptyTasksList_ParsesCorrectly()
    {
        // Arrange
        var yaml = @"
metadata:
  name: empty-tasks-workflow
spec:
  tasks: []
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Spec.Tasks.Should().BeEmpty();
    }

    [Fact]
    public void Parse_YamlWithTaskInputMapping_ParsesInputs()
    {
        // Arrange
        var yaml = @"
metadata:
  name: task-with-inputs
spec:
  tasks:
    - id: step1
      taskRef: task1
      input:
        userId: ""${input.userId}""
        orderId: ""12345""
";

        // Act
        var result = _parser.Parse(yaml);

        // Assert
        result.Spec.Tasks[0].Input.Should().NotBeNull();
        result.Spec.Tasks[0].Input.Should().ContainKey("userId");
        result.Spec.Tasks[0].Input.Should().ContainKey("orderId");
    }

    #endregion

    #region YamlParseException Tests

    [Fact]
    public void YamlParseException_WithMessage_SetsMessage()
    {
        // Act
        var exception = new YamlParseException("Test error message");

        // Assert
        exception.Message.Should().Be("Test error message");
    }

    [Fact]
    public void YamlParseException_WithInnerException_SetsInnerException()
    {
        // Arrange
        var innerException = new InvalidOperationException("Inner error");

        // Act
        var exception = new YamlParseException("Outer error", innerException);

        // Assert
        exception.Message.Should().Be("Outer error");
        exception.InnerException.Should().Be(innerException);
    }

    #endregion
}
