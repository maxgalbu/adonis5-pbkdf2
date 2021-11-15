'use strict'

import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import { HashContract, Pbkdf2Config } from '@ioc:Adonis/Core/Hash';

export default class JwtProvider {
    constructor(protected app: ApplicationContract) {}

    /**
     * Register namespaces to the IoC container
     *
     * @method register
     *
     * @return {void}
     */
    public async register() {
        const { Pbkdf2Hasher } = await import('../lib/Hashers/Pbkdf2Hasher');
        const Hash = this.app.container.resolveBinding('Adonis/Core/Hash')

        Hash.extend('pbkdf2', (_hash: HashContract, _driver: string, config: Pbkdf2Config) => {
            return new Pbkdf2Hasher(config);
        })
    }
}
