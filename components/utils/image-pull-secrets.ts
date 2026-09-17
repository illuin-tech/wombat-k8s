import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";

enum PullSecretType {
    GAR = 'GAR',
    DOCKER_HUB = 'DOCKER_HUB',
    DOCKER_REGISTRY = 'DOCKER_REGISTRY',
}

interface PullSecretConfigBase {
    type: PullSecretType;
}

/**
 * Configuration for Google Artifact Registries
 * @registry url of the Artifact Registry (example: europe-docker.pkg.dev)
 * @serviceAccount String containing the ServiceAccount JSON.
 */
export interface PullSecretGarConfig extends PullSecretConfigBase{
    type: PullSecretType.GAR;
    registry: string
    serviceAccount: pulumi.Input<string>;
}

/**
 * Configuration for Docker Hub
 * @username username for the docker hub account
 * @pat Personal Access Token
 */
export interface PullSecretDockerHubConfig {
    type: PullSecretType.DOCKER_HUB;
    username: pulumi.Input<string>;
    pat: pulumi.Input<string>;
}

/**
 * Configuration for an arbitrary Docker registry authenticated with username + password/PAT.
 * @registry registry host (example: dhi.io)
 * @username username for the registry account
 * @password password or personal access token
 */
export interface PullSecretDockerRegistryConfig {
    type: PullSecretType.DOCKER_REGISTRY;
    registry: string;
    username: pulumi.Input<string>;
    password: pulumi.Input<string>;
}

export type PullSecretConfig = PullSecretGarConfig | PullSecretDockerHubConfig | PullSecretDockerRegistryConfig;

/**
 * Create an image pull secret containing the auths secrets for multiple registries
 * @param name Name of the secret to create
 * @param namespace Namespace in which the secret should be created
 * @param pullSecretConfigs List of authentication configurations for each registry
 */
export function createImagePullSecret(name: string, namespace: string, pullSecretConfigs: PullSecretConfig[]): kubernetes.core.v1.Secret {
    const stringData = pulumi.output(pullSecretConfigs)
        .apply(pullSecretConfigOutputs => {
            const auths: { [key: string]: { auth: pulumi.Input<string> } } = {};
            for (const pullSecretConfig of pullSecretConfigOutputs) {
                if (pullSecretConfig.type === PullSecretType.GAR) {
                    const authKey = Buffer.from(`_json_key:${pullSecretConfig.serviceAccount.trim()}`).toString('base64')
                    auths[pullSecretConfig.registry] = {
                        auth: authKey
                    };
                }

                if (pullSecretConfig.type === PullSecretType.DOCKER_HUB) {
                    const authKey = `${pullSecretConfig.username}:${pullSecretConfig.pat}`;
                    auths["https://index.docker.io/v1/"] = {
                        auth: Buffer.from(authKey).toString('base64'),
                    };
                    auths["dhi.io"] = {
                        auth: Buffer.from(authKey).toString('base64'),
                    };
                }

                if (pullSecretConfig.type === PullSecretType.DOCKER_REGISTRY) {
                    const authKey = `${pullSecretConfig.username}:${pullSecretConfig.password}`;
                    auths[pullSecretConfig.registry] = {
                        auth: Buffer.from(authKey).toString('base64'),
                    };
                }
            }

            if (Object.keys(auths).length === 0) {
                console.warn(`The pull secret ${name} contains no authentication.`);
            }

            return {
                '.dockerconfigjson': JSON.stringify({
                    auths: auths,
                }),
            };
        });

    return new kubernetes.core.v1.Secret(name, {
        metadata: {
            namespace: namespace,
        },
        type: 'kubernetes.io/dockerconfigjson',
        stringData: stringData,
    });
}
