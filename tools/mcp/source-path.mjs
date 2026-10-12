// Shared by snapshot generation and retrieval; URL metacharacters are forbidden.
export function validSourcePath(path) {
  return (
    typeof path === "string" &&
    /^(LICENSE|catalog\/(recipes|experiences)\/[a-z0-9-]+\/[A-Za-z0-9._-]+)$/.test(
      path,
    ) &&
    !path.split("/").some((segment) => segment === "." || segment === "..")
  );
}
