import { Pbkdf2Config, Pbkdf2Contract } from '@ioc:Adonis/Core/Hash'
import pbkdf2 from '@phc/pbkdf2'

export class Pbkdf2Hasher implements Pbkdf2Contract {
    public ids: Pbkdf2Contract['ids'] = ['pbkdf2']

    constructor(private config: Pbkdf2Config) {}

    /**
     * Hash plain value using sha.
     */
    public make(value: string): Promise<string> {
        return new Promise((resolve, _reject) => {
            resolve(
                pbkdf2.hash(value, {
                    iterations: this.config.iterations,
                    saltSize: this.config.saltSize,
                    digest: this.config.digest,
                })
            )
        })
    }

    /**
     * Verify an existing hash with the plain value.
     */
    public verify(value: string, hash: string): Promise<boolean> {
        return new Promise((resolve, _reject) => {
            resolve(
                pbkdf2.verify(hash, value)
            )
        })
    }
}
