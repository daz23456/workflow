using System.Diagnostics.CodeAnalysis;

namespace WorkflowCore.Services;

public interface IHttpClientWrapper
{
    Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken);
}

[ExcludeFromCodeCoverage]
public class HttpClientWrapper : IHttpClientWrapper
{
    private readonly HttpClient _httpClient;

    public HttpClientWrapper(HttpClient httpClient)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    }

    public async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return await _httpClient.SendAsync(request, cancellationToken);
    }
}
