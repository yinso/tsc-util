## `tsc-util` - Wraps Around `tsc` to Copy Declaration and JS Files

If you follow the practice of keep TypeScript source and output files in different directories (for example, the output goes to a `dist` folder), you might have run into the following situations:

* While you can write `*.ts` files for the majority of the cases, some of the scripts are better written as `*.js` and `*.d.ts` files.
* When you run `tsc`, you find that the `*.ts` files were copied, but none of the `*.js` and `*.d.ts` files are.
* You research online and found that `allowJs` needs to be enabled in order to also copy the `*.js` files.
* That works great, so you also try to enable `declaration` in order to copy the `*.d.ts` files, but immediately [this caused an error says that `declaration` and `allowUs` are conflicting with each other](https://github.com/Microsoft/TypeScript/issues/7546) and the issue is still open.
* After you discovered [the work around](https://shuoit.net/tech-notes/Allow--declaration-with--allowJs-1546511333.html), it turns out that manually written `*.d.ts` won't be copied.

This small utility is meant to support the development pattern of:

* Intermixing `*.ts` and `*.d.ts` / `*.js` pair in the source directory.
* Copy to an `dist` directory, with the `*.d.ts` and `*.js` copied.
* Any references to `dist` foldr inside the `*.js` files are normalized to remove `dist`.
* If you are using `ts-node` in the `*.js`, it's removed when copied to `dist`.
* If you are using `source-map-support` in the `*.js`, it's removed once copied to `dist`.

As the `*.d.ts` and `*.js` files are manually copied, you do not need to enable `allowJs` in `tsconfig`.

## Install

`npm install -g tsc-util`

## Usage

Just run `tsc-util` (in place of `tsc`). Note that `tsc-util` currently doesn't handle any parameters that `tsc` does, i.e. it's not a pass through, even though it calls `tsc` for you.

There are two main patterns:

* `source-map-support` pattern - use `dist/` in the `import`/`require`'s.
* `ts-node` pattern - use without `dist/` in the `import`/`require`'s.

## `source-map-support` Usage Pattern

The `source-map-support` pattern is as follows:

* Try to include the files from the `dist` folder, which includes the `*.d.ts`, `*.js`, and `*.js.map` files.
* use `source-map-support` to map back to the `*.ts` in the root folder.

With this pattern, you'll need to first compile `dist` folder before doing testing, and need to check in the `dist` folder if you need to `npm install` from `git` (instead of `npm` registry). The nice part of this pattern is that you are not including TypeScript as part of the run-time.

## `ts-node` Usage Pattern

The `ts-node` pattern is as follows:

* Use `require('ts-node/register')` in the start script.
* all of the includes are referencing outside of the `dist` folder, since we will be directly running via `ts-node`.

With this pattern, you'll need to use `ts-node` as part of your development process. `dist` doesn't need to exist first prior to development, nor does `dist` needs to be checked in if you are `npm install` from `git`.

