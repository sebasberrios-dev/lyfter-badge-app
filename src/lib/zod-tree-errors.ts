import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

interface ZodErrorTree {
  errors: string[];
  properties?: Record<string, ZodErrorTree>;
}

export function applyZodTreeErrors<T extends FieldValues>(
  tree: ZodErrorTree,
  setError: UseFormSetError<T>,
) {
  if (!tree.properties) return;

  for (const [field, node] of Object.entries(tree.properties)) {
    if (node.errors.length > 0) {
      setError(field as Path<T>, { type: "server", message: node.errors[0] });
    }
  }
}
