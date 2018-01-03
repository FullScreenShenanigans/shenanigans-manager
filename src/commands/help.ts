import chalk from "chalk";
import * as fs from "mz/fs";
import * as path from "path";
import * as tsutils from "tsutils";
import * as ts from "typescript";

import { ICommandArgs } from "../command";
import { NameTransformer } from "../nameTransformer";
import { IRuntime } from "../runtime";
import * as astutils from "../utils/ast";

const nameTransformer = new NameTransformer();

const printDescriptor = (runtime: IRuntime, descriptor: astutils.IRepositoryArgDescriptor): void => {
    runtime.logger.log([
        chalk.grey(" * --"),
        chalk.yellow(descriptor.name),
        chalk.grey(` (${descriptor.type}) - `),
        chalk.yellow(descriptor.comment.trim()),
    ].join(""));
};

const printArgMembers = (runtime: IRuntime, program: ts.Program, sourceFile: ts.SourceFile) => {
    const descriptors = astutils.getRepositoryArgDescriptors(program, sourceFile);

    if (descriptors.required.length !== 0) {
        runtime.logger.log(chalk.grey.italic("Required args:"));

        for (const descriptor of descriptors.required) {
            printDescriptor(runtime, descriptor);
        }
    }

    if (descriptors.optional.length !== 0) {
        runtime.logger.log(chalk.grey.italic("Optional args:"));

        for (const descriptor of descriptors.optional) {
            printDescriptor(runtime, descriptor);
        }
    }
};

const printCommandInfo = async (runtime: IRuntime, program: ts.Program, file: string) => {
    runtime.logger.log(chalk.bold.whiteBright(nameTransformer.toDashedCase(file)));

    const sourceFile = await program.getSourceFile(path.join(__dirname, `${file}.ts`));
    const nodes = astutils.getCommandNodes(sourceFile);

    if (nodes.docs !== undefined) {
        runtime.logger.log(chalk.cyanBright(nodes.docs.trim()));
    }

    if (nodes.args !== undefined) {
        const argsTypeMembers = astutils.getMembersFromTypeReference(program, nodes.args);
        printArgMembers(runtime, program, sourceFile);
    }

    runtime.logger.log("\n");
};

/**
 * Displays help info.
 */
export const Help = async (runtime: IRuntime) => {
    runtime.logger.log([
        chalk.bold.cyan("shenanigans-manager"),
        "manages locally installed FullScreenShenanigans modules for development.",
    ].join(" "));

    runtime.logger.log(chalk.grey("Available commands:\n"));

    const program = await astutils.createProgram();
    const files: string[] = await fs.readdir(path.join(__dirname, "../../src/commands"));
    const commands: string[] = files
        .filter((fileName: string): boolean =>
            fileName.indexOf(".ts") !== -1 && fileName.indexOf(".d.ts") === -1)
        .map((fileName: string): string =>
            fileName.substring(0, fileName.length - ".ts".length));

    for (const file of commands) {
        await printCommandInfo(runtime, program, file);
    }

    runtime.logger.log([
        "\nRun with",
        chalk.bold("--all"),
        "to execute a command in all repositories.",
    ].join(" "));
};
