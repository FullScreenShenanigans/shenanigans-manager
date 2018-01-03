import * as fs from "mz/fs";
import * as path from "path";
import * as tsutils from "tsutils";
import * as ts from "typescript";

import { globAsync, parseFileJson } from "./files";
import { StubCompilerHost } from "./stubCompilerHost";

export const createProgram = async () => {
    const options = await parseFileJson<ts.CompilerOptions>(
        path.join(__dirname, "../../tsconfig.json"));

    const sourceFilePaths = (await globAsync(path.join(__dirname, "../../src/**/*.ts")))
        .filter((sourceFilePath) => sourceFilePath.indexOf(".d.ts") === -1);

    const sourceFiles = await Promise.all(
        sourceFilePaths.map(
            async (sourceFilePath) => ts.createSourceFile(
                sourceFilePath,
                (await fs.readFile(sourceFilePath)).toString(),
                ts.ScriptTarget.ESNext)));

    return ts.createProgram(
        sourceFiles.map((sourceFile) => sourceFile.fileName),
        options,
        new StubCompilerHost(options, sourceFiles));
};

/**
 * Relevant nodes for a command.
 */
export interface ICommandNodes {
    /**
     * Interface for the command's args.
     */
    args?: ts.TypeReferenceNode;

    /**
     * Documentation comment on the initializer.
     */
    docs?: string;

    /**
     * Command function itself.
     */
    initializer: ts.ArrowFunction;
}

/**
 * Gets the relevant nodes for a file's command args interface.
 *
 * @param sourceFile   Source file containing a command arrow function.
 * @returns Relevant nodes for the command.
 */
export const getCommandNodes = (sourceFile: ts.SourceFile): ICommandNodes => {
    for (const child of sourceFile.getChildren(sourceFile)[0].getChildren(sourceFile)) {
        if (!ts.isVariableStatement(child)
            || !tsutils.hasModifier(child.modifiers, ts.SyntaxKind.ExportKeyword)
            || child.declarationList.declarations.length !== 1) {
            continue;
        }

        const declaration = child.declarationList.declarations[0];
        if (declaration.initializer === undefined) {
            continue;
        }

        const { initializer } = declaration;
        if (!ts.isArrowFunction(initializer)) {
            continue;
        }

        const jsdoc = tsutils.getJsDoc(child, sourceFile);
        const docs = (jsdoc === undefined || jsdoc.length === 0)
            ? undefined
            : jsdoc[0].comment;

        const nodes: ICommandNodes = { initializer, docs };

        if (initializer.parameters.length > 1) {
            const { type } = initializer.parameters[1];
            if (type === undefined || !ts.isTypeReferenceNode(type)) {
                return nodes;
            }

            const { typeName } = type;
            if (!ts.isIdentifier(typeName)) {
                return nodes;
            }

            const { text } = typeName;
            if (!/^I(.*)Args$/.test(text)) {
                return nodes;
            }

            nodes.args = type;
        }

        return nodes;
    }

    throw new Error(`Could not find command in ${sourceFile.fileName}.`);
};

export const getMembersFromTypeReference = (program: ts.Program, reference: ts.TypeReferenceNode) => {
    const typeChecker = program.getTypeChecker();
    const members: ts.Symbol[] = [];
    const symbol = typeChecker.getSymbolAtLocation(reference.typeName);
    if (symbol === undefined || symbol.members === undefined) {
        return members;
    }

    symbol.members.forEach((member: ts.Symbol): void => {
        members.push(member);
    });

    return members;
};

export interface IRepositoryArgDescriptors {
    optional: IRepositoryArgDescriptor[];
    required: IRepositoryArgDescriptor[];
}

export interface IRepositoryArgDescriptor {
    comment: string;
    name: string;
    type: string;
}

export const getRepositoryArgDescriptors = (program: ts.Program, sourceFile: ts.SourceFile): IRepositoryArgDescriptors => {
    const descriptors: IRepositoryArgDescriptors = {
        optional: [],
        required: [],
    };

    const nodes = getCommandNodes(sourceFile);
    if (nodes.args === undefined) {
        return descriptors;
    }

    const members = getMembersFromTypeReference(program, nodes.args);

    for (const member of members) {
        const { valueDeclaration } = member;
        if (
            valueDeclaration === undefined
            || !ts.isPropertySignature(valueDeclaration)) {
            continue;
        }

        const jsdocs = tsutils.getJsDoc(valueDeclaration);
        if (jsdocs.length !== 1) {
            continue;
        }

        const { comment } = jsdocs[0];
        if (comment === undefined) {
            continue;
        }

        const type = valueDeclaration.type === undefined
            ? "unknown"
            : valueDeclaration.type.getText(sourceFile);

        (valueDeclaration.questionToken === undefined ? descriptors.required : descriptors.optional).push({
            comment,
            name: member.name,
            type,
        });
    }

    const typeChecker = program.getTypeChecker();
    const argsType = typeChecker.getTypeAtLocation(nodes.args);
    if (argsType.symbol !== undefined && argsType.symbol.declarations !== undefined) {
        const { declarations } = argsType.symbol;

        if (declarations.length !== 0) {
            const [declaration] = declarations;

            if (ts.isInterfaceDeclaration(declaration) && declaration.heritageClauses !== undefined) {
                for (const heritageClause of declaration.heritageClauses) {
                    for (const type of heritageClause.types) {
                        const typeName = type.expression.getText(sourceFile);

                        if (typeName === "IRepositoryCommandArgs") {
                            descriptors.optional.push({
                                comment: "Name of a repository directory to run within.",
                                name: "repository",
                                type: "string",
                            });
                        }
                    }
                }
            }
        }
    }

    descriptors.optional.push({
        comment: "Directory to run within, if not the current.",
        name: "directory",
        type: "string",
    });

    return descriptors;
};
