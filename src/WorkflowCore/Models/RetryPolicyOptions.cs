namespace WorkflowCore.Models;

public class RetryPolicyOptions
{
    public int InitialDelayMilliseconds { get; set; } = 100;
    public int MaxDelayMilliseconds { get; set; } = 30000;
    public double BackoffMultiplier { get; set; } = 2.0;
    public int MaxRetryCount { get; set; } = 3;
}
