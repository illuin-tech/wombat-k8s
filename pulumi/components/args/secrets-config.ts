import * as pulumi from "@pulumi/pulumi";
import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {SecretWriteMode, VaultSecretsConfig} from "./secrets-args";
import {ConfGroup} from "../utils/tools";

/* The app's own secret key format, which its asset forms and key checks enforce */
const SECRET_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
/* Each id names an env var in Helm, and is left as is by kebabize */
const KEK_ID_PATTERN = /^[a-z0-9-]+$/;

/** Where the provisioned and existing secrets are mounted, as the app's directory secret resolver. */
export const SECRETS_PATH = "/secrets";
export const SECRETS_VOLUME_NAME = "wombat-service-secrets";

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
        SECRETS_PATH,
        SECRETS_VOLUME_NAME,
        keys.map(key => ({ id: key, filename: key, data: provisioned[key] }))
    );
}

/**
 * Whether anything is mounted at {@link SECRETS_PATH}: provisioned or existing secrets.
 * Throws if a provisioned key doesn't follow the app's secret key format.
 */
export function hasSecretsDirectory(args: WombatArgs): boolean {
    return createProvisionedSecretsConf(args) !== undefined
        || (args.secrets?.existingSecrets || []).length > 0;
}

/**
 * The CA that signs Vault's certificate, or `undefined` when Vault is off or has none.
 */
export function createVaultCaConf(args: WombatArgs): ConfGroup | undefined {
    const vault = args.secrets?.vault;
    if (!vault?.enabled || vault.caCert === undefined)
        return undefined;

    return new ConfGroup(
        "/etc/wombat/vault",
        "wombat-service-vault-ca",
        [{ id: "vault-ca", filename: "ca.pem", data: vault.caCert }]
    );
}

/**
 * Writes the secret backends to `wombat.secret` and the Vault client to `quarkus.vault`.
 */
export class SecretsConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        const secrets = args.secrets;
        if (!secrets)
            return { config: config };

        /* Copied, as it may come from args.config */
        const secret: {[key: string]: any} = { ...(config.wombat.secret || {}) };

        if (hasSecretsDirectory(args))
            secret.directory = { ...(secret.directory || {}), path: SECRETS_PATH };

        const writeMode = secrets.writeMode || SecretWriteMode.DISABLED;
        if (!Object.values(SecretWriteMode).includes(writeMode))
            throw new Error(`Unsupported secrets.writeMode: ${writeMode}`);
        if (writeMode !== SecretWriteMode.DISABLED)
            secret.writeMode = writeMode;

        if (writeMode === SecretWriteMode.DATABASE)
            secret.database = this.compileDatabase(args);

        if (writeMode === SecretWriteMode.VAULT && !secrets.vault?.enabled)
            throw new Error("secrets.writeMode vault requires secrets.vault.enabled");
        if (secrets.vault?.enabled) {
            secret.vault = { enabled: true, pathPrefix: secrets.vault.pathPrefix };
            config.quarkus = config.quarkus || {};
            config.quarkus.vault = this.compileVaultClient(secrets.vault, createVaultCaConf(args));
        }

        if (secrets.cache?.ttl !== undefined)
            secret.cache = { ttl: secrets.cache.ttl };

        if (writeMode !== SecretWriteMode.DISABLED && !args.security?.enabled)
            pulumi.log.warn(`secrets.writeMode is ${writeMode} while security is disabled: anyone who reaches the service can list, write and delete secrets`);

        if (Object.keys(secret).length > 0)
            config.wombat.secret = secret;

        return { config: config };
    }

    private compileDatabase(args: WombatArgs): {[key: string]: any} {
        const database = args.secrets?.database;
        if (!database)
            throw new Error("secrets.writeMode database requires secrets.database");

        const ids = Object.keys(database.kek || {});
        if (ids.length === 0)
            throw new Error("secrets.writeMode database requires at least one secrets.database.kek");
        const invalid = ids.filter(id => !KEK_ID_PATTERN.test(id));
        if (invalid.length > 0)
            throw new Error(`Unsupported secrets.database.kek ids: ${invalid.join(", ")}. An id is made of lowercase letters, digits and "-"`);
        if (!ids.includes(database.activeKekId))
            throw new Error(`secrets.database.activeKekId must be one of the secrets.database.kek ids: ${ids.join(", ")}`);

        /* The override is a Secret, so the keys can sit there */
        return { activeKekId: database.activeKekId, kek: database.kek };
    }

    private compileVaultClient(vault: VaultSecretsConfig, caConf: ConfGroup | undefined): {[key: string]: any} {
        const client = vault.client;
        if (!client?.url)
            throw new Error("secrets.vault.client.url is required when secrets.vault.enabled is true");

        const methods = ["kubernetes", "appRole", "clientToken"]
            .filter(method => (client.authentication as {[key: string]: any} | undefined)?.[method] !== undefined);
        if (methods.length !== 1)
            throw new Error("secrets.vault.client.authentication requires exactly one of kubernetes, appRole or clientToken");
        const authentication = client.authentication;
        if (authentication.kubernetes && !authentication.kubernetes.role)
            throw new Error("secrets.vault.client.authentication.kubernetes.role is required");
        if (authentication.appRole && !(authentication.appRole.roleId && authentication.appRole.secretId))
            throw new Error("secrets.vault.client.authentication.appRole requires roleId and secretId");

        if (!caConf)
            return client;
        if (client.tls && "caCert" in client.tls)
            throw new Error("secrets.vault.caCert and secrets.vault.client.tls.caCert cannot both be set");
        return { ...client, tls: { ...(client.tls || {}), caCert: caConf.asFileList()[0] } };
    }
}
