namespace WorkflowCore.Models;

public class TemplateParseResult
{
    public bool IsValid { get; set; }
    public List<TemplateExpression> Expressions { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

public class TemplateExpression
{
    public TemplateExpressionType Type { get; set; }
    public string? TaskId { get; set; }
    public string Path { get; set; } = string.Empty;
}

public enum TemplateExpressionType
{
    Input,
    TaskOutput
}
