import * as pulumi from "@pulumi/pulumi";

/**
 * The secret backends the app resolves secret keys from (e.g. a `kubernetes-api` asset's `kubeconfigKey`). Each one is
 * optional.
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
}
