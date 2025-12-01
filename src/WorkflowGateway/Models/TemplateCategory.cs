using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Categories for workflow templates.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TemplateCategory
{
    /// <summary>
    /// API composition workflows (parallel fetches, sequential pipelines, conditional branching).
    /// </summary>
    ApiComposition,

    /// <summary>
    /// Data processing workflows (ETL pipelines, batch processing, aggregation).
    /// </summary>
    DataProcessing,

    /// <summary>
    /// Real-time workflows (WebSocket streams, event-driven, polling).
    /// </summary>
    RealTime,

    /// <summary>
    /// Integration workflows (Slack notifications, GitHub webhooks, payment processing).
    /// </summary>
    Integrations
}
