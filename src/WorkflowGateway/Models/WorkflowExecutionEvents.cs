/**
 * Workflow Execution Events
 *
 * Event models for real-time WebSocket workflow execution.
 */

using System;
using System.Collections.Generic;

namespace WorkflowGateway.Models;

public class ExecuteWorkflowRequest
{
    public string WorkflowName { get; set; } = string.Empty;
    public Dictionary<string, object> Input { get; set; } = new();
}

public class WorkflowStartedEvent
{
    public Guid ExecutionId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class TaskStartedEvent
{
    public Guid ExecutionId { get; set; }
    public string TaskId { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class TaskCompletedEvent
{
    public Guid ExecutionId { get; set; }
    public string TaskId { get; set; } = string.Empty;
    public string TaskName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, object> Output { get; set; } = new();
    public TimeSpan Duration { get; set; }
    public DateTime Timestamp { get; set; }
}

public class WorkflowCompletedEvent
{
    public Guid ExecutionId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, object> Output { get; set; } = new();
    public TimeSpan Duration { get; set; }
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Event emitted when a signal flows from one task to another (dependency activation).
/// Used for neural visualization to animate data flow along edges.
/// </summary>
public class SignalFlowEvent
{
    public Guid ExecutionId { get; set; }
    public string FromTaskId { get; set; } = string.Empty;
    public string ToTaskId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Event emitted when a performance anomaly is detected during workflow or task execution.
/// </summary>
public class AnomalyDetectedEvent
{
    public string Id { get; set; } = string.Empty;
    public Guid ExecutionId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string? TaskId { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string MetricType { get; set; } = string.Empty;
    public double ActualValue { get; set; }
    public double ExpectedValue { get; set; }
    public double ZScore { get; set; }
    public double DeviationPercent { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }
}
