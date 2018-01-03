import * as path from "path";

import { IPackagePaths } from "package-build-order";

/**
 * Converts repository names to their package paths.
 *
 * @param repositoryNames   Names of local repositories.
 * @returns Repository names keyed to their package paths.
 */
export const resolvePackagePaths = (directory: string, repositoryNames: string[]): IPackagePaths => {
    const packagePaths: IPackagePaths = {};

    for (const repositoryName of repositoryNames) {
        packagePaths[repositoryName] = path.join(directory, repositoryName, "package.json");
    }

    return packagePaths;
};
