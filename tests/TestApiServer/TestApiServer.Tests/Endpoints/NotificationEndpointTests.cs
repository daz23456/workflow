using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class NotificationEndpointTests
{
    private readonly HttpClient _client;

    public NotificationEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task SendEmail_ShouldSendEmail()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/email", new
        {
            to = "test@example.com",
            subject = "Test Subject",
            body = "Test body content"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("notificationId").GetString().Should().StartWith("notif-");
        content.GetProperty("channel").GetString().Should().Be("email");
        content.GetProperty("status").GetString().Should().Be("sent");
    }

    [Fact]
    public async Task SendSms_ShouldSendSms()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/sms", new
        {
            phoneNumber = "+1234567890",
            message = "Test SMS message"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("notificationId").GetString().Should().StartWith("sms-");
        content.GetProperty("channel").GetString().Should().Be("sms");
        content.GetProperty("segments").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SendPush_ShouldSendPush()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/push", new
        {
            userId = "1",
            title = "Test Push",
            body = "Push notification body"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("notificationId").GetString().Should().StartWith("push-");
        content.GetProperty("channel").GetString().Should().Be("push");
        content.GetProperty("status").GetString().Should().Be("delivered");
    }

    [Fact]
    public async Task ListTemplates_ShouldReturnTemplates()
    {
        var response = await _client.GetAsync("/api/notifications/templates");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("templates").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetTemplate_ExistingTemplate_ShouldReturnTemplate()
    {
        var response = await _client.GetAsync("/api/notifications/templates/welcome");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetString().Should().Be("welcome");
        content.GetProperty("name").GetString().Should().Be("Welcome Email");
    }

    [Fact]
    public async Task CreateTemplate_ShouldCreateTemplate()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/templates", new
        {
            name = "Test Template",
            channel = "email",
            subject = "Test Subject",
            body = "Hello {{name}}"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("name").GetString().Should().Be("Test Template");
    }

    [Fact]
    public async Task SendFromTemplate_ShouldSendWithVariables()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/from-template", new
        {
            templateId = "welcome",
            recipient = "test@example.com",
            variables = new { name = "John" }
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("templateId").GetString().Should().Be("welcome");
        content.GetProperty("status").GetString().Should().Be("sent");
    }

    [Fact]
    public async Task BulkSend_ShouldSendToMultipleRecipients()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/bulk", new
        {
            channel = "email",
            recipients = new[] { "user1@example.com", "user2@example.com" },
            body = "Bulk message",
            subject = "Bulk subject"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("totalSent").GetInt32().Should().Be(2);
        content.GetProperty("results").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task ScheduleNotification_ShouldSchedule()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/schedule", new
        {
            channel = "email",
            recipient = "test@example.com",
            body = "Scheduled message",
            scheduledFor = DateTime.UtcNow.AddHours(1)
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("scheduled");
    }
}
