# adonis5-pbkdf2

[![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

A package that adds PBKDF2 to the hashers of Adonisjs v5.

## Installation

Install `adonis5-pbkdf2` via `npm` or `yarn`:

```js
npm install adonis5-pbkdf2
//Or, with yarn: yarn add adonis5-pbkdf2
```

## Configure

After the package has been installed, you have to configure it by running a command:

```js
node ace configure adonis5-pbkdf2
```

Then, you need to edit your `.env` file to add or edit the `HASH_DRIVER` key:

```env
HASH_DRIVER=pbkdf2
```

If you want to also allow typescript to typecheck the .env file, edit the `env.ts` file and add the following line:

```ts
export default Env.rules({
	//....
    HASH_DRIVER: Env.schema.enum(['bcrypt','argon','pbkdf2'] as const), //<---- add this line
})
```

## Usage

You can use pbfdf2 through the Hash class, like any other hasher:

```ts
import Hash from '@ioc:Adonis/Core/Hash'
const hashedPassword = await Hash.make("hello world")
```

[npm-image]: https://img.shields.io/npm/v/adonis5-pbkdf2.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/adonis5-pbkdf2 "npm"

[license-image]: https://img.shields.io/npm/l/adonis5-pbkdf2?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
