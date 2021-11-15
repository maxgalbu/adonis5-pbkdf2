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
    saltSize: number
    digest: 'sha1' | 'sha256' | 'sha512'
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
    const hashModule = hashContractFile?.getModuleOrThrow("'@ioc:Adonis/Core/Hash'")

    const hashersInterface = hashModule.getInterfaceOrThrow('HashersList')

    //Remove pbkdf2 hasher, if already present
    hashersInterface.getProperty('pbkdf2')?.remove()

    //Insert pbkdf2 hasher in last position
    hashersInterface.addProperty({
        name: 'pbkdf2',
        type: `{
            implementation: Pbkdf2Contract,
            config: Pbkdf2Config,
        }`,
    })

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
            saltSize: `${state.saltSize}`,
            digest: `"${state.digest}"`,
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
            `Enter the number of iterations you want to do (should be equal or more than ${state.iterations})`,
            {
                default: state.iterations.toString(),
                validate(value) {
                    const num = parseInt(value)
                    return !isNaN(num);
                },
            }
        )
}

async function getSaltSize(sink: typeof sinkStatic, state: InstructionsState): Promise<number> {
    return sink.getPrompt().ask('Enter the size of the generated salt (more than 16 bytes)', {
        default: state.saltSize.toString(),
        validate(value) {
            const num = parseInt(value)
            return !isNaN(num) && num >= state.saltSize
        },
    })
}

async function getDigest(
    sink: typeof sinkStatic,
    state: InstructionsState
): Promise<'sha1' | 'sha256' | 'sha512'> {
    return sink.getPrompt().choice(
        'Choose the digest algorithm to be used',
        [
            {
                name: 'sha1',
            },
            {
                name: 'sha256',
            },
            {
                name: 'sha512',
            },
        ],
        {
            default: state.digest,
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
        iterations: 25000,
        saltSize: 32,
        digest: 'sha256',
    }

    state.iterations = await getIterations(sink, state)
    state.saltSize = await getSaltSize(sink, state)
    state.digest = await getDigest(sink, state)

    /**
     * Make contract file
     */
    await editContract(projectRoot, app, sink, state)

    /**
     * Make config file
     */
    await editConfig(projectRoot, app, sink, state)
}
