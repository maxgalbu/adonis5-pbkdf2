'use strict'

import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import { Pbkdf2Config } from '@ioc:Adonis/Core/Hash';
import { Pbkdf2Hasher } from '../lib/Hashers/Pbkdf2Hasher';

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
        const Hash = this.app.container.resolveBinding('Adonis/Core/Hash')

        Hash.extend('pbkdf2', (_hash: any, config: Pbkdf2Config) => {
            return new Pbkdf2Hasher(config) as any;
        })
    }
}
