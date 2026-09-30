import {WombatNativeConfig} from "./wombat-args";
import {ExtensionsConfig} from "./extensions-args";

/**
 * Tweaks the Quarkus application configuration based on the ExtensionsConfig.
 */
export function applyExtensionsConfig(config: WombatNativeConfig, extensions?: ExtensionsConfig): WombatNativeConfig {
    if (extensions && (extensions.existingClaimName || extensions.pvc)) {
        config.module = config.module || {};
        config.module.extension = {
            ...(config.module.extension || {}),
            path: extensions.mountPath || "/extensions",
        };
    }
    return config;
}
