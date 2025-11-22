namespace WorkflowCore.Models;

public class WorkflowExecutionResult
{
    public bool Success { get; set; }
    public Dictionary<string, object>? Output { get; set; }
    public Dictionary<string, TaskExecutionResult> TaskResults { get; set; } = new();
    public List<string> Errors { get; set; } = new();
    public TimeSpan TotalDuration { get; set; }
}
