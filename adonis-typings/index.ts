declare module '@ioc:Adonis/Core/Hash' {
    export type Pbkdf2Config = {
        driver: 'pbkdf2'
        iterations: number
        saltSize: number
        digest: "sha1" | "sha256" | "sha512",
    }

    /**
     * Argon2 driver contract
     */
    export interface Pbkdf2Contract extends HashDriverContract {
        ids: ['pbkdf2']

        make(value: string): Promise<string>;
        verify(value: string, hash: string): Promise<boolean>;
    }
}
