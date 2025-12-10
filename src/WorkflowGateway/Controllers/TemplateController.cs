using Microsoft.AspNetCore.Mvc;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for discovering and retrieving workflow templates.
/// Templates are pre-built workflow patterns that serve as starting points for common use cases
/// like API composition, data processing pipelines, real-time integrations, and more.
/// </summary>
[ApiController]
[Route("api/v1/templates")]
public class TemplateController : ControllerBase
{
    private readonly ITemplateDiscoveryService _templateDiscoveryService;

    public TemplateController(ITemplateDiscoveryService templateDiscoveryService)
    {
        _templateDiscoveryService = templateDiscoveryService ?? throw new ArgumentNullException(nameof(templateDiscoveryService));
    }

    /// <summary>
    /// Get a paginated list of all available workflow templates with optional filtering.
    /// Templates provide ready-to-use workflow patterns that can be customized for specific needs.
    /// </summary>
    /// <param name="namespace">Optional namespace filter to scope templates to a specific namespace.</param>
    /// <param name="category">Optional category filter. Valid values: api-composition, data-processing, real-time, integrations.</param>
    /// <param name="difficulty">Optional difficulty filter. Valid values: beginner, intermediate, advanced.</param>
    /// <returns>
    /// A list of template summaries including name, category, difficulty, description,
    /// tags, estimated setup time, task count, and whether parallel execution is used.
    /// </returns>
    [HttpGet]
    [ProducesResponseType(typeof(TemplateListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] string? @namespace = null,
        [FromQuery] string? category = null,
        [FromQuery] string? difficulty = null)
    {
        var templates = await _templateDiscoveryService.DiscoverTemplatesAsync(@namespace, category, difficulty);

        var templateSummaries = templates.Select(t => new TemplateSummary
        {
            Name = t.Name,
            Category = t.Category,
            Difficulty = t.Difficulty,
            Description = t.Description,
            Tags = t.Tags,
            EstimatedSetupTime = t.EstimatedSetupTime,
            TaskCount = t.TaskCount,
            HasParallelExecution = t.HasParallelExecution
        }).ToList();

        var response = new TemplateListResponse
        {
            Templates = templateSummaries,
            TotalCount = templateSummaries.Count
        };

        return Ok(response);
    }

    /// <summary>
    /// Get detailed information about a specific workflow template including its full YAML definition.
    /// Use this to retrieve a template for customization before deploying as a new workflow.
    /// </summary>
    /// <param name="name">The unique name of the template to retrieve.</param>
    /// <param name="namespace">Optional namespace to search in. Defaults to 'default' if not specified.</param>
    /// <returns>
    /// Full template details including metadata (name, category, difficulty, description, tags)
    /// and the complete YAML workflow definition ready for customization.
    /// Returns 404 if template not found.
    /// </returns>
    [HttpGet("{name}")]
    [ProducesResponseType(typeof(TemplateDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTemplateDetail(
        string name,
        [FromQuery] string? @namespace = null)
    {
        var template = await _templateDiscoveryService.GetTemplateByNameAsync(name, @namespace);

        if (template == null)
        {
            return NotFound(new { message = $"Template '{name}' not found" });
        }

        var response = new TemplateDetailResponse
        {
            Metadata = template,
            YamlDefinition = template.YamlDefinition ?? "",
            Graph = null // TODO: Implement graph generation in future iteration
        };

        return Ok(response);
    }
}
