import * as pulumi from "@pulumi/pulumi";

/**
 * The backend behind the app's secret-management API (`wombat.secret.write-mode`).
 */
export enum SecretWriteMode {
    DISABLED = "disabled",
    DATABASE = "database",
    VAULT = "vault",
}

/**
 * The secret backends the app resolves secret keys from (e.g. a `kubernetes-api` asset's `kubeconfigKey`). Each one is
 * optional. See https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md
 */
export interface SecretsConfig {
    /**
     * Secrets set with the deployment, by key, each value a Pulumi secret. They reach the app as a read-only secret
     * backend: a Kubernetes Secret mounted as its directory secret resolver. Keys follow the app's secret key format,
     * `[A-Za-z0-9_-]+`.
     */
    provisioned?: {
        [key: string]: pulumi.Input<string>;
    };
    /**
     * Kubernetes Secrets of the namespace, created outside the stack. Each of their keys is a secret, mounted next to
     * the provisioned ones.
     */
    existingSecrets?: pulumi.Input<string>[];
    /** The backend behind the app's `/api/secrets`, `disabled` by default. It also comes first when resolving. */
    writeMode?: SecretWriteMode;
    /** The database writer's key-encryption keys, required with the `database` write mode. */
    database?: DatabaseSecretsConfig;
    vault?: VaultSecretsConfig;
    cache?: {
        /** How long a resolved secret is kept in memory, e.g. `10m` (the app's default). `0` disables the cache. */
        ttl?: pulumi.Input<string>;
    };
}

export interface DatabaseSecretsConfig {
    /** One of the ids of `kek`. */
    activeKekId: string;
    /** Base64 for 32 bytes, as Pulumi secrets, by id. An id is made of lowercase letters, digits and "-". */
    kek: {
        [id: string]: pulumi.Input<string>;
    };
}

/**
 * HashiCorp Vault KV v2: a read-only resolver, or the writer with the `vault` write mode.
 */
export interface VaultSecretsConfig {
    enabled: boolean;
    /** The app's default: `wombat`. */
    pathPrefix?: pulumi.Input<string>;
    /** The CA that signs Vault's certificate, in PEM. It is mounted, and set as `client.tls.caCert`. */
    caCert?: pulumi.Input<string>;
    /** Written to `quarkus.vault`, see https://docs.quarkiverse.io/quarkus-vault/dev/index.html */
    client: VaultClientConfig;
}

export interface VaultClientConfig {
    url: pulumi.Input<string>;
    /** Quarkus's default: `secret`. */
    kvSecretEngineMountPath?: pulumi.Input<string>;
    tls?: {
        skipVerify?: pulumi.Input<boolean>;
        useKubernetesCaCert?: pulumi.Input<boolean>;
    };
    enterprise?: {
        namespace?: pulumi.Input<string>;
    };
    /** Exactly one method. `kubernetes` needs no credential: it logs in with the pod's ServiceAccount. */
    authentication: {
        kubernetes?: {
            role: pulumi.Input<string>;
            authMountPath?: pulumi.Input<string>;
        };
        appRole?: {
            roleId: pulumi.Input<string>;
            /** As a Pulumi secret: it is written to the `application.yaml` override, itself a Secret. */
            secretId: pulumi.Input<string>;
            authMountPath?: pulumi.Input<string>;
        };
        /** As a Pulumi secret: it is written to the `application.yaml` override, itself a Secret. */
        clientToken?: pulumi.Input<string>;
    };
}
