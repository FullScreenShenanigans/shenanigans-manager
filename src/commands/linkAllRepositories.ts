import { Command } from "../command";
import { Shell } from "../shell";

/**
 * Links all repositories locally.
 */
export class LinkAllRepositories extends Command<{}, void> {
    /**
     * Executes the command.
     * 
     * @returns A Promise for running the command.
     */
    public async execute(): Promise<any> {
        const shell: Shell = new Shell(this.logger);

        for (const target of this.settings.allRepositories) {
            const linked: string[] = this.settings.allRepositories
                .filter((repository: string): boolean => repository !== target);

            await shell
                .setCwd(this.settings.codeDir, target)
                .execute (`npm link ${linked.join(" ")}`);
        }
    }
}
