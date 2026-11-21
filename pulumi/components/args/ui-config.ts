import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";

/**
 * Tweaks the Quarkus application configuration based on the UiConfig, which the app reads at the root, not under `wombat`.
 */
export class UiConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        if (!args.ui)
            return { config: config };

        config.ui = args.ui;
        return { config: config };
    }
}
