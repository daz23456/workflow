using System.Collections.Concurrent;

namespace WorkflowCore.Models;

public class TemplateContext
{
    public Dictionary<string, object> Input { get; set; } = new();
    public ConcurrentDictionary<string, Dictionary<string, object>> TaskOutputs { get; set; } = new();
}

public class TemplateResolutionException : Exception
{
    public string? TemplatePath { get; }

    public TemplateResolutionException(string message, string? templatePath = null)
        : base(message)
    {
        TemplatePath = templatePath;
    }

    public TemplateResolutionException(string message, Exception innerException, string? templatePath = null)
        : base(message, innerException)
    {
        TemplatePath = templatePath;
    }
}
