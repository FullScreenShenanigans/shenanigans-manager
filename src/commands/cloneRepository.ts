import { Command, ICommandArgs } from "../command";
import { Shell } from "../shell";
import { Link } from "./link";
import { LinkToDependencies } from "./linkToDependencies";

/**
 * Arguments for a CloneRepository command.
 */
export interface ICloneRepositoryArgs extends ICommandArgs {
    /**
     * GitHub user or organization to clone from, if not FullScreenShenanigans.
     */
    fork?: string;

    /**
     * Whether to also link this to its dependencies.
     */
    link?: boolean;

    /**
     * Name of the repository.
     */
    repository: string;
}

/**
 * Clones a repository locally.
 */
export class CloneRepository extends Command<ICloneRepositoryArgs, void> {
    /**
     * Executes the command.
     *
     * @returns A Promise for running the command.
     */
    public async execute(): Promise<void> {
        this.ensureArgsExist("directory", "repository");

        const shell: Shell = new Shell(this.logger);
        const organization = this.args.fork === undefined
            ? this.settings.organization
            : this.args.fork;

        await shell
            .setCwd(this.args.directory)
            .execute(`git clone https://github.com/${organization}/${this.args.repository}`);

        if (this.args.link) {
            await this.subroutine(Link, this.args);
            await this.subroutine(LinkToDependencies, this.args);
        }
    }
}
