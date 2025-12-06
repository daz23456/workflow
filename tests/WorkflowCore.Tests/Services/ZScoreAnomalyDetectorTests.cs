using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class ZScoreAnomalyDetectorTests
{
    private readonly Mock<IAnomalyBaselineService> _baselineServiceMock;
    private readonly ZScoreAnomalyDetector _detector;

    public ZScoreAnomalyDetectorTests()
    {
        _baselineServiceMock = new Mock<IAnomalyBaselineService>();
        _detector = new ZScoreAnomalyDetector(_baselineServiceMock.Object);
    }

    #region GetThreshold Tests

    [Fact]
    public void GetThreshold_Low_Returns2()
    {
        // Act
        var threshold = _detector.GetThreshold(AnomalySeverity.Low);

        // Assert
        threshold.Should().Be(2.0);
    }

    [Fact]
    public void GetThreshold_Medium_Returns3()
    {
        // Act
        var threshold = _detector.GetThreshold(AnomalySeverity.Medium);

        // Assert
        threshold.Should().Be(3.0);
    }

    [Fact]
    public void GetThreshold_High_Returns4()
    {
        // Act
        var threshold = _detector.GetThreshold(AnomalySeverity.High);

        // Assert
        threshold.Should().Be(4.0);
    }

    [Fact]
    public void GetThreshold_Critical_Returns5()
    {
        // Act
        var threshold = _detector.GetThreshold(AnomalySeverity.Critical);

        // Assert
        threshold.Should().Be(5.0);
    }

    #endregion

    #region GetSeverity Tests

    [Theory]
    [InlineData(0.0)]
    [InlineData(1.0)]
    [InlineData(1.99)]
    public void GetSeverity_BelowLowThreshold_ReturnsNull(double zScore)
    {
        // Act
        var severity = _detector.GetSeverity(zScore);

        // Assert
        severity.Should().BeNull();
    }

    [Theory]
    [InlineData(2.0)]
    [InlineData(2.5)]
    [InlineData(2.99)]
    public void GetSeverity_BetweenLowAndMedium_ReturnsLow(double zScore)
    {
        // Act
        var severity = _detector.GetSeverity(zScore);

        // Assert
        severity.Should().Be(AnomalySeverity.Low);
    }

    [Theory]
    [InlineData(3.0)]
    [InlineData(3.5)]
    [InlineData(3.99)]
    public void GetSeverity_BetweenMediumAndHigh_ReturnsMedium(double zScore)
    {
        // Act
        var severity = _detector.GetSeverity(zScore);

        // Assert
        severity.Should().Be(AnomalySeverity.Medium);
    }

    [Theory]
    [InlineData(4.0)]
    [InlineData(4.5)]
    [InlineData(4.99)]
    public void GetSeverity_BetweenHighAndCritical_ReturnsHigh(double zScore)
    {
        // Act
        var severity = _detector.GetSeverity(zScore);

        // Assert
        severity.Should().Be(AnomalySeverity.High);
    }

    [Theory]
    [InlineData(5.0)]
    [InlineData(6.0)]
    [InlineData(10.0)]
    public void GetSeverity_AboveCritical_ReturnsCritical(double zScore)
    {
        // Act
        var severity = _detector.GetSeverity(zScore);

        // Assert
        severity.Should().Be(AnomalySeverity.Critical);
    }

    #endregion

    #region EvaluateAsync - No Baseline Tests

    [Fact]
    public async Task EvaluateAsync_NoBaseline_ReturnsNull()
    {
        // Arrange
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync((AnomalyBaseline?)null);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 1000, "exec-123");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task EvaluateAsync_ZeroStdDev_ReturnsNull()
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 0 // Zero std dev - can't calculate Z-score
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 200, "exec-123");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region EvaluateAsync - Normal Range Tests

    [Theory]
    [InlineData(100, 100, 10)]     // Exactly at mean (Z=0)
    [InlineData(100, 110, 10)]     // 1 std dev above (Z=1)
    [InlineData(100, 90, 10)]      // 1 std dev below (Z=-1)
    [InlineData(100, 119, 10)]     // Just under threshold (Z=1.9)
    public async Task EvaluateAsync_WithinNormalRange_ReturnsNull(
        double mean, double actual, double stdDev)
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = mean,
            StdDevDurationMs = stdDev
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, actual, "exec-123");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region EvaluateAsync - Anomaly Detection Tests

    [Fact]
    public async Task EvaluateAsync_LowAnomaly_SlowerThanExpected_ReturnsLowSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=125 => Z-score = 2.5
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 125, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Low);
        result.ZScore.Should().BeApproximately(2.5, 0.01);
        result.ActualValue.Should().Be(125);
        result.ExpectedValue.Should().Be(100);
        result.DeviationPercent.Should().BeApproximately(25, 0.01);
    }

    [Fact]
    public async Task EvaluateAsync_MediumAnomaly_ReturnsCorrectSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=135 => Z-score = 3.5
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 135, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Medium);
        result.ZScore.Should().BeApproximately(3.5, 0.01);
    }

    [Fact]
    public async Task EvaluateAsync_HighAnomaly_ReturnsCorrectSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=145 => Z-score = 4.5
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 145, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.High);
        result.ZScore.Should().BeApproximately(4.5, 0.01);
    }

    [Fact]
    public async Task EvaluateAsync_CriticalAnomaly_ReturnsCorrectSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=160 => Z-score = 6.0
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 160, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Critical);
        result.ZScore.Should().BeApproximately(6.0, 0.01);
    }

    #endregion

    #region EvaluateAsync - Negative Z-Score (Faster Than Expected) Tests

    [Fact]
    public async Task EvaluateAsync_FasterThanExpected_LowAnomaly_ReturnsLowSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=75 => Z-score = -2.5
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 75, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Low);
        result.ZScore.Should().BeApproximately(-2.5, 0.01);
        result.DeviationPercent.Should().BeApproximately(-25, 0.01);
    }

    [Fact]
    public async Task EvaluateAsync_FasterThanExpected_CriticalAnomaly_ReturnsCriticalSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=40 => Z-score = -6.0
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 40, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Critical);
        result.ZScore.Should().BeApproximately(-6.0, 0.01);
    }

    #endregion

    #region EvaluateAsync - Task-Level Detection Tests

    [Fact]
    public async Task EvaluateAsync_WithTaskId_CallsBaselineServiceWithTaskId()
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            TaskId = "task-1",
            MeanDurationMs = 50,
            StdDevDurationMs = 5
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", "task-1"))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", "task-1", 65, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.TaskId.Should().Be("task-1");
        _baselineServiceMock.Verify(x => x.GetBaselineAsync("test-workflow", "task-1"), Times.Once);
    }

    #endregion

    #region EvaluateAsync - Event Properties Tests

    [Fact]
    public async Task EvaluateAsync_PopulatesAllEventProperties()
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "order-workflow",
            MeanDurationMs = 200,
            StdDevDurationMs = 20
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("order-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("order-workflow", null, 260, "exec-456");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().NotBeNullOrEmpty();
        result.WorkflowName.Should().Be("order-workflow");
        result.TaskId.Should().BeNull();
        result.ExecutionId.Should().Be("exec-456");
        result.Severity.Should().Be(AnomalySeverity.Medium); // Z-score = 3
        result.MetricType.Should().Be("duration");
        result.ActualValue.Should().Be(260);
        result.ExpectedValue.Should().Be(200);
        result.ZScore.Should().BeApproximately(3.0, 0.01);
        result.DeviationPercent.Should().BeApproximately(30, 0.01);
        result.DetectedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.Description.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task EvaluateAsync_GeneratesDescriptiveDescription_SlowerThanExpected()
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 130, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Description.Should().Contain("slower");
        result.Description.Should().Contain("3"); // Z-score
    }

    [Fact]
    public async Task EvaluateAsync_GeneratesDescriptiveDescription_FasterThanExpected()
    {
        // Arrange
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 70, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Description.Should().Contain("faster");
    }

    #endregion

    #region EvaluateAsync - Boundary Tests

    [Fact]
    public async Task EvaluateAsync_ExactlyAtLowThreshold_ReturnsLowSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=120 => Z-score = 2.0 (exactly at threshold)
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 120, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Low);
        result.ZScore.Should().BeApproximately(2.0, 0.01);
    }

    [Fact]
    public async Task EvaluateAsync_ExactlyAtMediumThreshold_ReturnsMediumSeverity()
    {
        // Arrange: mean=100, stdDev=10, actual=130 => Z-score = 3.0 (exactly at threshold)
        var baseline = new AnomalyBaseline
        {
            WorkflowName = "test-workflow",
            MeanDurationMs = 100,
            StdDevDurationMs = 10
        };
        _baselineServiceMock
            .Setup(x => x.GetBaselineAsync("test-workflow", null))
            .ReturnsAsync(baseline);

        // Act
        var result = await _detector.EvaluateAsync("test-workflow", null, 130, "exec-123");

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Medium);
    }

    #endregion
}
