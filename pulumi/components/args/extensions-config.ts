import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";

/**
 * Tweaks the Quarkus application configuration based on the ExtensionsConfig.
 */
export class ExtensionsConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        if (!args.extensions?.existingClaimName && !args.extensions?.pvc) {
            return { config: config };
        }

        config.wombat.module = config.wombat.module || {};
        config.wombat.module.extension = {
            ...(config.wombat.module.extension || {}),
            path: args.extensions.mountPath || "/extensions",
        };

        return { config: config };
    }
}
