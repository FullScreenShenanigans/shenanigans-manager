import * as mustache from "mustache";
import * as fs from "mz/fs";
import * as path from "path";

import { defaultPathArgs, ICommandArgs, IRepositoryCommandArgs } from "../command";
import { IRuntime } from "../runtime";
import { globAsync, parseFileJson } from "../utils";
import { EnsureRepositoryExists } from "./ensureRepositoryExists";

/**
 * Generates the HTML page for a repository's tests.
 */
export const GenerateTestHtml = async (runtime: IRuntime, args: IRepositoryCommandArgs) => {
    defaultPathArgs(args, "directory", "repository");

    await EnsureRepositoryExists(runtime, args);

    const basePackageLocation = path.join(args.directory, args.repository, "package.json");
    const basePackageContents = await parseFileJson<IShenanigansPackage>(basePackageLocation);

    const testTemplate = (await fs.readFile(path.resolve(__dirname, "../../setup/test.html"))).toString();
    const testPaths = (await globAsync(path.resolve(args.directory, args.repository, "src/**/*.test.ts*")))
        .map((testPath) => testPath.replace(/\.test\.(tsx|ts)/gi, ".test.js"))
        .map((testPath) => path.join("..", path.relative(path.join(args.directory, args.repository), testPath))
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
        path.join(args.directory, args.repository, "test/index.html"),
        newTestContents);
};
