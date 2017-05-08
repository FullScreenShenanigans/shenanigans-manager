import { Command, ICommandArgs } from "../command";
import { ensurePathExists } from "../utils";
import { CloneRepository } from "./cloneRepository";
import { Gulp } from "./gulp";
import { GulpSetup } from "./gulpSetup";
import { NpmInstall } from "./npmInstall";

/**
 * Clones, links, installs, and builds all repositories locally.
 */
export class CompleteSetup extends Command<ICommandArgs, void> {
    /**
     * Executes the command.
     * 
     * @returns A Promise for running the command.
     */
    public async execute(): Promise<any> {
        this.ensureArgsExist("directory");

        await this.subroutine(
            CloneRepository,
            {
                directory: this.args.directory,
                repository: "gulp-shenanigans"
            } as ICommandArgs);

        await this.subroutine(
            NpmInstall,
            {
                directory: this.args.directory,
                repository: "gulp-shenanigans"
            });

        await this.subroutine(
            Gulp,
            {
                directory: this.args.directory,
                repository: "gulp-shenanigans"
            });

        for (const repository of this.settings.allRepositories) {
            await ensurePathExists(this.args.directory, repository);
        }

        await this.subroutineInAll(
            CloneRepository,
            {
                directory: this.args.directory,
                link: true
            } as ICommandArgs);

        await this.subroutineInAll(GulpSetup, this.args);

        // Todo: will need to parse the tsconfig.json order out of all these suckers
        // await this.subroutineInAll(Gulp, this.args);
    }
}
