import { Pbkdf2Config, Pbkdf2Contract } from '@ioc:Adonis/Core/Hash'
import crypto from 'crypto'

export class Pbkdf2Hasher implements Pbkdf2Contract {
    public ids: Pbkdf2Contract['ids'] = ['pbkdf2']

    constructor(private config: Pbkdf2Config) {}

    /**
     * Hash plain value using sha.
     */
    public make(value: string): Promise<string> {
        return new Promise((resolve, _reject) => {
            const salt = crypto.randomBytes(this.config.saltLength).toString('base64')
            const hashedSalt = crypto
                .pbkdf2Sync(value, salt, this.config.iterations, this.config.keyLength, 'sha512')
                .toString('base64')

            resolve(`${this.config.iterations}:${salt}:${hashedSalt}`)
        })
    }

    /**
     * Verify an existing hash with the plain value.
     */
    public verify(value: string, hash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const [iterations, salt, hashedPassword] = hash.split(':')

            if (!hashedPassword) {
                return reject(new Error('Invalid hashed password found'))
            }
            if (!salt) {
                return reject(new Error('Invalid salt found'))
            }
            if (!iterations) {
                return reject(new Error('Invalid iterations found'))
            }

            const iterationsNum = parseInt(iterations)
            resolve(
                hashedPassword ===
                    crypto
                        .pbkdf2Sync(value, salt, iterationsNum, this.config.keyLength, 'sha512')
                        .toString('base64')
            )
        })
    }
}
