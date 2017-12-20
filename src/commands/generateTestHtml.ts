import * as mustache from "mustache";
import * as fs from "mz/fs";
import * as path from "path";

import { Command, ICommandArgs } from "../command";
import { globAsync, parseFileJson } from "../utils";
import { EnsureRepositoryExists } from "./ensureRepositoryExists";

/**
 * Arguments for a GenerateTestHtml command.
 */
export interface IGenerateTestHtmlArgs extends ICommandArgs {
    /**
     * Name of the repository.
     */
    repository: string;
}

/**
 * Recreates scripts in a repository's package.json.
 */
export class GenerateTestHtml extends Command<IGenerateTestHtmlArgs, void> {
    /**
     * Executes the command.
     *
     * @returns A Promise for running the command.
     */
    public async execute(): Promise<void> {
        this.defaultPathArgs("directory", "repository");

        await this.subroutine(EnsureRepositoryExists, this.args);

        const basePackageLocation = path.join(this.args.directory, this.args.repository, "package.json");
        const basePackageContents = await parseFileJson<IShenanigansPackage>(basePackageLocation);

        const testTemplate = (await fs.readFile(path.resolve(__dirname, "../../setup/test.html"))).toString();
        const testPaths = (await globAsync(path.resolve(this.args.directory, this.args.repository, "src/**/*.test.ts*")))
            .map((testPath) => testPath.replace(/\.test\.(tsx|ts)/gi, ".test.js"))
            .map((testPath) => path.join("..", path.relative(path.join(this.args.directory, this.args.repository), testPath))
                .replace(/\\/g, "/"));

        const externalsRaw = basePackageContents.shenanigans.externals === undefined
            ? []
            : basePackageContents.shenanigans.externals;

        const externals = externalsRaw
            .map((external: IExternal): string =>
                `"${external.name}": "${external.js.dev}"`);

        const newTestContents = mustache.render(
            testTemplate,
            {
                ...basePackageContents,
                dependencyNames: basePackageContents.dependencies === undefined
                    ? []
                    : Object.keys(basePackageContents.dependencies)
                        .filter((dependencyName) => dependencyName !== "requirejs")
                        .filter((dependencyName) => !externalsRaw.some((externalRaw) => externalRaw.name === dependencyName.toLowerCase())),
                externals,
                testPaths,
            });

        await fs.writeFile(
            path.join(this.args.directory, this.args.repository, "test/index.html"),
            newTestContents);
    }
}
