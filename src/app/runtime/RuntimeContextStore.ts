import type { ProjectRuntimeContext } from "../project/ProjectSnapshot.ts";

export class RuntimeContextStore {
  #active: ProjectRuntimeContext | undefined;
  #activationCount = 0;

  get active(): ProjectRuntimeContext | undefined {
    return this.#active;
  }

  get activationCount(): number {
    return this.#activationCount;
  }

  activate(context: ProjectRuntimeContext): void {
    this.#active = context;
    this.#activationCount += 1;
  }
}
