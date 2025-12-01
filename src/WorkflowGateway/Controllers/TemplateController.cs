using Microsoft.AspNetCore.Mvc;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

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
    /// Get list of all available workflow templates
    /// </summary>
    /// <param name="namespace">Optional namespace filter</param>
    /// <param name="category">Optional category filter (api-composition, data-processing, real-time, integrations)</param>
    /// <param name="difficulty">Optional difficulty filter (beginner, intermediate, advanced)</param>
    /// <returns>List of workflow templates</returns>
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
    /// Get detailed information about a specific template
    /// </summary>
    /// <param name="name">Template name</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>Template details including YAML definition</returns>
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
