import chalk from "chalk";

import { ILogger } from "./logger";
import { ISettings } from "./settings";

/**
 * Common arguments for all commands.
 */
export interface ICommandArgs {
    /**
     * Location to run the command in.
     */
    directory: string;
}

/**
 * Implementation of the abstract Command class.
 *
 * @param TArgs   Type of the command's arguments.
 * @param TResults   Type of the results.
 */
export interface ICommandClass<TArgs extends ICommandArgs = ICommandArgs, TResult = void> {
    /**
     * Initializes a new instance of a Command subclass.
     *
     * @param args   Arguments for the command.
     * @param logger   Logs on important events.
     * @param settings   User settings for the manager.
     */
    new(args: Partial<TArgs>, logger: ILogger, settings: ISettings): Command<TArgs, TResult>;
}

/**
 * Executable management command.
 *
 * @param TArgs   Type of the command's arguments.
 * @param TResults   Type of the results.
 */
export abstract class Command<TArgs extends ICommandArgs, TResults> {
    /**
     * Arguments for the command.
     */
    protected readonly args: TArgs;

    /**
     * Logs on important events.
     */
    protected readonly logger: ILogger;

    /**
     * User settings for the manager.
     */
    protected readonly settings: ISettings;

    /**
     * Initializes a new instance of the Command class.
     *
     * @param args   Arguments for the command.
     * @param logger   Logs on important events.
     * @param settings   User settings for the manager.
     * @remarks Args are taken in as a partial. Execution is assumed to verify existence.
     */
    public constructor(args: Partial<TArgs>, logger: ILogger, settings: ISettings) {
        this.args = args as TArgs;
        this.logger = logger;
        this.settings = settings;
    }

    /**
     * Executes the command.
     *
     * @returns A Promise for the command's results.
     */
    public abstract async execute(): Promise<TResults>;

    /**
     * Creates and runs a sub-command.
     *
     * @template TSubResults   Type the sub-command returns.
     * @param commandClass   Sub-command class to run.
     * @param args   Args for the sub-command.
     */
    protected async subroutine<TSubResults>(
        commandClass: ICommandClass<ICommandArgs, TSubResults>, args: ICommandArgs,
    ): Promise<TSubResults> {
        return new commandClass(args, this.logger, this.settings).execute();
    }

    /**
     * Creates and runs a sub-command in all repositories.
     *
     * @template TSubResults   Type the sub-command returns.
     * @param commandClass   Sub-command class to run.
     * @param args   Args for the sub-command.
     */
    protected async subroutineInAll<TSubResults>(
        commandClass: ICommandClass<ICommandArgs, TSubResults>, args: ICommandArgs,
    ): Promise<TSubResults[]> {
        const results: TSubResults[] = [];

        for (const repository of this.settings.allRepositories) {
            const commandArgs: ICommandArgs & { repository: string } = {
                ...args,
                repository,
            };
            const command = new commandClass(commandArgs, this.logger, this.settings);

            results.push(await command.execute());
        }

        return results;
    }

    /**
     * Throws an error if any required arguments don't exist.
     *
     * @param names   Names of required arguments.
     */
    protected ensureArgsExist(...names: (keyof TArgs)[]): void {
        const missing = names.filter((name) => !(name in this.args));
        if (!missing.length) {
            return;
        }

        throw new Error(
            chalk.red([
                `Missing arg${missing.length === 1 ? "" : "s"}`,
                chalk.bold(missing.join(" ")),
            ].join(" ")));
    }

    /**
     * Defaults a set of arguments to ".".
     *
     * @param names   Argument names to default.
     */
    protected defaultPathArgs(...names: (keyof TArgs)[]): void {
        for (const name of names) {
            if (!(name in this.args)) {
                this.args[name] = ".";
            }
        }
    }
}
