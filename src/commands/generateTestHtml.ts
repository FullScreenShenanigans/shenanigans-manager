import * as mustache from "mustache";
import * as fs from "mz/fs";
import * as path from "path";

import { defaultPathArgs, IRepositoryCommandArgs } from "../command";
import { IRuntime } from "../runtime";
import { getDependencyNamesAndExternalsOfPackage, globAsync, parseFileJson } from "../utils";

import { EnsureRepositoryExists } from "./ensureRepositoryExists";

/**
 * Arguments for a GenerateTestHtml command.
 */
export interface IGenerateTestHtmlArgs extends IRepositoryCommandArgs {
    /**
     * Directory to load source files from, if not src.
     */
    source?: string;
}

/**
 * Generates the HTML page for a repository's tests.
 */
export const GenerateTestHtml = async (runtime: IRuntime, args: IGenerateTestHtmlArgs) => {
    defaultPathArgs(args, "directory", "repository");

    await EnsureRepositoryExists(runtime, args);

    const basePackageLocation = path.join(args.directory, args.repository, "package.json");
    const basePackageContents = await parseFileJson<IShenanigansPackage>(basePackageLocation);

    const testTemplate = (await fs.readFile(path.resolve(__dirname, "../../setup/test.html"))).toString();
    let testPaths = (await globAsync(path.resolve(args.directory, args.repository, "src/**/*.test.ts*")))
        .map((testPath) => testPath.replace(/\.test\.(tsx|ts)/gi, ".test.js"))
        .map((testPath) => path.join("..", path.relative(path.join(args.directory, args.repository), testPath))
            .replace(/\\/g, "/"));

    if (args.source !== undefined) {
        testPaths = testPaths.map((testPath: string): string => testPath.replace("/src/", `/${args.source}/`));
    }

    const { dependencyNames, externals } = await getDependencyNamesAndExternalsOfPackage(basePackageLocation);

    const newTestContents = mustache.render(
        testTemplate,
        {
            ...basePackageContents,
            dependencyNames,
            externals,
            testPaths,
        });

    const testFileName = args.source === undefined
        ? "test/index.html"
        : `test/index.${args.source}.html`;

    await fs.writeFile(
        path.join(args.directory, args.repository, testFileName),
        newTestContents);
};
