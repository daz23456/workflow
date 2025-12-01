using FluentAssertions;
using WorkflowCore.Interfaces;
using WorkflowCore.Services;
using WorkflowCore.Services.ResponseHandlers;
using Xunit;

namespace WorkflowCore.Tests.Services.ResponseHandlers;

public class ResponseHandlerFactoryTests
{
    private readonly IResponseHandlerFactory _factory;
    private readonly JsonResponseHandler _jsonHandler;
    private readonly BinaryResponseHandler _binaryHandler;
    private readonly TextResponseHandler _textHandler;

    public ResponseHandlerFactoryTests()
    {
        var storage = new HybridResponseStorage();
        _jsonHandler = new JsonResponseHandler();
        _binaryHandler = new BinaryResponseHandler(storage);
        _textHandler = new TextResponseHandler();

        var handlers = new List<IResponseHandler> { _jsonHandler, _binaryHandler, _textHandler };
        _factory = new ResponseHandlerFactory(handlers);
    }

    [Fact]
    public void GetHandler_WithApplicationJson_ReturnsJsonHandler()
    {
        // Act
        var handler = _factory.GetHandler("application/json");

        // Assert
        handler.Should().BeSameAs(_jsonHandler);
    }

    [Fact]
    public void GetHandler_WithApplicationPdf_ReturnsBinaryHandler()
    {
        // Act
        var handler = _factory.GetHandler("application/pdf");

        // Assert
        handler.Should().BeSameAs(_binaryHandler);
    }

    [Fact]
    public void GetHandler_WithExcelSpreadsheet_ReturnsBinaryHandler()
    {
        // Act
        var handler = _factory.GetHandler("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // Assert
        handler.Should().BeSameAs(_binaryHandler);
    }

    [Fact]
    public void GetHandler_WithImagePng_ReturnsBinaryHandler()
    {
        // Act
        var handler = _factory.GetHandler("image/png");

        // Assert
        handler.Should().BeSameAs(_binaryHandler);
    }

    [Fact]
    public void GetHandler_WithTextPlain_ReturnsTextHandler()
    {
        // Act
        var handler = _factory.GetHandler("text/plain");

        // Assert
        handler.Should().BeSameAs(_textHandler);
    }

    [Fact]
    public void GetHandler_WithTextHtml_ReturnsTextHandler()
    {
        // Act
        var handler = _factory.GetHandler("text/html");

        // Assert
        handler.Should().BeSameAs(_textHandler);
    }

    [Fact]
    public void GetHandler_WithUnknownContentType_ThrowsInvalidOperationException()
    {
        // Act
        Action act = () => _factory.GetHandler("application/unknown");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*No handler found for content type*application/unknown*");
    }

    [Fact]
    public void GetHandler_WithNullContentType_ThrowsArgumentException()
    {
        // Act
        Action act = () => _factory.GetHandler(null!);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*contentType*");
    }

    [Fact]
    public void GetHandler_WithEmptyContentType_ThrowsArgumentException()
    {
        // Act
        Action act = () => _factory.GetHandler(string.Empty);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*contentType*");
    }
}
