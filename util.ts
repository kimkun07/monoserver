import { exec, PromiseWithChild } from "child_process";
import { promisify } from "util";

//#region Execute Shell Command
// exec is a callback-based function, so we promisify it
const exec_promised: (command: string) => PromiseWithChild<CommandResult> =
  promisify(exec);

export async function executeCommand(command: string): Promise<CommandResult> {
  return await exec_promised(command);
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}
//#endregion
