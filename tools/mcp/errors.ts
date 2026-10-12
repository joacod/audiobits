export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly action: string,
  ) {
    super(message);
  }
}

export function diagnostic(error: unknown) {
  return error instanceof ToolError
    ? { code: error.code, message: error.message, action: error.action }
    : {
        code: "unavailable",
        message: "The requested operation is unavailable.",
        action: "Check project installation and permissions, then try again.",
      };
}
