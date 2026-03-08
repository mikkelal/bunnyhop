import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";
import ignore from "ignore";

const IGNORE_FILE = ".deployignore";

export function loadIgnoreFilter(cwd: string) {
	return Effect.gen(function* () {
		const content = yield* Effect.tryPromise(() =>
			readFile(join(cwd, IGNORE_FILE), "utf-8"),
		).pipe(Effect.catchAll(() => Effect.succeed(null)));

		if (content === null) return null;

		const ig = ignore().add(content);
		return (relPath: string) => !ig.ignores(relPath);
	});
}
