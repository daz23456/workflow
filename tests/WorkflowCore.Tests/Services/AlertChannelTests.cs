using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowCore.Services.AlertChannels;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class AlertChannelTests
{
    private static AnomalyEvent CreateAnomaly(
        string workflowName = "test-workflow",
        AnomalySeverity severity = AnomalySeverity.Medium,
        string? taskId = null)
    {
        return new AnomalyEvent
        {
            Id = "anomaly-123",
            WorkflowName = workflowName,
            TaskId = taskId,
            ExecutionId = "exec-456",
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

    private static AlertRule CreateRule(string name = "Test Rule")
    {
        return new AlertRule
        {
            Id = "rule-1",
            Name = name,
            MinSeverity = AnomalySeverity.Low,
            Channels = new List<string> { "slack" }
        };
    }

    #region WebhookAlertChannel Tests

    public class WebhookAlertChannelTests
    {
        private readonly Mock<ILogger<WebhookAlertChannel>> _loggerMock;

        public WebhookAlertChannelTests()
        {
            _loggerMock = new Mock<ILogger<WebhookAlertChannel>>();
        }

        [Fact]
        public void ChannelType_ReturnsWebhook()
        {
            var channel = CreateChannel();
            channel.ChannelType.Should().Be("webhook");
        }

        [Fact]
        public void IsConfigured_WithUrl_ReturnsTrue()
        {
            var channel = CreateChannel(url: "https://example.com/webhook");
            channel.IsConfigured().Should().BeTrue();
        }

        [Fact]
        public void IsConfigured_WithoutUrl_ReturnsFalse()
        {
            var channel = CreateChannel(url: null);
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public async Task SendAlertAsync_NotConfigured_ReturnsFailure()
        {
            var channel = CreateChannel(url: null);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeFalse();
            result.ErrorMessage.Should().Contain("not configured");
        }

        [Fact]
        public async Task SendAlertAsync_Success_ReturnsSuccessResult()
        {
            var handlerMock = CreateMockHandler(HttpStatusCode.OK, "{}");
            var channel = CreateChannel(url: "https://example.com/webhook", handlerMock: handlerMock);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeTrue();
            result.StatusCode.Should().Be(200);
        }

        [Fact]
        public async Task SendAlertAsync_HttpError_ReturnsFailure()
        {
            var handlerMock = CreateMockHandler(HttpStatusCode.InternalServerError, "Server error");
            var channel = CreateChannel(url: "https://example.com/webhook", handlerMock: handlerMock);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeFalse();
            result.StatusCode.Should().Be(500);
            result.ErrorMessage.Should().Contain("Server error");
        }

        private WebhookAlertChannel CreateChannel(string? url = "https://example.com/webhook", Mock<HttpMessageHandler>? handlerMock = null)
        {
            handlerMock ??= CreateMockHandler(HttpStatusCode.OK, "{}");
            var httpClient = new HttpClient(handlerMock.Object);
            var options = Options.Create(new WebhookAlertChannelOptions { Url = url });
            return new WebhookAlertChannel(httpClient, options, _loggerMock.Object);
        }

        private static Mock<HttpMessageHandler> CreateMockHandler(HttpStatusCode statusCode, string content)
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = new StringContent(content)
                });
            return handlerMock;
        }
    }

    #endregion

    #region SlackAlertChannel Tests

    public class SlackAlertChannelTests
    {
        private readonly Mock<ILogger<SlackAlertChannel>> _loggerMock;

        public SlackAlertChannelTests()
        {
            _loggerMock = new Mock<ILogger<SlackAlertChannel>>();
        }

        [Fact]
        public void ChannelType_ReturnsSlack()
        {
            var channel = CreateChannel();
            channel.ChannelType.Should().Be("slack");
        }

        [Fact]
        public void IsConfigured_WithWebhookUrl_ReturnsTrue()
        {
            var channel = CreateChannel(webhookUrl: "https://hooks.slack.com/test");
            channel.IsConfigured().Should().BeTrue();
        }

        [Fact]
        public void IsConfigured_WithoutWebhookUrl_ReturnsFalse()
        {
            var channel = CreateChannel(webhookUrl: null);
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public async Task SendAlertAsync_NotConfigured_ReturnsFailure()
        {
            var channel = CreateChannel(webhookUrl: null);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeFalse();
            result.ErrorMessage.Should().Contain("not configured");
        }

        [Fact]
        public async Task SendAlertAsync_Success_ReturnsSuccessResult()
        {
            var handlerMock = CreateMockHandler(HttpStatusCode.OK, "ok");
            var channel = CreateChannel(webhookUrl: "https://hooks.slack.com/test", handlerMock: handlerMock);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeTrue();
            result.StatusCode.Should().Be(200);
        }

        [Theory]
        [InlineData(AnomalySeverity.Critical)]
        [InlineData(AnomalySeverity.High)]
        [InlineData(AnomalySeverity.Medium)]
        [InlineData(AnomalySeverity.Low)]
        public async Task SendAlertAsync_AllSeverities_SendsSuccessfully(AnomalySeverity severity)
        {
            var handlerMock = CreateMockHandler(HttpStatusCode.OK, "ok");
            var channel = CreateChannel(webhookUrl: "https://hooks.slack.com/test", handlerMock: handlerMock);
            var anomaly = CreateAnomaly(severity: severity);
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeTrue();
        }

        private SlackAlertChannel CreateChannel(string? webhookUrl = "https://hooks.slack.com/test", Mock<HttpMessageHandler>? handlerMock = null)
        {
            handlerMock ??= CreateMockHandler(HttpStatusCode.OK, "ok");
            var httpClient = new HttpClient(handlerMock.Object);
            var options = Options.Create(new SlackAlertChannelOptions { WebhookUrl = webhookUrl });
            return new SlackAlertChannel(httpClient, options, _loggerMock.Object);
        }

        private static Mock<HttpMessageHandler> CreateMockHandler(HttpStatusCode statusCode, string content)
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = new StringContent(content)
                });
            return handlerMock;
        }
    }

    #endregion

    #region PagerDutyAlertChannel Tests

    public class PagerDutyAlertChannelTests
    {
        private readonly Mock<ILogger<PagerDutyAlertChannel>> _loggerMock;

        public PagerDutyAlertChannelTests()
        {
            _loggerMock = new Mock<ILogger<PagerDutyAlertChannel>>();
        }

        [Fact]
        public void ChannelType_ReturnsPagerDuty()
        {
            var channel = CreateChannel();
            channel.ChannelType.Should().Be("pagerduty");
        }

        [Fact]
        public void IsConfigured_WithRoutingKey_ReturnsTrue()
        {
            var channel = CreateChannel(routingKey: "test-routing-key");
            channel.IsConfigured().Should().BeTrue();
        }

        [Fact]
        public void IsConfigured_WithoutRoutingKey_ReturnsFalse()
        {
            var channel = CreateChannel(routingKey: null);
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public async Task SendAlertAsync_NotConfigured_ReturnsFailure()
        {
            var channel = CreateChannel(routingKey: null);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeFalse();
            result.ErrorMessage.Should().Contain("not configured");
        }

        [Fact]
        public async Task SendAlertAsync_Success_ReturnsSuccessResult()
        {
            var handlerMock = CreateMockHandler(HttpStatusCode.Accepted, @"{""status"": ""success""}");
            var channel = CreateChannel(routingKey: "test-key", handlerMock: handlerMock);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeTrue();
            result.StatusCode.Should().Be(202);
        }

        [Theory]
        [InlineData(AnomalySeverity.Critical, "critical")]
        [InlineData(AnomalySeverity.High, "error")]
        [InlineData(AnomalySeverity.Medium, "warning")]
        [InlineData(AnomalySeverity.Low, "info")]
        public async Task SendAlertAsync_SeverityMapping_MapsCorrectly(AnomalySeverity severity, string expectedPdSeverity)
        {
            string? capturedBody = null;
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>(async (req, _) =>
                {
                    capturedBody = await req.Content!.ReadAsStringAsync();
                })
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Accepted,
                    Content = new StringContent(@"{""status"": ""success""}")
                });

            var channel = CreateChannel(routingKey: "test-key", handlerMock: handlerMock);
            var anomaly = CreateAnomaly(severity: severity);
            var rule = CreateRule();

            await channel.SendAlertAsync(anomaly, rule);

            capturedBody.Should().NotBeNull();
            capturedBody.Should().Contain($@"""severity"":""{expectedPdSeverity}""");
        }

        private PagerDutyAlertChannel CreateChannel(string? routingKey = "test-key", Mock<HttpMessageHandler>? handlerMock = null)
        {
            handlerMock ??= CreateMockHandler(HttpStatusCode.Accepted, @"{""status"": ""success""}");
            var httpClient = new HttpClient(handlerMock.Object);
            var options = Options.Create(new PagerDutyAlertChannelOptions { RoutingKey = routingKey });
            return new PagerDutyAlertChannel(httpClient, options, _loggerMock.Object);
        }

        private static Mock<HttpMessageHandler> CreateMockHandler(HttpStatusCode statusCode, string content)
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = new StringContent(content)
                });
            return handlerMock;
        }
    }

    #endregion

    #region EmailAlertChannel Tests

    public class EmailAlertChannelTests
    {
        private readonly Mock<ILogger<EmailAlertChannel>> _loggerMock;

        public EmailAlertChannelTests()
        {
            _loggerMock = new Mock<ILogger<EmailAlertChannel>>();
        }

        [Fact]
        public void ChannelType_ReturnsEmail()
        {
            var channel = CreateChannel();
            channel.ChannelType.Should().Be("email");
        }

        [Fact]
        public void IsConfigured_WithAllSettings_ReturnsTrue()
        {
            var channel = CreateChannel(
                smtpHost: "smtp.example.com",
                fromAddress: "alerts@example.com",
                toAddresses: "team@example.com");
            channel.IsConfigured().Should().BeTrue();
        }

        [Fact]
        public void IsConfigured_WithoutSmtpHost_ReturnsFalse()
        {
            var channel = CreateChannel(
                smtpHost: null,
                fromAddress: "alerts@example.com",
                toAddresses: "team@example.com");
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public void IsConfigured_WithoutFromAddress_ReturnsFalse()
        {
            var channel = CreateChannel(
                smtpHost: "smtp.example.com",
                fromAddress: null,
                toAddresses: "team@example.com");
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public void IsConfigured_WithoutToAddresses_ReturnsFalse()
        {
            var channel = CreateChannel(
                smtpHost: "smtp.example.com",
                fromAddress: "alerts@example.com",
                toAddresses: null);
            channel.IsConfigured().Should().BeFalse();
        }

        [Fact]
        public async Task SendAlertAsync_NotConfigured_ReturnsFailure()
        {
            var channel = CreateChannel(smtpHost: null);
            var anomaly = CreateAnomaly();
            var rule = CreateRule();

            var result = await channel.SendAlertAsync(anomaly, rule);

            result.Success.Should().BeFalse();
            result.ErrorMessage.Should().Contain("not configured");
        }

        private EmailAlertChannel CreateChannel(
            string? smtpHost = "smtp.example.com",
            string? fromAddress = "alerts@example.com",
            string? toAddresses = "team@example.com")
        {
            var options = Options.Create(new EmailAlertChannelOptions
            {
                SmtpHost = smtpHost,
                FromAddress = fromAddress,
                ToAddresses = toAddresses
            });
            return new EmailAlertChannel(options, _loggerMock.Object);
        }
    }

    #endregion
}
