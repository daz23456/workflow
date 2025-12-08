using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for TaskImpactAnalysis model - represents the impact of task changes.
/// </summary>
public class TaskImpactAnalysisTests
{
    [Fact]
    public void TaskImpactAnalysis_ShouldHaveTaskName()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user"
        };

        analysis.TaskName.Should().Be("get-user");
    }

    [Fact]
    public void TaskImpactAnalysis_ShouldHaveAffectedWorkflows()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user",
            AffectedWorkflows = new List<string> { "user-profile", "user-notifications" }
        };

        analysis.AffectedWorkflows.Should().HaveCount(2);
    }

    [Fact]
    public void TaskImpactAnalysis_ShouldIndicateBreakingChange()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user",
            IsBreaking = true,
            BreakingReason = "Removed required output field 'email'"
        };

        analysis.IsBreaking.Should().BeTrue();
        analysis.BreakingReason.Should().Contain("email");
    }

    [Fact]
    public void TaskImpactAnalysis_ShouldCalculateImpactLevel()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user",
            AffectedWorkflows = new List<string> { "wf1", "wf2", "wf3", "wf4", "wf5" },
            IsBreaking = true
        };

        // High impact: breaking change with 5+ dependent workflows
        analysis.ImpactLevel.Should().Be(ImpactLevel.High);
    }

    [Fact]
    public void TaskImpactAnalysis_ShouldHaveSuggestedActions()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user",
            IsBreaking = true,
            SuggestedActions = new List<string>
            {
                "Create new task version get-user-v2",
                "Notify dependent workflow owners",
                "Add migration path"
            }
        };

        analysis.SuggestedActions.Should().HaveCount(3);
    }

    [Fact]
    public void TaskImpactAnalysis_CanProceed_ShouldReturnFalseWhenBlocked()
    {
        var analysis = new TaskImpactAnalysis
        {
            TaskName = "get-user",
            IsBreaking = true,
            AffectedWorkflows = new List<string> { "critical-workflow" },
            BlockedBy = new List<string> { "critical-workflow" }
        };

        analysis.CanProceed.Should().BeFalse();
    }
}
