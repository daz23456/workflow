using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for executing data transformations using the Transform DSL.
/// Provides a powerful way to transform JSON data using a domain-specific language
/// that supports filtering, mapping, sorting, and aggregation operations.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class TransformController : ControllerBase
{
    private readonly ITransformDslParser _parser;
    private readonly ITransformExecutor _executor;

    public TransformController(ITransformDslParser parser, ITransformExecutor executor)
    {
        _parser = parser;
        _executor = executor;
    }

    /// <summary>
    /// Execute a data transformation using the Transform DSL.
    /// The DSL supports operations like filter, map, sort, take, skip, and aggregate.
    /// </summary>
    /// <param name="request">The transformation request containing the DSL expression and input data.</param>
    /// <returns>
    /// On success: The transformed data with success=true.
    /// On validation error: 400 Bad Request with parsing/validation errors.
    /// On execution error: 500 Internal Server Error with error details.
    /// </returns>
    /// <remarks>
    /// Example DSL expressions:
    /// - "items | filter: .status == 'active'" - Filter active items
    /// - "items | map: { name: .name, total: .price * .quantity }" - Transform to new shape
    /// - "items | sort: .createdAt desc | take: 10" - Get 10 most recent items
    /// - "items | aggregate: { count: count(), sum: sum(.amount) }" - Aggregate values
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(TransformResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(TransformResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(TransformResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Transform([FromBody] TransformRequest request)
    {
        try
        {
            // Step 1: Parse DSL
            var parseResult = await _parser.ParseAsync(request.Dsl);
            if (!parseResult.IsValid)
            {
                return BadRequest(new TransformResponse
                {
                    Success = false,
                    Errors = parseResult.Errors
                });
            }

            // Step 2: Validate DSL
            var validationResult = await _parser.ValidateAsync(parseResult.Dsl!);
            if (!validationResult.IsValid)
            {
                return BadRequest(new TransformResponse
                {
                    Success = false,
                    Errors = validationResult.Errors
                });
            }

            // Step 3: Execute transform
            var transformedData = await _executor.ExecuteAsync(parseResult.Dsl!, request.Data);

            return Ok(new TransformResponse
            {
                Success = true,
                Data = transformedData
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new TransformResponse
            {
                Success = false,
                Errors = new List<string> { ex.Message }
            });
        }
    }
}
