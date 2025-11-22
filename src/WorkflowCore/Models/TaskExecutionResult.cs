namespace WorkflowCore.Models;

public class TaskExecutionResult
{
    public bool Success { get; set; }
    public Dictionary<string, object>? Output { get; set; }
    public List<string> Errors { get; set; } = new();
    public int RetryCount { get; set; }
    public TimeSpan Duration { get; set; }
}
