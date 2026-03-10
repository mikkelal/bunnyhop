#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "node:util";

const { values } = parseArgs({ args: process.argv.slice(2), options: { "env-file": { type: "string" } }, strict: false });
const envFile = typeof values["env-file"] === "string" ? values["env-file"] : undefined;
try { process.loadEnvFile(envFile); } catch { /* .env not found */ }
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";
import { deployCliOptions, purgeCliOptions, resolveConfig, validateConfig } from "./config.ts";
import { deploy as deployOrchestrator } from "../deploy/orchestrator.ts";
import { purgeUrls } from "../bunny/purge.ts";
import { configureUi } from "../ui/runtime.ts";
import { intro, outro } from "@clack/prompts";

const deploy = Command.make(
   "deploy",
   deployCliOptions,
   (rawConfig) =>
      Effect.gen(function* () {
         const config = resolveConfig(rawConfig);

         configureUi(config.isCi);

         intro("bunnyhop");
         yield* validateConfig(config);

         yield* deployOrchestrator(config).pipe(
            Effect.ensuring(
               Effect.sync(() => {
                  process.stdin.unref?.();
               }),
            ),
            Effect.asVoid,
         );

         outro("Done");
         return;
      }),
).pipe(
   Command.withDescription("Upload to bunny.net."),
);

const purge = Command.make(
   "purge",
   purgeCliOptions,
   (config) =>
      Effect.gen(function* () {
         configureUi(config.isCi);

         intro("bunnyhop purge");

         if (config.paths.length === 0) {
            return yield* Effect.fail(
               new Error("Provide one or more paths to purge (e.g. bunnyhop purge /index.html /about/)."),
            );
         }

         yield* purgeUrls(config.paths, {
            pullZoneUrl: config.pullZoneUrl,
            apiKey: config.apiKey,
            bunny_api_rate_limit: config.bunny_api_rate_limit,
            retryLimit: config.retryLimit,
            requestTimeout: config.requestTimeout,
            purgeStrict: config.purgeStrict,
         }).pipe(
            Effect.ensuring(
               Effect.sync(() => {
                  process.stdin.unref?.();
               }),
            ),
         );

         outro("Done");
         return;
      }),
).pipe(
   Command.withDescription("Purge cache."),
);

const app = Command.make("bunnyhop").pipe(
   Command.withSubcommands([deploy, purge]),
);

const cli = Command.run(app, {
   name: "Bunny Deploy",
   version: "0.1.0",
});

cli(process.argv).pipe(
   Effect.provide(NodeContext.layer),
   Effect.catchTag("MissingValue", () => Console.log(`\n\x1b[33mSee https://github.com/mikkelal/bunnyhop#readme for setup instructions.\x1b[0m\n`)),
   NodeRuntime.runMain,
);
