import type { ZodIssue } from "zod";

export interface ConfigValidationDiagnostic {
  readonly file: string;
  readonly yamlPath: string;
  readonly receivedValue: unknown;
  readonly expected: string;
  readonly correctionHint: string;
}

function displayReceived(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class ConfigValidationError extends Error {
  readonly diagnostic: ConfigValidationDiagnostic;

  constructor(diagnostic: ConfigValidationDiagnostic, cause?: unknown) {
    super(
      `${diagnostic.file}:${diagnostic.yamlPath}: received ${displayReceived(diagnostic.receivedValue)}; ` +
        `expected ${diagnostic.expected}. ${diagnostic.correctionHint}`,
      { cause },
    );
    this.name = "ConfigValidationError";
    this.diagnostic = diagnostic;
  }
}

export class UnsupportedConfigVersionError extends ConfigValidationError {
  readonly receivedMajor: unknown;

  constructor(file: string, receivedMajor: unknown, supportedMajor: number) {
    super({
      file,
      yamlPath: "$.schema_version",
      receivedValue: receivedMajor,
      expected: `supported major version ${supportedMajor}`,
      correctionHint: `Migrate this file to schema_version: ${supportedMajor} before loading it.`,
    });
    this.name = "UnsupportedConfigVersionError";
    this.receivedMajor = receivedMajor;
  }
}

export class UnknownConfigFamilyError extends Error {
  constructor(family: string) {
    super(`Unknown configuration family: ${family}`);
    this.name = "UnknownConfigFamilyError";
  }
}

export function formatYamlPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") return `${result}[${segment}]`;
    const key = String(segment);
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
      ? `${result}.${key}`
      : `${result}[${JSON.stringify(key)}]`;
  }, "$");
}

export function readValueAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (typeof current !== "object" || current === null) return undefined;
    return Reflect.get(current, segment);
  }, value);
}

export function expectedFromZodIssue(issue: ZodIssue): string {
  if ("expected" in issue && typeof issue.expected === "string") return issue.expected;
  if ("values" in issue && Array.isArray(issue.values)) {
    return `one of ${issue.values.map((value) => JSON.stringify(value)).join(", ")}`;
  }
  if (issue.code === "too_small" && "minimum" in issue) {
    return `a value greater than or equal to ${String(issue.minimum)}`;
  }
  if (issue.code === "too_big" && "maximum" in issue) {
    return `a value less than or equal to ${String(issue.maximum)}`;
  }
  return issue.message;
}
