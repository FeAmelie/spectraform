type FoundationTestBody = () => unknown | Promise<unknown>;
type FoundationTestFunction = (name: string, body: FoundationTestBody) => void;

declare global {
  var test: FoundationTestFunction;
}

process.env.TZ = "UTC";
process.env.SPECTRAFORM_RUNTIME_NETWORK_CAPABILITY = "none";

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: () => Promise.reject(new Error("Foundation tests forbid runtime network access")),
});

export {};
