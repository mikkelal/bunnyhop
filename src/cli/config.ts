import { Args, Command, HelpDoc, Options, ValidationError } from "@effect/cli";
import { Config, Effect, Option } from "effect";
import { type RegionCode, regionValues } from "../bunny/storage.ts";

function normalizeTargetDir(value: string): string {
   const normalized = value.replace(/^\/+/, "").replace(/\/+$/, "");
   return normalized || value;
}

const regionChoices = regionValues.map(
   (v) => [v, v] as [string, RegionCode],
);

function normalizePullZoneUrl(value: string): Effect.Effect<string, ValidationError.ValidationError> {
   if (!URL.canParse(value)) {
      return Effect.fail(ValidationError.invalidValue(HelpDoc.p(`Invalid pull zone URL: ${value}`)));
   }

   const url = new URL(value);
   if (url.protocol !== "http:" && url.protocol !== "https:") {
      return Effect.fail(ValidationError.invalidValue(HelpDoc.p("Pull zone URL must start with http or https.")));
   }

   return Effect.succeed(url.toString().replace(/\/+$/, ""));
}

// --- shared options ---

const buildDir = Options.directory("build-dir").pipe(
   Options.withAlias("build"),
   Options.withDefault("dist"),
   Options.withDescription("Path to the build output directory to deploy."),
   Options.map(normalizeTargetDir),
);

const bunny_storage_region = Options.choiceWithValue("region", regionChoices).pipe(
   Options.withFallbackConfig(Config.literal(...regionValues)("BUNNY_REGION")),
   Options.withDescription("The bunny.net storage region. (env: BUNNY_REGION)"),
);

const bunny_storage_zone = Options.text("storage-zone").pipe(
   Options.withFallbackConfig(Config.string("BUNNY_STORAGE_ZONE")),
   Options.withDescription("The name of the bunny.net storage zone to deploy to. (env: BUNNY_STORAGE_ZONE)"),
);

const bunny_storage_accessKey = Options.text("access-key").pipe(
   Options.withFallbackConfig(Config.string("BUNNY_STORAGE_ACCESS_KEY")),
   Options.withDescription("The access key for authenticating with the bunny.net storage API. (env: BUNNY_STORAGE_ACCESS_KEY)"),
);

const keepUnknownFiles = Options.boolean("keep-unknown-files").pipe(
   Options.withFallbackConfig(Config.boolean("BUNNY_KEEP_UNKNOWN_FILES")),
   Options.withDescription("Keep files in bunny.net storage that are not found in the build. (env: BUNNY_KEEP_UNKNOWN_FILES)"),
);

const skipPurge = Options.boolean("skip-purge").pipe(
   Options.withFallbackConfig(Config.boolean("BUNNY_SKIP_PURGE")),
   Options.withDescription("Skip purging the CDN cache after deploying. (env: BUNNY_SKIP_PURGE)"),
);

const apiKey = Options.text("api-key").pipe(
   Options.withFallbackConfig(Config.string("BUNNY_API_KEY")),
   Options.withDescription("The bunny.net account API key, required for cache purging. (env: BUNNY_API_KEY)"),
);

const pullZoneUrl = Options.text("pullzone-url").pipe(
   Options.withFallbackConfig(Config.string("BUNNY_PULL_ZONE_URL")),
   Options.withDescription("The pull zone URL to purge (e.g. https://your-blog.example.com). (env: BUNNY_PULL_ZONE_URL)"),
   Options.mapEffect(normalizePullZoneUrl),
);

const purgeStrict = Options.boolean("purge-strict").pipe(
   Options.withDescription("Fail if any changed files could not be purged from the CDN cache."),
);

const envFile = Options.file("env-file").pipe(
   Options.optional,
   Options.withDescription("Path to an .env file to load. Defaults to .env in the current directory."),
);

const isCi = Options.boolean("ci").pipe(
   Options.withFallbackConfig(Config.boolean("CI")),
   Options.withDescription("Run in CI mode, disabling interactive prompts. (env: CI)"),
);

const bunny_api_rate_limit = Options.integer("concurrency").pipe(
   Options.withDefault(100),
   Options.withDescription("The concurrency used for the bunny.net api."),
);

const retryLimit = Options.integer("retry-limit").pipe(
   Options.withDefault(3),
   Options.withDescription("Number of retry attempts for failed API requests. (default: 3)"),
);

const replicationTimeout = Options.integer("replication-timeout").pipe(
   Options.withDefault(10000),
   Options.withDescription("Milliseconds to wait for geo-replicated storage zones to sync before purging. (default: 1 second)"),
);

const requestTimeout = Options.integer("request-timeout").pipe(
   Options.withDefault(5000),
   Options.withDescription("Timeout in milliseconds for API requests. (default: 5 second)"),
);

// --- command option sets ---

const buildPathArg = Args.directory({ name: "build-path" }).pipe(Args.optional);

export const deployCliOptions = {
   envFile,
   buildDir,
   buildPathArg,
   bunny_storage_region,
   bunny_storage_zone,
   bunny_storage_accessKey,
   keepUnknownFiles,
   skipPurge,
   apiKey: Options.optional(apiKey),
   pullZoneUrl: Options.optional(pullZoneUrl),
   purgeStrict,
   isCi,
   bunny_api_rate_limit,
   retryLimit,
   replicationTimeout,
   requestTimeout,
} as const;

export type CliConfig = Command.Command.ParseConfig<typeof deployCliOptions>;

export const purgeCliOptions = {
   envFile,
   paths: Args.text({ name: "paths" }).pipe(Args.repeated),
   apiKey,
   pullZoneUrl,
   purgeStrict,
   isCi,
   bunny_api_rate_limit,
   retryLimit,
   requestTimeout,
} as const;

export type PurgeCliConfig = Command.Command.ParseConfig<typeof purgeCliOptions>;

export function resolveConfig(config: CliConfig): CliConfig {
   if (Option.isSome(config.buildPathArg)) {
      return { ...config, buildDir: normalizeTargetDir(config.buildPathArg.value) };
   }
   return config;
}

export function validateConfig(config: CliConfig) {
   return Effect.gen(function* () {
      if (config.skipPurge) return;

      const missing: string[] = [];
      if (Option.isNone(config.pullZoneUrl)) missing.push("--pullzone-url or BUNNY_PULL_ZONE_URL");
      if (Option.isNone(config.apiKey)) missing.push("--api-key or BUNNY_API_KEY");

      if (missing.length > 0) {
         return yield* Effect.fail(
            new Error(`Purge is enabled but missing:\n   ${missing.join(",\n   ")}`),
         );
      }
   });
}
