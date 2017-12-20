import * as fs from "mz/fs";
import * as path from "path";

import { ensureArgsExist, ICommandArgs, IRepositoryCommandArgs } from "../command";
import { IRuntime } from "../runtime";

/**
 * Checks if a repository exists locally.
 */
export const DoesRepositoryExist = (runtime: IRuntime, args: IRepositoryCommandArgs): Promise<boolean> => {
    ensureArgsExist(args, "directory", "repository");

    return fs.exists(path.join(args.directory, args.repository));
};
