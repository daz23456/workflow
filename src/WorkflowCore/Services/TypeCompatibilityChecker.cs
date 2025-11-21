using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITypeCompatibilityChecker
{
    CompatibilityResult CheckCompatibility(PropertyDefinition source, PropertyDefinition target);
}

public class TypeCompatibilityChecker : ITypeCompatibilityChecker
{
    public CompatibilityResult CheckCompatibility(PropertyDefinition source, PropertyDefinition target)
    {
        var errors = new List<CompatibilityError>();
        CheckCompatibilityRecursive(source, target, "", errors);

        return new CompatibilityResult
        {
            IsCompatible = errors.Count == 0,
            Errors = errors
        };
    }

    private void CheckCompatibilityRecursive(
        PropertyDefinition source,
        PropertyDefinition target,
        string path,
        List<CompatibilityError> errors)
    {
        // Check basic type compatibility
        if (source.Type != target.Type)
        {
            errors.Add(new CompatibilityError
            {
                Field = path,
                Message = $"Type mismatch: expected '{target.Type}', got '{source.Type}'"
            });
            return;
        }

        // For objects, validate nested properties
        if (source.Type == "object" && source.Properties != null && target.Properties != null)
        {
            foreach (var (key, targetProp) in target.Properties)
            {
                if (!source.Properties.ContainsKey(key))
                {
                    errors.Add(new CompatibilityError
                    {
                        Field = string.IsNullOrEmpty(path) ? key : $"{path}.{key}",
                        Message = $"Missing required property '{key}'"
                    });
                    continue;
                }

                var sourceProp = source.Properties[key];
                var nestedPath = string.IsNullOrEmpty(path) ? key : $"{path}.{key}";
                CheckCompatibilityRecursive(sourceProp, targetProp, nestedPath, errors);
            }
        }

        // For arrays, validate item types
        if (source.Type == "array")
        {
            if (source.Items == null || target.Items == null)
            {
                errors.Add(new CompatibilityError
                {
                    Field = $"{path}.items",
                    Message = "Array items type not defined"
                });
                return;
            }

            CheckCompatibilityRecursive(source.Items, target.Items, $"{path}.items", errors);
        }
    }
}
