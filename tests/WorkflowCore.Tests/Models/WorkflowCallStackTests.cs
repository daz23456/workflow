using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for WorkflowCallStack model.
/// Stage 21.3: Cycle Detection & Limits
/// </summary>
public class WorkflowCallStackTests
{
    [Fact]
    public void NewCallStack_HasZeroDepth()
    {
        var stack = new WorkflowCallStack();

        stack.CurrentDepth.Should().Be(0);
        stack.WorkflowNames.Should().BeEmpty();
    }

    [Fact]
    public void Push_AddsWorkflowToStack()
    {
        var stack = new WorkflowCallStack();

        stack.Push("workflow-a");

        stack.CurrentDepth.Should().Be(1);
        stack.Contains("workflow-a").Should().BeTrue();
    }

    [Fact]
    public void Push_MultipleWorkflows_TracksAll()
    {
        var stack = new WorkflowCallStack();

        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        stack.CurrentDepth.Should().Be(3);
        stack.Contains("workflow-a").Should().BeTrue();
        stack.Contains("workflow-b").Should().BeTrue();
        stack.Contains("workflow-c").Should().BeTrue();
    }

    [Fact]
    public void Push_ThrowsOnNullOrEmpty()
    {
        var stack = new WorkflowCallStack();

        var actNull = () => stack.Push(null!);
        var actEmpty = () => stack.Push("");

        actNull.Should().Throw<ArgumentException>();
        actEmpty.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Pop_RemovesWorkflowFromStack()
    {
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        var popped = stack.Pop();

        popped.Should().Be("workflow-b");
        stack.CurrentDepth.Should().Be(1);
        stack.Contains("workflow-b").Should().BeFalse();
    }

    [Fact]
    public void Pop_OnEmptyStack_ThrowsException()
    {
        var stack = new WorkflowCallStack();

        var act = () => stack.Pop();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*empty*");
    }

    [Fact]
    public void Contains_ReturnsFalseForUnknownWorkflow()
    {
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");

        stack.Contains("workflow-b").Should().BeFalse();
    }

    [Fact]
    public void IsAtMaxDepth_ReturnsFalseWhenBelowLimit()
    {
        var stack = new WorkflowCallStack { MaxDepth = 5 };
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        stack.IsAtMaxDepth().Should().BeFalse();
    }

    [Fact]
    public void IsAtMaxDepth_ReturnsTrueWhenAtLimit()
    {
        var stack = new WorkflowCallStack { MaxDepth = 3 };
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        stack.IsAtMaxDepth().Should().BeTrue();
    }

    [Fact]
    public void MaxDepth_DefaultsToFive()
    {
        var stack = new WorkflowCallStack();

        stack.MaxDepth.Should().Be(5);
    }

    [Fact]
    public void GetPath_ReturnsEmptyForEmptyStack()
    {
        var stack = new WorkflowCallStack();

        stack.GetPath().Should().BeEmpty();
    }

    [Fact]
    public void GetPath_ReturnsArrowSeparatedPath()
    {
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        stack.GetPath().Should().Be("workflow-a → workflow-b → workflow-c");
    }

    [Fact]
    public void GetCyclePath_IncludesCycleWorkflow()
    {
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");

        stack.GetCyclePath("workflow-a").Should().Be("workflow-a → workflow-b → workflow-a");
    }

    [Fact]
    public void Clone_CreatesIndependentCopy()
    {
        var original = new WorkflowCallStack { MaxDepth = 10 };
        original.Push("workflow-a");
        original.Push("workflow-b");

        var clone = original.Clone();
        clone.Push("workflow-c");

        original.CurrentDepth.Should().Be(2);
        clone.CurrentDepth.Should().Be(3);
        clone.MaxDepth.Should().Be(10);
    }

    [Fact]
    public void WorkflowNames_ReturnsOrderedList()
    {
        var stack = new WorkflowCallStack();
        stack.Push("workflow-a");
        stack.Push("workflow-b");
        stack.Push("workflow-c");

        stack.WorkflowNames.Should().BeEquivalentTo(
            new[] { "workflow-a", "workflow-b", "workflow-c" },
            options => options.WithStrictOrdering());
    }
}
