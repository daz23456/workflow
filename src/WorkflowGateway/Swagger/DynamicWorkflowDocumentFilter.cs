using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using WorkflowGateway.Services;

namespace WorkflowGateway.Swagger;

public class DynamicWorkflowDocumentFilter : IDocumentFilter
{
    private readonly IWorkflowDiscoveryService _discoveryService;

    public DynamicWorkflowDocumentFilter(IWorkflowDiscoveryService discoveryService)
    {
        _discoveryService = discoveryService;
    }

    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var workflows = _discoveryService.DiscoverWorkflowsAsync().GetAwaiter().GetResult();

        foreach (var workflow in workflows)
        {
            var workflowName = workflow.Metadata?.Name;
            if (string.IsNullOrEmpty(workflowName)) continue;

            var inputSchema = CreateInputSchema(workflow);

            // POST execute endpoint
            AddPostOperation(
                swaggerDoc,
                $"/api/v1/workflows/{workflowName}/execute",
                workflowName,
                "Execute",
                $"Execute the '{workflowName}' workflow with the provided input parameters.",
                inputSchema);

            // POST test endpoint (dry-run)
            AddPostOperation(
                swaggerDoc,
                $"/api/v1/workflows/{workflowName}/test",
                workflowName,
                "Test",
                $"Test the '{workflowName}' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.",
                inputSchema);

            // GET details endpoint
            AddGetOperation(
                swaggerDoc,
                $"/api/v1/workflows/{workflowName}",
                workflowName,
                "GetDetails",
                $"Get detailed information about the '{workflowName}' workflow including input schema, tasks, and output mapping.");
        }
    }

    private void AddPostOperation(
        OpenApiDocument swaggerDoc,
        string path,
        string workflowName,
        string operationType,
        string description,
        OpenApiSchema inputSchema)
    {
        EnsurePathExists(swaggerDoc, path);

        var tagReference = new OpenApiTagReference($"Workflow: {workflowName}", swaggerDoc, null);

        var operation = new OpenApiOperation
        {
            Tags = new HashSet<OpenApiTagReference> { tagReference },
            Summary = $"{operationType} {workflowName} workflow",
            Description = description,
            OperationId = $"{workflowName}_{operationType}",
            RequestBody = new OpenApiRequestBody
            {
                Required = true,
                Description = "Workflow input parameters matching the defined schema",
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = inputSchema
                    }
                }
            },
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Workflow execution completed successfully",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Type = JsonSchemaType.Object,
                                Properties = new Dictionary<string, IOpenApiSchema>
                                {
                                    ["executionId"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uuid", Description = "Unique execution ID" },
                                    ["status"] = new OpenApiSchema { Type = JsonSchemaType.String, Description = "Execution status (Succeeded/Failed)" },
                                    ["outputs"] = new OpenApiSchema { Type = JsonSchemaType.Object, Description = "Workflow output values" },
                                    ["tasks"] = new OpenApiSchema { Type = JsonSchemaType.Array, Description = "Task execution details" }
                                }
                            }
                        }
                    }
                },
                ["400"] = new OpenApiResponse { Description = "Input validation failed - check input parameters against schema" },
                ["404"] = new OpenApiResponse { Description = "Workflow not found" },
                ["500"] = new OpenApiResponse { Description = "Workflow execution failed - check task errors" }
            }
        };

        swaggerDoc.Paths[path].Operations.Add(System.Net.Http.HttpMethod.Post, operation);
    }

    private void AddGetOperation(
        OpenApiDocument swaggerDoc,
        string path,
        string workflowName,
        string operationType,
        string description)
    {
        EnsurePathExists(swaggerDoc, path);

        var tagReference = new OpenApiTagReference($"Workflow: {workflowName}", swaggerDoc, null);

        var operation = new OpenApiOperation
        {
            Tags = new HashSet<OpenApiTagReference> { tagReference },
            Summary = $"Get {workflowName} workflow details",
            Description = description,
            OperationId = $"{workflowName}_{operationType}",
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Workflow details retrieved successfully",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Type = JsonSchemaType.Object,
                                Properties = new Dictionary<string, IOpenApiSchema>
                                {
                                    ["name"] = new OpenApiSchema { Type = JsonSchemaType.String, Description = "Workflow name" },
                                    ["description"] = new OpenApiSchema { Type = JsonSchemaType.String, Description = "Workflow description" },
                                    ["input"] = new OpenApiSchema { Type = JsonSchemaType.Object, Description = "Input schema definition" },
                                    ["output"] = new OpenApiSchema { Type = JsonSchemaType.Object, Description = "Output mapping definition" },
                                    ["tasks"] = new OpenApiSchema { Type = JsonSchemaType.Array, Description = "Task definitions" }
                                }
                            }
                        }
                    }
                },
                ["404"] = new OpenApiResponse { Description = "Workflow not found" }
            }
        };

        swaggerDoc.Paths[path].Operations.Add(System.Net.Http.HttpMethod.Get, operation);
    }


    private void EnsurePathExists(OpenApiDocument swaggerDoc, string path)
    {
        if (!swaggerDoc.Paths.ContainsKey(path))
        {
            swaggerDoc.Paths.Add(path, new OpenApiPathItem
            {
                Operations = new Dictionary<System.Net.Http.HttpMethod, OpenApiOperation>()
            });
        }
    }

    private OpenApiSchema CreateInputSchema(WorkflowCore.Models.WorkflowResource workflow)
    {
        // Create the workflow input parameters schema
        var workflowInputSchema = new OpenApiSchema
        {
            Type = JsonSchemaType.Object,
            Properties = new Dictionary<string, IOpenApiSchema>(),
            Required = new HashSet<string>()
        };

        if (workflow.Spec?.Input != null && workflow.Spec.Input.Any())
        {
            foreach (var (paramName, paramDef) in workflow.Spec.Input)
            {
                var propertySchema = new OpenApiSchema
                {
                    Type = MapTypeToJsonSchemaType(paramDef.Type),
                    Description = paramDef.Description ?? $"Input parameter: {paramName}"
                };

                workflowInputSchema.Properties[paramName] = propertySchema;

                if (paramDef.Required)
                {
                    workflowInputSchema.Required.Add(paramName);
                }
            }
        }

        // Wrap in "input" property to match WorkflowExecutionRequest model
        var requestSchema = new OpenApiSchema
        {
            Type = JsonSchemaType.Object,
            Properties = new Dictionary<string, IOpenApiSchema>
            {
                ["input"] = workflowInputSchema
            },
            Required = new HashSet<string> { "input" }
        };

        return requestSchema;
    }

    private JsonSchemaType MapTypeToJsonSchemaType(string workflowType)
    {
        return workflowType?.ToLowerInvariant() switch
        {
            "string" => JsonSchemaType.String,
            "integer" or "int" => JsonSchemaType.Integer,
            "number" or "float" or "double" => JsonSchemaType.Number,
            "boolean" or "bool" => JsonSchemaType.Boolean,
            "array" => JsonSchemaType.Array,
            "object" => JsonSchemaType.Object,
            _ => JsonSchemaType.String
        };
    }
}
