namespace TestApiServer.Endpoints;

/// <summary>
/// Notification endpoints - email, SMS, push, templates, bulk send
/// </summary>
public static class NotificationEndpoints
{
    private static readonly Dictionary<string, NotificationTemplate> _templates = new()
    {
        ["welcome"] = new NotificationTemplate { Id = "welcome", Name = "Welcome Email", Channel = "email", Subject = "Welcome to our platform!", Body = "Hello {{name}}, welcome to our platform!" },
        ["order-confirm"] = new NotificationTemplate { Id = "order-confirm", Name = "Order Confirmation", Channel = "email", Subject = "Order {{orderId}} Confirmed", Body = "Your order {{orderId}} has been confirmed." },
        ["password-reset"] = new NotificationTemplate { Id = "password-reset", Name = "Password Reset", Channel = "email", Subject = "Reset your password", Body = "Click here to reset your password: {{resetLink}}" },
        ["sms-verify"] = new NotificationTemplate { Id = "sms-verify", Name = "SMS Verification", Channel = "sms", Subject = "", Body = "Your verification code is: {{code}}" },
        ["push-promo"] = new NotificationTemplate { Id = "push-promo", Name = "Promotional Push", Channel = "push", Subject = "Special Offer!", Body = "{{message}}" }
    };

    private static readonly List<NotificationRecord> _sent = new();

    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications");

        // POST /api/notifications/email - Send email notification
        group.MapPost("/email", (SendEmailRequest request) =>
        {
            var notificationId = $"notif-{Guid.NewGuid():N}"[..12];
            var record = new NotificationRecord
            {
                Id = notificationId,
                Channel = "email",
                Recipient = request.To,
                Subject = request.Subject,
                Body = request.Body,
                Status = "sent",
                SentAt = DateTime.UtcNow
            };
            _sent.Add(record);

            return Results.Ok(new
            {
                notificationId,
                channel = "email",
                recipient = request.To,
                status = "sent",
                sentAt = record.SentAt.ToString("O")
            });
        })
            .WithName("SendEmail")
            .WithOpenApi();

        // POST /api/notifications/sms - Send SMS notification
        group.MapPost("/sms", (SendSmsRequest request) =>
        {
            var notificationId = $"sms-{Guid.NewGuid():N}"[..12];
            var record = new NotificationRecord
            {
                Id = notificationId,
                Channel = "sms",
                Recipient = request.PhoneNumber,
                Subject = "",
                Body = request.Message,
                Status = "sent",
                SentAt = DateTime.UtcNow
            };
            _sent.Add(record);

            return Results.Ok(new
            {
                notificationId,
                channel = "sms",
                recipient = request.PhoneNumber,
                status = "sent",
                segments = (request.Message.Length / 160) + 1,
                sentAt = record.SentAt.ToString("O")
            });
        })
            .WithName("SendSms")
            .WithOpenApi();

        // POST /api/notifications/push - Send push notification
        group.MapPost("/push", (SendPushRequest request) =>
        {
            var notificationId = $"push-{Guid.NewGuid():N}"[..12];
            var record = new NotificationRecord
            {
                Id = notificationId,
                Channel = "push",
                Recipient = request.UserId,
                Subject = request.Title,
                Body = request.Body,
                Status = "delivered",
                SentAt = DateTime.UtcNow
            };
            _sent.Add(record);

            return Results.Ok(new
            {
                notificationId,
                channel = "push",
                userId = request.UserId,
                status = "delivered",
                sentAt = record.SentAt.ToString("O")
            });
        })
            .WithName("SendPush")
            .WithOpenApi();

        // GET /api/notifications/templates - List notification templates
        group.MapGet("/templates", () =>
        {
            return Results.Ok(new { templates = _templates.Values.ToArray() });
        })
            .WithName("ListNotificationTemplates")
            .WithOpenApi();

        // GET /api/notifications/templates/{id} - Get template by ID
        group.MapGet("/templates/{id}", (string id) =>
        {
            if (!_templates.TryGetValue(id, out var template))
                return Results.NotFound(new { error = $"Template {id} not found" });

            return Results.Ok(template);
        })
            .WithName("GetNotificationTemplate")
            .WithOpenApi();

        // POST /api/notifications/templates - Create template
        group.MapPost("/templates", (CreateTemplateRequest request) =>
        {
            var templateId = request.Id ?? Guid.NewGuid().ToString("N")[..8];
            var template = new NotificationTemplate
            {
                Id = templateId,
                Name = request.Name,
                Channel = request.Channel,
                Subject = request.Subject ?? "",
                Body = request.Body
            };
            _templates[templateId] = template;

            return Results.Created($"/api/notifications/templates/{templateId}", template);
        })
            .WithName("CreateNotificationTemplate")
            .WithOpenApi();

        // POST /api/notifications/from-template - Send from template
        group.MapPost("/from-template", (SendFromTemplateRequest request) =>
        {
            if (!_templates.TryGetValue(request.TemplateId, out var template))
                return Results.NotFound(new { error = $"Template {request.TemplateId} not found" });

            // Simple variable substitution
            var body = template.Body;
            var subject = template.Subject;
            foreach (var (key, value) in request.Variables ?? new Dictionary<string, string>())
            {
                body = body.Replace($"{{{{{key}}}}}", value);
                subject = subject.Replace($"{{{{{key}}}}}", value);
            }

            var notificationId = $"notif-{Guid.NewGuid():N}"[..12];
            var record = new NotificationRecord
            {
                Id = notificationId,
                Channel = template.Channel,
                Recipient = request.Recipient,
                Subject = subject,
                Body = body,
                Status = "sent",
                SentAt = DateTime.UtcNow
            };
            _sent.Add(record);

            return Results.Ok(new
            {
                notificationId,
                templateId = request.TemplateId,
                channel = template.Channel,
                recipient = request.Recipient,
                status = "sent",
                sentAt = record.SentAt.ToString("O")
            });
        })
            .WithName("SendFromTemplate")
            .WithOpenApi();

        // POST /api/notifications/bulk - Bulk send notifications
        group.MapPost("/bulk", (BulkSendRequest request) =>
        {
            var results = new List<object>();
            foreach (var recipient in request.Recipients)
            {
                var notificationId = $"bulk-{Guid.NewGuid():N}"[..12];
                var record = new NotificationRecord
                {
                    Id = notificationId,
                    Channel = request.Channel,
                    Recipient = recipient,
                    Subject = request.Subject ?? "",
                    Body = request.Body,
                    Status = "sent",
                    SentAt = DateTime.UtcNow
                };
                _sent.Add(record);
                results.Add(new { notificationId, recipient, status = "sent" });
            }

            return Results.Ok(new
            {
                totalSent = results.Count,
                channel = request.Channel,
                results
            });
        })
            .WithName("BulkSendNotifications")
            .WithOpenApi();

        // GET /api/notifications/history - Get notification history
        group.MapGet("/history", (string? userId, string? channel, int? limit) =>
        {
            var notifications = _sent.AsEnumerable();
            if (!string.IsNullOrEmpty(userId))
                notifications = notifications.Where(n => n.Recipient == userId);
            if (!string.IsNullOrEmpty(channel))
                notifications = notifications.Where(n => n.Channel == channel);

            var result = notifications
                .OrderByDescending(n => n.SentAt)
                .Take(limit ?? 50)
                .ToArray();

            return Results.Ok(new { notifications = result, total = result.Length });
        })
            .WithName("GetNotificationHistory")
            .WithOpenApi();

        // GET /api/notifications/{id} - Get notification by ID
        group.MapGet("/{id}", (string id) =>
        {
            var notification = _sent.FirstOrDefault(n => n.Id == id);
            if (notification == null)
                return Results.NotFound(new { error = $"Notification {id} not found" });

            return Results.Ok(notification);
        })
            .WithName("GetNotification")
            .WithOpenApi();

        // POST /api/notifications/schedule - Schedule notification
        group.MapPost("/schedule", (ScheduleNotificationRequest request) =>
        {
            var notificationId = $"sched-{Guid.NewGuid():N}"[..12];

            return Results.Ok(new
            {
                notificationId,
                status = "scheduled",
                channel = request.Channel,
                recipient = request.Recipient,
                scheduledFor = request.ScheduledFor.ToString("O"),
                createdAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("ScheduleNotification")
            .WithOpenApi();
    }
}

// Notification models
public class NotificationTemplate
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Channel { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
}

public class NotificationRecord
{
    public string Id { get; set; } = "";
    public string Channel { get; set; } = "";
    public string Recipient { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTime SentAt { get; set; }
}

public record SendEmailRequest(string To, string Subject, string Body, string? From = null);
public record SendSmsRequest(string PhoneNumber, string Message);
public record SendPushRequest(string UserId, string Title, string Body, Dictionary<string, string>? Data = null);
public record CreateTemplateRequest(string? Id, string Name, string Channel, string? Subject, string Body);
public record SendFromTemplateRequest(string TemplateId, string Recipient, Dictionary<string, string>? Variables);
public record BulkSendRequest(string Channel, string[] Recipients, string Body, string? Subject = null);
public record ScheduleNotificationRequest(string Channel, string Recipient, string Body, DateTime ScheduledFor, string? Subject = null);
