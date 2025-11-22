namespace WorkflowGateway.Models;

public class EndpointInfo
{
    public string WorkflowName { get; set; } = string.Empty;
    public string Pattern { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = string.Empty;
    public string EndpointType { get; set; } = string.Empty; // "execute", "test", "get"
}
