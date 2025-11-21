namespace WorkflowCore.Models;

public class CompatibilityResult
{
    public bool IsCompatible { get; set; }
    public List<string> Errors { get; set; } = new();
}
