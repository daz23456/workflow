namespace WorkflowCore.Models;

public class CompatibilityResult
{
    public bool IsCompatible { get; set; }
    public List<CompatibilityError> Errors { get; set; } = new();
}

public class CompatibilityError
{
    public string? Field { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SuggestedFix { get; set; }
}
