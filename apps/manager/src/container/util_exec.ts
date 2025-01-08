import { PromiseWithChild, exec } from "child_process";
import { promisify } from "util";

export async function executeCommand(command: string): Promise<CommandResult> {
  return await exec_promised(command);
}

// exec is a callback-based function, so we promisify it
const exec_promised: (command: string) => PromiseWithChild<CommandResult> =
  promisify(exec);

interface CommandResult {
  stdout: string;
  stderr: string;
}
