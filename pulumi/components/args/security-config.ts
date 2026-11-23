import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";

/**
 * Compiles Wombat auth and Quarkus OIDC configuration and provisions its Kubernetes Secret.
 */
export class SecurityConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        const security = args.security;
        if (!security.enabled)
            return { config };

        if (security.auth)
            config.auth = security.auth;

        const oidc = security.oidc;
        if (!oidc)
            throw new Error("security.oidc is required when security.enabled is true");

        if (oidc.clientSecret !== undefined && oidc.existingSecret !== undefined) {
            throw new Error("Set only one of security.oidc.clientSecret or security.oidc.existingSecret");
        }
        let oidcSecretName: pulumi.Input<string>;
        if (oidc.clientSecret !== undefined) {
            const oidcSecret = new k8s.core.v1.Secret(`wombat-service-oidc-${args.environment}`, {
                metadata: {
                    namespace: args.namespace,
                },
                stringData: {
                    "client-secret": pulumi.secret(oidc.clientSecret),
                },
            });
            oidcSecretName = oidcSecret.metadata.name;
        } else {
            if (oidc.existingSecret === undefined) {
                throw new Error("security.oidc.clientSecret or security.oidc.existingSecret is required when security.enabled is true");
            }
            oidcSecretName = oidc.existingSecret;
        }

        config.quarkus = config.quarkus || {};
        config.quarkus.oidc = {
            authServerUrl: oidc.authServerUrl,
            clientId: oidc.clientId,
            authentication: oidc.authentication,
            roles: oidc.roles,
            credentials: {
                secret: "${QUARKUS_OIDC_CREDENTIALS_SECRET}",
            },
        };

        return {
            config,
            envVariables: [
                { name: "QUARKUS_PROFILE", value: "prod,oidc" },
                {
                    name: "QUARKUS_OIDC_CREDENTIALS_SECRET",
                    valueFrom: {
                        secretKeyRef: {
                            name: oidcSecretName,
                            key: "client-secret",
                        },
                    },
                },
            ],
        };
    }
}
