import * as stringify from "json-stable-stringify";
import * as fs from "mz/fs";
import * as path from "path";

import { Command, ICommandArgs } from "../command";
import { parseFileJson } from "../utils";
import { EnsureRepositoryExists } from "./ensureRepositoryExists";

/**
 * Arguments for a HydratePackageJson command.
 */
export interface IHydratePackageJsonArgs extends ICommandArgs {
    /**
     * Name of the repository.
     */
    repository: string;
}

const mergeOnPackageTemplate = (target: IShenanigansPackage, source: Partial<IShenanigansPackage>) => {
    if (source.devDependencies !== undefined) {
        target.devDependencies = target.devDependencies === undefined
            ? source.devDependencies
            : {
                ...target.devDependencies,
                ...source.devDependencies,
            };
    }

    if (source.scripts !== undefined) {
        for (const i in source.scripts) {
            if (i in target.scripts) {
                target.scripts[i] += ` && ${source.scripts[i]}`;
            } else {
                target.scripts[i] = source.scripts[i];
            }
        }
    }
};

const getPackageTemplate = async (basePackageContents: IShenanigansPackage): Promise<IShenanigansPackage> => {
    const packageTemplate = await parseFileJson<IShenanigansPackage>(
        path.join(__dirname, "../../setup/package.json"));

    if (basePackageContents.shenanigans.maps) {
        mergeOnPackageTemplate(
            packageTemplate,
            (await parseFileJson<IShenanigansPackage>(path.join(__dirname, "../../setup/package-maps.json"))));
    }

    if (basePackageContents.shenanigans.web !== undefined) {
        mergeOnPackageTemplate(
            packageTemplate,
            (await parseFileJson<IShenanigansPackage>(path.join(__dirname, "../../setup/package-web.json"))));
    }

    return packageTemplate;
};

/**
 * Recreates members of a repository's package.json.
 */
export class HydratePackageJson extends Command<IHydratePackageJsonArgs, void> {
    /**
     * Executes the command.
     *
     * @returns A Promise for running the command.
     */
    public async execute(): Promise<void> {
        this.defaultPathArgs("directory", "repository");

        await this.subroutine(EnsureRepositoryExists, this.args);

        const basePackageLocation = path.join(this.args.directory, this.args.repository, "package.json");
        const basePackageContents: IShenanigansPackage & IDictionary<any> = await parseFileJson<IShenanigansPackage>(basePackageLocation);

        const packageTemplate: IShenanigansPackage & IDictionary<any> = await getPackageTemplate(basePackageContents);

        // tslint:disable-next-line:no-object-literal-type-assertion
        for (const i in packageTemplate) {
            if (i in basePackageContents) {
                basePackageContents[i] = {
                    ...basePackageContents[i],
                    ...packageTemplate[i],
                };
            } else {
                basePackageContents[i] = packageTemplate;
            }
        }

        await fs.writeFile(
            basePackageLocation,
            stringify(basePackageContents, {
                space: 4,
            }));
    }
}
