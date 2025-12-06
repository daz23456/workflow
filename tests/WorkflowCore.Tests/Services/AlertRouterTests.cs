using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class AlertRouterTests
{
    private readonly Mock<ILogger<AlertRouter>> _loggerMock;
    private readonly IMemoryCache _cache;
    private readonly Mock<IAlertChannel> _slackChannelMock;
    private readonly Mock<IAlertChannel> _pagerDutyChannelMock;
    private readonly Mock<IAlertChannel> _webhookChannelMock;

    public AlertRouterTests()
    {
        _loggerMock = new Mock<ILogger<AlertRouter>>();
        _cache = new MemoryCache(new MemoryCacheOptions());

        _slackChannelMock = new Mock<IAlertChannel>();
        _slackChannelMock.Setup(c => c.ChannelType).Returns("slack");
        _slackChannelMock.Setup(c => c.IsConfigured()).Returns(true);
        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Succeeded(100, 200));

        _pagerDutyChannelMock = new Mock<IAlertChannel>();
        _pagerDutyChannelMock.Setup(c => c.ChannelType).Returns("pagerduty");
        _pagerDutyChannelMock.Setup(c => c.IsConfigured()).Returns(true);
        _pagerDutyChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Succeeded(150, 202));

        _webhookChannelMock = new Mock<IAlertChannel>();
        _webhookChannelMock.Setup(c => c.ChannelType).Returns("webhook");
        _webhookChannelMock.Setup(c => c.IsConfigured()).Returns(true);
        _webhookChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Succeeded(50, 200));
    }

    private AlertRouter CreateRouter(IEnumerable<IAlertChannel>? channels = null)
    {
        var channelList = channels ?? new[] { _slackChannelMock.Object, _pagerDutyChannelMock.Object, _webhookChannelMock.Object };
        return new AlertRouter(channelList, _cache, _loggerMock.Object);
    }

    private static AnomalyEvent CreateAnomaly(
        string workflowName = "test-workflow",
        AnomalySeverity severity = AnomalySeverity.Medium,
        string? taskId = null)
    {
        return new AnomalyEvent
        {
            Id = Guid.NewGuid().ToString(),
            WorkflowName = workflowName,
            TaskId = taskId,
            ExecutionId = Guid.NewGuid().ToString(),
            Severity = severity,
            MetricType = "duration",
            ActualValue = 1000,
            ExpectedValue = 500,
            ZScore = 3.5,
            DeviationPercent = 100,
            DetectedAt = DateTime.UtcNow,
            Description = "Test anomaly"
        };
    }

    #region Rule Management Tests

    [Fact]
    public void GetRules_WithNoRules_ReturnsEmptyList()
    {
        var router = CreateRouter();

        var rules = router.GetRules();

        rules.Should().BeEmpty();
    }

    [Fact]
    public void AddRule_AddsRuleToCollection()
    {
        var router = CreateRouter();
        var rule = new AlertRule { Name = "Test Rule", Channels = new List<string> { "slack" } };

        router.AddRule(rule);

        router.GetRules().Should().ContainSingle().Which.Name.Should().Be("Test Rule");
    }

    [Fact]
    public void AddRule_MultipleTimes_AddsAllRules()
    {
        var router = CreateRouter();
        var rule1 = new AlertRule { Name = "Rule 1" };
        var rule2 = new AlertRule { Name = "Rule 2" };

        router.AddRule(rule1);
        router.AddRule(rule2);

        router.GetRules().Should().HaveCount(2);
    }

    [Fact]
    public void RemoveRule_ExistingRule_ReturnsTrue()
    {
        var router = CreateRouter();
        var rule = new AlertRule { Id = "rule-1", Name = "Test Rule" };
        router.AddRule(rule);

        var result = router.RemoveRule("rule-1");

        result.Should().BeTrue();
        router.GetRules().Should().BeEmpty();
    }

    [Fact]
    public void RemoveRule_NonExistingRule_ReturnsFalse()
    {
        var router = CreateRouter();

        var result = router.RemoveRule("non-existent");

        result.Should().BeFalse();
    }

    [Fact]
    public void GetAvailableChannels_ReturnsRegisteredChannels()
    {
        var router = CreateRouter();

        var channels = router.GetAvailableChannels();

        channels.Should().Contain(new[] { "slack", "pagerduty", "webhook" });
    }

    #endregion

    #region Rule Matching Tests

    [Fact]
    public async Task RouteAnomaly_WithMatchingRule_SendsToConfiguredChannel()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Slack alerts",
            MinSeverity = AnomalySeverity.Low,
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly(severity: AnomalySeverity.Medium);

        var result = await router.RouteAnomalyAsync(anomaly);

        result.MatchedRuleCount.Should().Be(1);
        result.SuccessfulAlerts.Should().Be(1);
        _slackChannelMock.Verify(c => c.SendAlertAsync(anomaly, It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RouteAnomaly_WithNoMatchingRules_ReturnsZeroMatches()
    {
        var router = CreateRouter();
        // No rules configured
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.MatchedRuleCount.Should().Be(0);
        result.SuccessfulAlerts.Should().Be(0);
    }

    [Fact]
    public async Task RouteAnomaly_WithDisabledRule_DoesNotSend()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Disabled rule",
            Enabled = false,
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.MatchedRuleCount.Should().Be(0);
        _slackChannelMock.Verify(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region Workflow Pattern Matching Tests

    [Theory]
    [InlineData("order-processing", "order-*", true)]
    [InlineData("order-processing", "order-processing", true)]
    [InlineData("user-service", "order-*", false)]
    [InlineData("critical-payments", "*-payments", true)]
    [InlineData("anything", "*", true)]
    [InlineData("test-workflow", null, true)] // null pattern matches all
    public async Task RouteAnomaly_WorkflowPatternMatching_MatchesCorrectly(
        string workflowName, string? pattern, bool shouldMatch)
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Pattern rule",
            WorkflowPattern = pattern,
            MinSeverity = AnomalySeverity.Low,
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly(workflowName: workflowName);

        var result = await router.RouteAnomalyAsync(anomaly);

        if (shouldMatch)
        {
            result.MatchedRuleCount.Should().Be(1);
        }
        else
        {
            result.MatchedRuleCount.Should().Be(0);
        }
    }

    [Fact]
    public async Task RouteAnomaly_WithMultiplePatterns_MatchesAll()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Order rule",
            WorkflowPattern = "order-*",
            Channels = new List<string> { "slack" }
        });
        router.AddRule(new AlertRule
        {
            Name = "All workflows",
            WorkflowPattern = "*",
            Channels = new List<string> { "webhook" }
        });
        var anomaly = CreateAnomaly(workflowName: "order-processing");

        var result = await router.RouteAnomalyAsync(anomaly);

        result.MatchedRuleCount.Should().Be(2);
    }

    #endregion

    #region Severity Filtering Tests

    [Theory]
    [InlineData(AnomalySeverity.Low, AnomalySeverity.Low, true)]
    [InlineData(AnomalySeverity.Medium, AnomalySeverity.Low, true)]
    [InlineData(AnomalySeverity.High, AnomalySeverity.Medium, true)]
    [InlineData(AnomalySeverity.Critical, AnomalySeverity.High, true)]
    [InlineData(AnomalySeverity.Low, AnomalySeverity.Medium, false)]
    [InlineData(AnomalySeverity.Low, AnomalySeverity.High, false)]
    [InlineData(AnomalySeverity.Medium, AnomalySeverity.Critical, false)]
    public async Task RouteAnomaly_SeverityFiltering_FiltersCorrectly(
        AnomalySeverity anomalySeverity, AnomalySeverity minSeverity, bool shouldMatch)
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Severity rule",
            MinSeverity = minSeverity,
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly(severity: anomalySeverity);

        var result = await router.RouteAnomalyAsync(anomaly);

        if (shouldMatch)
        {
            result.MatchedRuleCount.Should().Be(1);
        }
        else
        {
            result.MatchedRuleCount.Should().Be(0);
        }
    }

    [Fact]
    public async Task RouteAnomaly_CriticalSeverity_MatchesAllRules()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule { Name = "Low", MinSeverity = AnomalySeverity.Low, Channels = new List<string> { "slack" } });
        router.AddRule(new AlertRule { Name = "Medium", MinSeverity = AnomalySeverity.Medium, Channels = new List<string> { "webhook" } });
        router.AddRule(new AlertRule { Name = "High", MinSeverity = AnomalySeverity.High, Channels = new List<string> { "pagerduty" } });
        var anomaly = CreateAnomaly(severity: AnomalySeverity.Critical);

        var result = await router.RouteAnomalyAsync(anomaly);

        result.MatchedRuleCount.Should().Be(3);
    }

    #endregion

    #region Cooldown Tests

    [Fact]
    public async Task RouteAnomaly_WithCooldown_SkipsSecondAlert()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "With cooldown",
            CooldownPeriod = TimeSpan.FromMinutes(15),
            Channels = new List<string> { "slack" }
        });
        var anomaly1 = CreateAnomaly(workflowName: "test-workflow");
        var anomaly2 = CreateAnomaly(workflowName: "test-workflow");

        // First alert should succeed
        var result1 = await router.RouteAnomalyAsync(anomaly1);
        // Second alert should be skipped
        var result2 = await router.RouteAnomalyAsync(anomaly2);

        result1.SuccessfulAlerts.Should().Be(1);
        result2.SkippedDueToCooldown.Should().Be(1);
        result2.SuccessfulAlerts.Should().Be(0);
    }

    [Fact]
    public async Task RouteAnomaly_DifferentWorkflows_NoCooldownInterference()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "With cooldown",
            CooldownPeriod = TimeSpan.FromMinutes(15),
            Channels = new List<string> { "slack" }
        });
        var anomaly1 = CreateAnomaly(workflowName: "workflow-a");
        var anomaly2 = CreateAnomaly(workflowName: "workflow-b");

        var result1 = await router.RouteAnomalyAsync(anomaly1);
        var result2 = await router.RouteAnomalyAsync(anomaly2);

        result1.SuccessfulAlerts.Should().Be(1);
        result2.SuccessfulAlerts.Should().Be(1);
        result2.SkippedDueToCooldown.Should().Be(0);
    }

    [Fact]
    public void IsInCooldown_BeforeFirstAlert_ReturnsFalse()
    {
        var router = CreateRouter();
        var rule = new AlertRule
        {
            Id = "rule-1",
            CooldownPeriod = TimeSpan.FromMinutes(15)
        };
        router.AddRule(rule);
        var anomaly = CreateAnomaly();

        var isInCooldown = router.IsInCooldown(anomaly, rule);

        isInCooldown.Should().BeFalse();
    }

    [Fact]
    public async Task IsInCooldown_AfterAlert_ReturnsTrue()
    {
        var router = CreateRouter();
        var rule = new AlertRule
        {
            Id = "rule-1",
            CooldownPeriod = TimeSpan.FromMinutes(15),
            Channels = new List<string> { "slack" }
        };
        router.AddRule(rule);
        var anomaly = CreateAnomaly();

        await router.RouteAnomalyAsync(anomaly);
        var isInCooldown = router.IsInCooldown(anomaly, rule);

        isInCooldown.Should().BeTrue();
    }

    [Fact]
    public async Task RouteAnomaly_NoCooldownConfigured_AlwaysSends()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "No cooldown",
            CooldownPeriod = null,
            Channels = new List<string> { "slack" }
        });
        var anomaly1 = CreateAnomaly(workflowName: "test-workflow");
        var anomaly2 = CreateAnomaly(workflowName: "test-workflow");

        var result1 = await router.RouteAnomalyAsync(anomaly1);
        var result2 = await router.RouteAnomalyAsync(anomaly2);

        result1.SuccessfulAlerts.Should().Be(1);
        result2.SuccessfulAlerts.Should().Be(1);
        result2.SkippedDueToCooldown.Should().Be(0);
    }

    #endregion

    #region Multi-Channel Routing Tests

    [Fact]
    public async Task RouteAnomaly_MultipleChannels_SendsToAll()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Multi-channel",
            Channels = new List<string> { "slack", "pagerduty", "webhook" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.SuccessfulAlerts.Should().Be(3);
        _slackChannelMock.Verify(c => c.SendAlertAsync(anomaly, It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Once);
        _pagerDutyChannelMock.Verify(c => c.SendAlertAsync(anomaly, It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Once);
        _webhookChannelMock.Verify(c => c.SendAlertAsync(anomaly, It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RouteAnomaly_UnknownChannel_IgnoresAndContinues()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "With unknown channel",
            Channels = new List<string> { "slack", "unknown", "webhook" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.SuccessfulAlerts.Should().Be(2); // slack and webhook succeed
    }

    [Fact]
    public async Task RouteAnomaly_UnconfiguredChannel_Skips()
    {
        var unconfiguredChannel = new Mock<IAlertChannel>();
        unconfiguredChannel.Setup(c => c.ChannelType).Returns("email");
        unconfiguredChannel.Setup(c => c.IsConfigured()).Returns(false);

        var router = CreateRouter(new[] { _slackChannelMock.Object, unconfiguredChannel.Object });
        router.AddRule(new AlertRule
        {
            Name = "With unconfigured channel",
            Channels = new List<string> { "slack", "email" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.SuccessfulAlerts.Should().Be(1); // Only slack
        unconfiguredChannel.Verify(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region Channel Failure Handling Tests

    [Fact]
    public async Task RouteAnomaly_ChannelFails_RecordsFailure()
    {
        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Failed("Connection refused", 500, 503));

        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Slack rule",
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.FailedAlerts.Should().Be(1);
        result.SuccessfulAlerts.Should().Be(0);
        result.AlertHistory.Should().ContainSingle()
            .Which.Success.Should().BeFalse();
    }

    [Fact]
    public async Task RouteAnomaly_PartialFailure_RecordsBoth()
    {
        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Failed("Error", 100));

        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Multi-channel",
            Channels = new List<string> { "slack", "webhook" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.FailedAlerts.Should().Be(1);
        result.SuccessfulAlerts.Should().Be(1);
        result.AlertHistory.Should().HaveCount(2);
    }

    [Fact]
    public async Task RouteAnomaly_ChannelThrowsException_HandlesGracefully()
    {
        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Network error"));

        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Name = "Slack rule",
            Channels = new List<string> { "slack", "webhook" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        result.FailedAlerts.Should().Be(1);
        result.SuccessfulAlerts.Should().Be(1); // webhook still succeeds
    }

    #endregion

    #region Alert History Recording Tests

    [Fact]
    public async Task RouteAnomaly_RecordsAlertHistory()
    {
        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Id = "rule-1",
            Name = "Slack rule",
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly(workflowName: "test-workflow", severity: AnomalySeverity.High);

        var result = await router.RouteAnomalyAsync(anomaly);

        result.AlertHistory.Should().ContainSingle();
        var history = result.AlertHistory[0];
        history.AnomalyEventId.Should().Be(anomaly.Id);
        history.RuleId.Should().Be("rule-1");
        history.Channel.Should().Be("slack");
        history.Success.Should().BeTrue();
        history.WorkflowName.Should().Be("test-workflow");
        history.Severity.Should().Be(AnomalySeverity.High);
        history.DurationMs.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task RouteAnomaly_RecordsFailureDetails()
    {
        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AlertSendResult.Failed("Service unavailable", 200, 503));

        var router = CreateRouter();
        router.AddRule(new AlertRule
        {
            Id = "rule-1",
            Name = "Slack rule",
            Channels = new List<string> { "slack" }
        });
        var anomaly = CreateAnomaly();

        var result = await router.RouteAnomalyAsync(anomaly);

        var history = result.AlertHistory[0];
        history.Success.Should().BeFalse();
        history.ErrorMessage.Should().Be("Service unavailable");
        history.StatusCode.Should().Be(503);
    }

    #endregion

    #region Priority Ordering Tests

    [Fact]
    public async Task RouteAnomaly_RulesEvaluatedByPriority()
    {
        var router = CreateRouter();
        var callOrder = new List<string>();

        _slackChannelMock.Setup(c => c.SendAlertAsync(It.IsAny<AnomalyEvent>(), It.IsAny<AlertRule>(), It.IsAny<CancellationToken>()))
            .Callback<AnomalyEvent, AlertRule, CancellationToken>((a, r, ct) => callOrder.Add(r.Name))
            .ReturnsAsync(AlertSendResult.Succeeded(100));

        router.AddRule(new AlertRule { Name = "Low Priority", Priority = 1, Channels = new List<string> { "slack" } });
        router.AddRule(new AlertRule { Name = "High Priority", Priority = 10, Channels = new List<string> { "slack" } });
        router.AddRule(new AlertRule { Name = "Medium Priority", Priority = 5, Channels = new List<string> { "slack" } });

        var anomaly = CreateAnomaly();
        await router.RouteAnomalyAsync(anomaly);

        callOrder.Should().ContainInOrder("High Priority", "Medium Priority", "Low Priority");
    }

    #endregion
}
