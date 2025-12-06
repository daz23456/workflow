using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for WorkflowCycleDetector service.
/// Stage 21.3: Cycle Detection & Limits
/// </summary>
public class WorkflowCycleDetectorTests
{
    private readonly WorkflowCycleDetector _detector = new();

    [Fact]
    public void CheckBeforeExecution_LinearChain_AllowsExecution()
    {
        // A → B → C (no cycle)
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        var result = _detector.CheckBeforeExecution("workflow-c", stack);

        result.CanProceed.Should().BeTrue();
        result.Issue.Should().Be(CycleDetectionIssue.None);
    }

    [Fact]
    public void CheckBeforeExecution_DirectCycle_DetectsCycle()
    {
        // A → A (direct cycle)
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");

        var result = _detector.CheckBeforeExecution("workflow-a", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.CycleDetected);
        result.Path.Should().Be("workflow-a → workflow-a");
        result.Error.Should().Contain("Cycle detected");
    }

    [Fact]
    public void CheckBeforeExecution_IndirectCycle_DetectsCycle()
    {
        // A → B → A (indirect cycle)
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        var result = _detector.CheckBeforeExecution("workflow-a", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.CycleDetected);
        result.Path.Should().Be("workflow-a → workflow-b → workflow-a");
    }

    [Fact]
    public void CheckBeforeExecution_DeepIndirectCycle_DetectsCycle()
    {
        // A → B → C → A (deep indirect cycle)
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        var result = _detector.CheckBeforeExecution("workflow-a", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.CycleDetected);
        result.Path.Should().Be("workflow-a → workflow-b → workflow-c → workflow-a");
    }

    [Fact]
    public void CheckBeforeExecution_MaxDepthExceeded_ReturnsError()
    {
        var stack = new WorkflowCallStack { MaxDepth = 3 };
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        var result = _detector.CheckBeforeExecution("workflow-d", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.MaxDepthExceeded);
        result.Error.Should().Contain("Maximum nesting depth (3) exceeded");
    }

    [Fact]
    public void CheckBeforeExecution_AtMaxDepthMinusOne_Allows()
    {
        var stack = new WorkflowCallStack { MaxDepth = 3 };
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        var result = _detector.CheckBeforeExecution("workflow-c", stack);

        result.CanProceed.Should().BeTrue();
    }

    [Fact]
    public void CheckBeforeExecution_CustomMaxDepth_Enforced()
    {
        var stack = new WorkflowCallStack { MaxDepth = 2 };
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        var result = _detector.CheckBeforeExecution("workflow-c", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.MaxDepthExceeded);
    }

    [Fact]
    public void CheckBeforeExecution_EmptyStack_AllowsFirstWorkflow()
    {
        var stack = new WorkflowCallStack();

        var result = _detector.CheckBeforeExecution("workflow-a", stack);

        result.CanProceed.Should().BeTrue();
    }

    [Fact]
    public void CheckBeforeExecution_ThrowsOnNullWorkflowName()
    {
        var stack = new WorkflowCallStack();

        var act = () => _detector.CheckBeforeExecution(null!, stack);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CheckBeforeExecution_ThrowsOnEmptyWorkflowName()
    {
        var stack = new WorkflowCallStack();

        var act = () => _detector.CheckBeforeExecution("", stack);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CheckBeforeExecution_ThrowsOnNullCallStack()
    {
        var act = () => _detector.CheckBeforeExecution("workflow-a", null!);

        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void CheckBeforeExecution_CycleInMiddle_Detected()
    {
        // A → B → C → B (cycle to B)
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        var result = _detector.CheckBeforeExecution("workflow-b", stack);

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.CycleDetected);
        result.Path.Should().Contain("workflow-b");
    }

    [Fact]
    public void CycleDetectionResult_Success_HasCorrectProperties()
    {
        var result = CycleDetectionResult.Success();

        result.CanProceed.Should().BeTrue();
        result.Issue.Should().Be(CycleDetectionIssue.None);
        result.Error.Should().BeNull();
        result.Path.Should().BeNull();
    }

    [Fact]
    public void CycleDetectionResult_CycleDetected_HasCorrectProperties()
    {
        var result = CycleDetectionResult.CycleDetected("A → B → A", "A");

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.CycleDetected);
        result.Error.Should().Contain("Cycle detected");
        result.Path.Should().Be("A → B → A");
    }

    [Fact]
    public void CycleDetectionResult_MaxDepthExceeded_HasCorrectProperties()
    {
        var result = CycleDetectionResult.MaxDepthExceeded(5, "A → B → C → D → E → F");

        result.CanProceed.Should().BeFalse();
        result.Issue.Should().Be(CycleDetectionIssue.MaxDepthExceeded);
        result.Error.Should().Contain("Maximum nesting depth (5) exceeded");
        result.Path.Should().Be("A → B → C → D → E → F");
    }
}
