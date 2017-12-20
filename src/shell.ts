import { ChildProcess, exec } from "child_process";
import * as path from "path";

import { ILogger } from "./logger";
import { Sanitizer } from "./shell/sanitizer";

/**
 * Result from running a command.
 */
export interface ICommandOutput {
    /**
     * Output status code.
     */
    code: number;

    /**
     * stderr output.
     */
    stderr: string;

    /**
     * stdout output.
     */
    stdout: string;
}

/**
 * Runs shell commands.
 */
export class Shell {
    /**
     * Sanitizes shell logs to remove unnecessary strings.
     */
    private readonly sanitizer: Sanitizer = new Sanitizer();

    /**
     * Logs on important events.
     */
    private readonly logger: ILogger;

    /**
     * Current working directory.
     */
    private cwd = ".";

    /**
     * Initializes a new instance of the Shell class.
     *
     * @param logger   Logs on important events.
     * @param pathComponents   Path components for the initial directory.
     */
    public constructor(logger: ILogger, ...pathComponents: string[]) {
        this.logger = logger;

        if (pathComponents.length !== 0) {
            this.setCwd(...pathComponents);
        }
    }

    /**
     * Sets the current working directory.
     *
     * @param rawPathComponents   Path components for the directory.
     * @returns this
     */
    public setCwd(...rawPathComponents: (string | undefined)[]): this {
        const pathComponents: string[] = rawPathComponents.filter((pathComponent) => pathComponent !== undefined) as string[];

        const cwd: string = path.join(...pathComponents);
        this.cwd = cwd;

        if (this.logger.onSetCwd !== undefined) {
            this.logger.onSetCwd({ cwd, pathComponents });
        }

        return this;
    }

    /**
     * Runs a shell command.
     *
     * @param command   Command to execute.
     * @returns A Promise for the results of the command.
     */
    public async execute(command: string): Promise<ICommandOutput> {
        if (this.logger.onExecuteBegin !== undefined) {
            this.logger.onExecuteBegin({ command });
        }

        return new Promise<ICommandOutput>((resolve): void => {
            const spawned: ChildProcess = exec(command, {
                cwd: this.cwd,
            });
            let stderr = "";
            let stdout = "";

            spawned.stderr.on("data", (data: string | Buffer) => {
                data = this.sanitizer.sanitize(data);
                if (!data) {
                    return;
                }

                if (this.logger.onExecuteError !== undefined) {
                    this.logger.onExecuteError({ command, data, stderr, stdout });
                }

                stderr += data;
            });

            spawned.stdout.on("data", (data: string | Buffer) => {
                data = this.sanitizer.sanitize(data);
                if (!data) {
                    return;
                }

                if (this.logger.onExecuteOut !== undefined) {
                    this.logger.onExecuteOut({ command, data, stderr, stdout });
                }

                stdout += data;
            });

            spawned.on("close", (code: number) => {
                if (this.logger.onExecuteEnd !== undefined) {
                    this.logger.onExecuteEnd({ command, code, stderr, stdout });
                }

                resolve({ code, stderr, stdout });
            });
        });
    }
}
