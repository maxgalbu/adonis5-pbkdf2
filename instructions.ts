import { join } from 'path'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import {
    IndentationText,
    NewLineKind,
    Project,
    PropertyAssignment,
    SyntaxKind,
    Writers,
} from 'ts-morph'
import { parse as parseEditorConfig } from 'editorconfig'

type InstructionsState = {
    iterations: number
    saltLength: number
    keyLength: number
}

/**
 *
 * @returns
 */
async function getIntendationConfigForTsMorph(projectRoot: string) {
    const indentConfig = await parseEditorConfig(projectRoot + '/.editorconfig')

    let indentationText
    if (indentConfig.indent_style === 'space' && indentConfig.indent_size === 2) {
        indentationText = IndentationText.TwoSpaces
    } else if (indentConfig.indent_style === 'space' && indentConfig.indent_size === 4) {
        indentationText = IndentationText.FourSpaces
    } else if (indentConfig.indent_style === 'tab') {
        indentationText = IndentationText.Tab
    }

    let newLineKind
    if (indentConfig.end_of_line === 'lf') {
        newLineKind = NewLineKind.LineFeed
    } else if (indentConfig.end_of_line === 'crlf') {
        newLineKind = NewLineKind.CarriageReturnLineFeed
    }

    return { indentationText, newLineKind }
}

async function getTsMorphProject(projectRoot: string) {
    const { indentationText, newLineKind } = await getIntendationConfigForTsMorph(projectRoot)
    return new Project({
        tsConfigFilePath: projectRoot + '/tsconfig.json',
        manipulationSettings: {
            indentationText: indentationText,
            newLineKind: newLineKind,
            useTrailingCommas: true,
        },
    })
}

/**
 * Creates the contract file
 */
async function editContract(
    projectRoot: string,
    app: ApplicationContract,
    sink: typeof sinkStatic,
    _state: InstructionsState
) {
    const contractsDirectory = app.directoriesMap.get('contracts') || 'contracts'
    const contractPath = join(contractsDirectory, 'hash.ts')

    //Instantiate ts-morph
    const project = await getTsMorphProject(projectRoot)
    const hashContractFile = project.getSourceFileOrThrow(contractPath)

    //Doesn't work without single quotes wrapping the module name
    const hashModule = hashContractFile?.getModuleOrThrow("'@ioc:Adonis/Core/Hash'");

    const hashersInterface = hashModule.getInterfaceOrThrow('HashersList');

    //Remove pbkdf2 hasher, if already present
    hashersInterface.getProperty("pbkdf2")?.remove();

    //Insert pbkdf2 hasher in last position
    hashersInterface.addProperty({
        name: "pbkdf2",
        type: `{
            implementation: Pbkdf2Contract,
            config: Pbkdf2Config,
        }`,
    });

    hashContractFile.formatText()
    await hashContractFile?.save()

    sink.logger.action('update').succeeded(contractPath)
}

/**
 * Makes the auth config file
 */
async function editConfig(
    projectRoot: string,
    app: ApplicationContract,
    sink: typeof sinkStatic,
    state: InstructionsState
) {
    const configDirectory = app.directoriesMap.get('config') || 'config'
    const configPath = join(configDirectory, 'hash.ts')

    //Instantiate ts-morph
    const project = await getTsMorphProject(projectRoot)
    const hashConfigFile = project.getSourceFileOrThrow(configPath)

    const variable = hashConfigFile
        ?.getVariableDeclarationOrThrow('hashConfig')
        .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    let hashersListProperty = variable?.getPropertyOrThrow('list') as PropertyAssignment
    let hashersListObject = hashersListProperty.getInitializerIfKindOrThrow(
        SyntaxKind.ObjectLiteralExpression
    )

    //Remove JWT config, if already present
    hashersListObject.getProperty('pbkdf2')?.remove()

    //Add JWT config
    hashersListObject?.addPropertyAssignment({
        name: 'pbkdf2',
        initializer: Writers.object({
            driver: '"pbkdf2"',
            iterations: `${state.iterations}`,
            saltLength: `${state.saltLength}`,
            keyLength: `${state.keyLength}`,
        }),
    })

    hashConfigFile.formatText()
    await hashConfigFile?.save()

    sink.logger.action('update').succeeded(configPath)
}

/**
 * Prompts user for the table name
 */
async function getIterations(sink: typeof sinkStatic, state: InstructionsState): Promise<number> {
    return sink
        .getPrompt()
        .ask(
            'Enter the number of iterations you want to do (equal or more than 10)',
            {
                default: state.iterations.toString(),
                validate(value) {
                    const num = parseInt(value);
                    return !isNaN(num) && num >= 10;
                },
            }
        )
}

async function getSaltLength(sink: typeof sinkStatic, state: InstructionsState): Promise<number> {
    return sink
        .getPrompt()
        .ask(
            'Enter the length of the generated salt (more than 16 bytes)',
            {
                default: state.saltLength.toString(),
                validate(value) {
                    const num = parseInt(value);
                    return !isNaN(num) && num >= 16;
                },
            }
        )
}

async function getKeyLength(sink: typeof sinkStatic, state: InstructionsState): Promise<number> {
    return sink
        .getPrompt()
        .ask(
            'Enter lenght of the key (more than 256 bytes)',
            {
                default: state.keyLength.toString(),
                validate(value) {
                    const num = parseInt(value);
                    return !isNaN(num) && num >= 256;
                },
            }
        )
}

/**
 * Instructions to be executed when setting up the package.
 */
export default async function instructions(
    projectRoot: string,
    app: ApplicationContract,
    sink: typeof sinkStatic
) {
    const state: InstructionsState = {
        iterations: 10,
        saltLength: 32,
        keyLength: 256,
    }

    state.iterations = await getIterations(sink, state);
    state.saltLength = await getSaltLength(sink, state);
    state.keyLength = await getKeyLength(sink, state);

    /**
     * Make contract file
     */
    await editContract(projectRoot, app, sink, state)

    /**
     * Make config file
     */
    await editConfig(projectRoot, app, sink, state)
}
