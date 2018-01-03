import { defaultPathArgs, ensureArgsExist, IRepositoryCommandArgs } from "../command";
import { IRuntime } from "../runtime";
import { Shell } from "../shell";

/**
 * Arguments for an OpenOnGithub command.
 */
export interface IOpenOnGithubArgs extends IRepositoryCommandArgs {
    /**
     * Suffix to append to the URL.
     */
    url?: string;
}

/**
 * Opens a repository's page on GitHub.
 */
export const OpenOnGithub = async (runtime: IRuntime, args: IOpenOnGithubArgs) => {
    defaultPathArgs(args, "repository");

    const url = [
        "https://github.com",
        runtime.settings.organization,
        args.repository,
        args.url === undefined
            ? ""
            : args.url,
    ].join("/");

    const shell = new Shell(runtime.logger);

    await shell.execute(`start ${url}`);
};
