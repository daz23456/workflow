using System.Text;

namespace TestApiServer.Endpoints;

/// <summary>
/// Large response endpoints - for testing IResponseStorage threshold (500KB in-memory -> disk)
/// </summary>
public static class LargeResponseEndpoints
{
    public static void MapLargeResponseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/large")
            .WithTags("Large");

        // 21. GET /api/large/100kb - Below threshold, stays in memory
        group.MapGet("/100kb", () => GenerateLargeResponse(100))
            .WithName("GetLarge100KB")
            .WithOpenApi();

        // 22. GET /api/large/500kb - At threshold boundary
        group.MapGet("/500kb", () => GenerateLargeResponse(500))
            .WithName("GetLarge500KB")
            .WithOpenApi();

        // 23. GET /api/large/1mb - Above threshold, goes to disk
        group.MapGet("/1mb", () => GenerateLargeResponse(1024))
            .WithName("GetLarge1MB")
            .WithOpenApi();

        // 24. GET /api/large/5mb - Large payload stress test
        group.MapGet("/5mb", () => GenerateLargeResponse(5 * 1024))
            .WithName("GetLarge5MB")
            .WithOpenApi();

        // 25. GET /api/large/custom - Configurable size
        group.MapGet("/custom", (int sizeKb = 100) =>
        {
            if (sizeKb < 1 || sizeKb > 10 * 1024) // Max 10MB
            {
                return Results.BadRequest(new { error = "sizeKb must be between 1 and 10240" });
            }
            return Results.Ok(GenerateLargeResponse(sizeKb));
        })
            .WithName("GetLargeCustom")
            .WithOpenApi();
    }

    private static object GenerateLargeResponse(int targetSizeKb)
    {
        var targetBytes = targetSizeKb * 1024;
        var records = new List<LargeRecord>();

        // Each record is approximately 200-300 bytes JSON
        var recordsNeeded = targetBytes / 250;

        for (int i = 0; i < recordsNeeded; i++)
        {
            records.Add(new LargeRecord
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow.AddMinutes(-i).ToString("O"),
                Payload = new LargePayload
                {
                    Field1 = GenerateLoremIpsum(50),
                    Field2 = i * 12345,
                    Nested = new NestedData
                    {
                        Deep = new DeepData { Data = $"Record-{i}-Data" }
                    }
                }
            });
        }

        return new
        {
            metadata = new
            {
                generatedAt = DateTime.UtcNow.ToString("O"),
                sizeBytes = targetBytes,
                itemCount = records.Count
            },
            records
        };
    }

    private static string GenerateLoremIpsum(int wordCount)
    {
        var words = new[]
        {
            "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
            "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
            "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud"
        };

        var sb = new StringBuilder();
        var random = new Random();
        for (int i = 0; i < wordCount; i++)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(words[random.Next(words.Length)]);
        }
        return sb.ToString();
    }
}

public class LargeRecord
{
    public string Id { get; set; } = "";
    public string Timestamp { get; set; } = "";
    public LargePayload Payload { get; set; } = new();
}

public class LargePayload
{
    public string Field1 { get; set; } = "";
    public int Field2 { get; set; }
    public NestedData Nested { get; set; } = new();
}

public class NestedData
{
    public DeepData Deep { get; set; } = new();
}

public class DeepData
{
    public string Data { get; set; } = "";
}
