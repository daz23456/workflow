namespace WorkflowCore.Models;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class ValidationError
{
    public string? TaskId { get; set; }
    public string? Field { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SuggestedFix { get; set; }
}
