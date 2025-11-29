using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

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

    [HttpPost]
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
