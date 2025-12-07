using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes workflows to detect optimization opportunities.
/// </summary>
public interface IWorkflowAnalyzer
{
    /// <summary>
    /// Analyzes a workflow and returns optimization candidates.
    /// </summary>
    /// <param name="workflow">The workflow to analyze</param>
    /// <returns>Analysis result containing optimization candidates and output usage tracking</returns>
    WorkflowAnalysisResult Analyze(WorkflowResource workflow);
}
