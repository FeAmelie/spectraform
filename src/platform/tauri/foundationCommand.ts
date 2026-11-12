export const COMMAND_CONTRACT_VERSION = 1 as const;

export type FoundationError =
  | {
      code: "unsupported_contract_version";
      expected: number;
      received: number;
    }
  | {
      code: "window_operation_failed";
      operation: "set_fullscreen" | "is_fullscreen";
      message: string;
    };

export interface FoundationResponse {
  commandContractVersion: typeof COMMAND_CONTRACT_VERSION;
  runtimeNetworkCapability: "none";
}
export interface FullscreenResponse {
  commandContractVersion: typeof COMMAND_CONTRACT_VERSION;
  fullscreen: boolean;
}

export type FoundationInvoker = <Result>(
  command: string,
  args: Record<string, unknown>,
) => Promise<Result>;

type TauriInternals = {
  invoke: FoundationInvoker;
};

function defaultInvoker<Result>(
  command: string,
  args: Record<string, unknown>,
): Promise<Result> {
  const internals = (
    globalThis as typeof globalThis & { __TAURI_INTERNALS__?: TauriInternals }
  ).__TAURI_INTERNALS__;

  if (!internals) {
    return Promise.reject(new Error("Tauri IPC is unavailable"));
  }

  return internals.invoke<Result>(command, args);
}

export function getFoundationStatus(
  invoke: FoundationInvoker = defaultInvoker,
): Promise<FoundationResponse> {
  return invoke<FoundationResponse>("foundation_status", {
    request: { commandContractVersion: COMMAND_CONTRACT_VERSION },
  });
}

export function setFullscreen(
  fullscreen: boolean,
  invoke: FoundationInvoker = defaultInvoker,
): Promise<FullscreenResponse> {
  return invoke<FullscreenResponse>("set_fullscreen", {
    request: {
      commandContractVersion: COMMAND_CONTRACT_VERSION,
      fullscreen,
    },
  });
}
