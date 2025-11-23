using System.Text.Json;

namespace WorkflowCore.Services;

/// <summary>
/// Service for previewing template resolution without executing workflows.
/// Resolves input templates with actual values and shows task output templates as placeholders.
/// </summary>
public interface ITemplatePreviewService
{
    /// <summary>
    /// Previews template resolution for all task input templates in a workflow.
    /// Resolves {{input.*}} templates with actual values from the input.
    /// Shows {{tasks.*}} templates as placeholders like &lt;will-resolve-from-taskId.output.path&gt;.
    /// </summary>
    /// <param name="templateString">The template string to preview (e.g., "{{input.userId}}" or "{{tasks.step1.output.data}}")</param>
    /// <param name="input">The workflow input data to resolve {{input.*}} templates</param>
    /// <returns>Dictionary of template expressions to their resolved values or placeholders</returns>
    Dictionary<string, string> PreviewTemplate(string templateString, JsonElement input);
}
