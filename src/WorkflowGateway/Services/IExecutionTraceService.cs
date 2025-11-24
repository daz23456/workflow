using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for building detailed execution traces from workflow execution records.
/// </summary>
public interface IExecutionTraceService
{
    /// <summary>
    /// Builds a detailed execution trace showing timing breakdown, dependency resolution, and parallel execution analysis.
    /// </summary>
    /// <param name="executionRecord">The execution record with task execution data.</param>
    /// <param name="workflow">The workflow definition used for this execution.</param>
    /// <returns>Detailed execution trace response.</returns>
    ExecutionTraceResponse BuildTrace(ExecutionRecord executionRecord, WorkflowResource workflow);
}
