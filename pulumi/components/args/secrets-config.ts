import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {ConfGroup} from "../utils/tools";

/* The app's own secret key format, which its asset forms and key checks enforce */
const SECRET_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * The provisioned secrets, one file per key, or `undefined` when there are none.
 * Throws if a key doesn't follow the app's secret key format.
 */
export function createProvisionedSecretsConf(args: WombatArgs): ConfGroup | undefined {
    const provisioned = args.secrets?.provisioned || {};
    const keys = Object.keys(provisioned);
    if (keys.length === 0)
        return undefined;

    const invalid = keys.filter(key => !SECRET_KEY_PATTERN.test(key));
    if (invalid.length > 0)
        throw new Error(`Unsupported secrets.provisioned keys: ${invalid.join(", ")}. A key is made of letters, digits, "-" and "_"`);

    return new ConfGroup(
        "/secrets",
        "wombat-service-secrets",
        keys.map(key => ({ id: key, filename: key, data: provisioned[key] }))
    );
}

/**
 * Points the app's directory secret resolver at the provisioned secrets, when there are any.
 */
export class SecretsConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        const provisioned = createProvisionedSecretsConf(args);
        if (!provisioned) {
            return { config: config };
        }

        config.wombat.secret = config.wombat.secret || {};
        config.wombat.secret.directory = {
            ...(config.wombat.secret.directory || {}),
            path: provisioned.path,
        };

        return { config: config };
    }
}
