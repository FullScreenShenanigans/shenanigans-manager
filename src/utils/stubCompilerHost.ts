import * as ts from "typescript";

const createSourceFilesMap = (sourceFiles: ts.SourceFile[] | Map<string, ts.SourceFile>) => {
    if (sourceFiles instanceof Map) {
        return sourceFiles;
    }

    const map = new Map<string, ts.SourceFile>();

    for (const sourceFile of sourceFiles) {
        map.set(sourceFile.fileName, sourceFile);
    }

    return map;
};

export class StubCompilerHost implements ts.CompilerHost {
    private readonly options: ts.CompilerOptions;
    private readonly sourceFiles: Map<string, ts.SourceFile>;

    public constructor(options: ts.CompilerOptions, sourceFiles: ts.SourceFile[] | Map<string, ts.SourceFile>) {
        this.options = options;
        this.sourceFiles = createSourceFilesMap(sourceFiles);
    }

    public getDefaultLibFileName() {
        return "";
    }

    public getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
        const sourceFile = this.sourceFiles.get(fileName);
        if (sourceFile !== undefined) {
            return sourceFile;
        }

        if (onError !== undefined) {
            onError(`'${fileName}' not found.`);
        }

        // TypeScript's declarations don't support strict null checks
        // tslint:disable-next-line no-any
        return undefined as any as ts.SourceFile;
    }

    public writeFile() {/* ... */}

    public getCurrentDirectory() {
        return ".";
    }

    public getCanonicalFileName(fileName: string) {
        return fileName;
    }

    public getNewLine() {
        return "\n";
    }

    public useCaseSensitiveFileNames() {
        return true;
    }

    public fileExists = (fileName: string) =>
        this.sourceFiles.has(fileName)

    public readFile = (fileName: string): string => {
        const file = this.sourceFiles.get(fileName);

        if (file === undefined) {
            throw new Error(`File not found: '${file}'`);
        }

        return file.text;
    }

    public resolveModuleNames(moduleNames: string[], containingFile: string): ts.ResolvedModule[] {
        return moduleNames.map((moduleName) => {
            const fileOperations = {
                fileExists: this.fileExists,
                readFile: this.readFile,
            };

            // tslint:disable-next-line:no-non-null-assertion
            return ts.resolveModuleName(moduleName, containingFile, this.options, fileOperations).resolvedModule!;
        });
    }

    public getDirectories(): string[] {
        throw new Error(`getDirectories is unsupported in a stub compiler.\n${new Error().stack}`);
    }
}
