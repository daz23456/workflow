namespace WorkflowCore.Services;

/// <summary>
/// Interface for data transformation operations using query languages like JSONPath.
/// </summary>
public interface IDataTransformer
{
    /// <summary>
    /// Transforms data using the specified query expression.
    /// </summary>
    /// <param name="query">The query expression (e.g., JSONPath: "$.users[0].name")</param>
    /// <param name="data">The data to transform</param>
    /// <returns>The transformed result</returns>
    Task<object?> TransformAsync(string query, object data);
}
