using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for circuit breaker management endpoints.
/// Provides visibility and control over circuit breaker states.
/// </summary>
[ApiController]
[Route("api/v1/circuits")]
public class CircuitBreakerController : ControllerBase
{
    private readonly ICircuitStateStore _stateStore;

    public CircuitBreakerController(ICircuitStateStore stateStore)
    {
        _stateStore = stateStore ?? throw new ArgumentNullException(nameof(stateStore));
    }

    /// <summary>
    /// Lists all circuit breaker states.
    /// </summary>
    /// <returns>List of all circuit states.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(CircuitListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListCircuits()
    {
        var states = await _stateStore.GetAllStatesAsync();
        var response = new CircuitListResponse
        {
            Circuits = states.Select(kvp =>
                CircuitStateResponse.FromState(kvp.Key, kvp.Value)).ToList()
        };
        return Ok(response);
    }

    /// <summary>
    /// Gets the state of a specific circuit breaker.
    /// </summary>
    /// <param name="serviceName">Name of the service.</param>
    /// <returns>Circuit state information.</returns>
    [HttpGet("{serviceName}")]
    [ProducesResponseType(typeof(CircuitStateResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCircuit(string serviceName)
    {
        var state = await _stateStore.GetStateAsync(serviceName);
        return Ok(CircuitStateResponse.FromState(serviceName, state));
    }

    /// <summary>
    /// Forces a circuit breaker to the open state.
    /// Blocks all requests to the service until manually closed or reset.
    /// </summary>
    /// <param name="serviceName">Name of the service.</param>
    /// <returns>Operation result with new state.</returns>
    [HttpPost("{serviceName}/open")]
    [ProducesResponseType(typeof(CircuitOperationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForceOpen(string serviceName)
    {
        var state = await _stateStore.GetStateAsync(serviceName);
        state.State = CircuitState.Open;
        state.CircuitOpenedAt = DateTime.UtcNow;
        state.LastStateTransitionAt = DateTime.UtcNow;

        await _stateStore.SaveStateAsync(serviceName, state);

        return Ok(new CircuitOperationResponse
        {
            Success = true,
            Message = $"Circuit for '{serviceName}' has been forced open.",
            Circuit = CircuitStateResponse.FromState(serviceName, state)
        });
    }

    /// <summary>
    /// Forces a circuit breaker to the closed state.
    /// Allows all requests to flow through to the service.
    /// </summary>
    /// <param name="serviceName">Name of the service.</param>
    /// <returns>Operation result with new state.</returns>
    [HttpPost("{serviceName}/close")]
    [ProducesResponseType(typeof(CircuitOperationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForceClose(string serviceName)
    {
        var state = await _stateStore.GetStateAsync(serviceName);
        state.State = CircuitState.Closed;
        state.FailureCount = 0;
        state.HalfOpenSuccessCount = 0;
        state.LastStateTransitionAt = DateTime.UtcNow;

        await _stateStore.SaveStateAsync(serviceName, state);

        return Ok(new CircuitOperationResponse
        {
            Success = true,
            Message = $"Circuit for '{serviceName}' has been forced closed.",
            Circuit = CircuitStateResponse.FromState(serviceName, state)
        });
    }

    /// <summary>
    /// Resets a circuit breaker, clearing all state.
    /// </summary>
    /// <param name="serviceName">Name of the service.</param>
    /// <returns>Operation result.</returns>
    [HttpPost("{serviceName}/reset")]
    [ProducesResponseType(typeof(CircuitOperationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reset(string serviceName)
    {
        var removed = await _stateStore.RemoveStateAsync(serviceName);

        return Ok(new CircuitOperationResponse
        {
            Success = true,
            Message = removed
                ? $"Circuit for '{serviceName}' has been reset."
                : $"No circuit state found for '{serviceName}', nothing to reset.",
            Circuit = CircuitStateResponse.FromState(serviceName, new CircuitStateInfo())
        });
    }

    /// <summary>
    /// Gets the health status of the circuit breaker subsystem.
    /// </summary>
    /// <returns>Health status.</returns>
    [HttpGet("health")]
    [ProducesResponseType(typeof(CircuitBreakerHealthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CircuitBreakerHealthResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetHealth()
    {
        var isHealthy = await _stateStore.IsHealthyAsync();

        if (isHealthy)
        {
            return Ok(new CircuitBreakerHealthResponse { Status = "healthy" });
        }

        return StatusCode(503, new CircuitBreakerHealthResponse
        {
            Status = "unhealthy",
            Error = "Circuit breaker state store is unavailable"
        });
    }
}
