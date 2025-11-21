using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITypeCompatibilityChecker
{
    CompatibilityResult CheckCompatibility(SchemaDefinition? sourceSchema, SchemaDefinition? targetSchema);
}

public class TypeCompatibilityChecker : ITypeCompatibilityChecker
{
    public CompatibilityResult CheckCompatibility(SchemaDefinition? sourceSchema, SchemaDefinition? targetSchema)
    {
        var errors = new List<string>();

        if (sourceSchema == null || targetSchema == null)
        {
            return new CompatibilityResult { IsCompatible = true, Errors = errors };
        }

        // Check root type compatibility
        if (sourceSchema.Type != targetSchema.Type)
        {
            errors.Add($"Root type mismatch: source is '{sourceSchema.Type}' but target expects '{targetSchema.Type}'");
            return new CompatibilityResult { IsCompatible = false, Errors = errors };
        }

        // Check properties compatibility
        if (sourceSchema.Type == "object" && sourceSchema.Properties != null && targetSchema.Properties != null)
        {
            CheckPropertiesCompatibility(sourceSchema.Properties, targetSchema.Properties, "", errors);
        }

        return new CompatibilityResult
        {
            IsCompatible = errors.Count == 0,
            Errors = errors
        };
    }

    private void CheckPropertiesCompatibility(
        Dictionary<string, PropertyDefinition> sourceProps,
        Dictionary<string, PropertyDefinition> targetProps,
        string path,
        List<string> errors)
    {
        foreach (var targetProp in targetProps)
        {
            var propName = targetProp.Key;
            var fullPath = string.IsNullOrEmpty(path) ? propName : $"{path}.{propName}";

            if (!sourceProps.ContainsKey(propName))
            {
                errors.Add($"Missing property '{fullPath}' in source schema");
                continue;
            }

            var sourcePropDef = sourceProps[propName];
            var targetPropDef = targetProp.Value;

            // Check type compatibility
            if (sourcePropDef.Type != targetPropDef.Type)
            {
                errors.Add($"Property '{fullPath}' type mismatch: source is '{sourcePropDef.Type}' but target expects '{targetPropDef.Type}'");
                continue;
            }

            // Recursively check nested objects
            if (sourcePropDef.Type == "object" && sourcePropDef.Properties != null && targetPropDef.Properties != null)
            {
                CheckPropertiesCompatibility(sourcePropDef.Properties, targetPropDef.Properties, fullPath, errors);
            }

            // Check array item types
            if (sourcePropDef.Type == "array" && sourcePropDef.Items != null && targetPropDef.Items != null)
            {
                if (sourcePropDef.Items.Type != targetPropDef.Items.Type)
                {
                    errors.Add($"Property '{fullPath}' array item type mismatch: source items are '{sourcePropDef.Items.Type}' but target expects '{targetPropDef.Items.Type}'");
                }
            }
        }
    }
}
