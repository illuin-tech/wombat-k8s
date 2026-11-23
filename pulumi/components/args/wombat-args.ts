import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {JVMOptions} from "../utils/tools";
import {PullSecretConfig} from "../utils/image-pull-secrets";
import {Duration} from "./commons-args";
import {MonitoredEnvironment} from "./monitored-environments-args";
import {SecretsConfig} from "./secrets-args";
import {IngressArgs} from "./k8s-args";
import {CompactionConfig, PersistenceProfile} from "./persistence-args";
import {WombatDependencyConfig} from "./dependencies-args";
import {ExtensionsConfig} from "./extensions-args";
import * as inputs from "@pulumi/kubernetes/types/input";

export interface UiConfig {
    maxDateRange?: Duration;
}

export interface WombatConfig {
    [key: string]: any;
}

export interface AppConfig {
    wombat: WombatConfig;
    persistence?: { [key: string]: any; }
    ui?: { [key: string]: any; }
    auth?: WombatAuthConfig;
    quarkus?: {
        oidc?: {
            authServerUrl?: pulumi.Input<string>;
            clientId?: pulumi.Input<string>;
            credentials?: { secret?: pulumi.Input<string>; };
            authentication?: {
                scopes?: pulumi.Input<string[]>;
                userInfoRequired?: pulumi.Input<boolean>;
                extraParams?: { [key: string]: pulumi.Input<string>; };
            };
            roles?: {
                roleClaimPath?: pulumi.Input<string>;
                source?: pulumi.Input<string>;
            };
        };
    };
}

export interface WombatAuthConfig {
    allowedEmailDomains?: pulumi.Input<string[]>;
    emailClaim?: pulumi.Input<string>;
    requireVerifiedEmail?: pulumi.Input<boolean>;
    displayNameClaims?: pulumi.Input<string[]>;
    idpLogout?: pulumi.Input<boolean>;
    roles?: {
        admin?: pulumi.Input<string[]>;
        user?: pulumi.Input<string[]>;
    };
}

export interface AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage;
}

export interface AppPackage {
    config: AppConfig,
    envVariables?: inputs.core.v1.EnvVar[];
}

export interface OidcConfig {
    authServerUrl: pulumi.Input<string>;
    clientId: pulumi.Input<string>;
    clientSecret?: pulumi.Input<string>;
    existingSecret?: pulumi.Input<string>;
    authentication?: {
        scopes?: pulumi.Input<string[]>;
        userInfoRequired?: pulumi.Input<boolean>;
        extraParams?: { [key: string]: pulumi.Input<string>; };
    };
    roles?: {
        roleClaimPath?: pulumi.Input<string>;
        source?: pulumi.Input<string>;
    };
}

export interface SecurityConfig {
    enabled: boolean;
    oidc?: OidcConfig;
    auth?: WombatAuthConfig;
}

export interface WombatArgs {
    namespace: pulumi.Input<string>;
    environment: pulumi.Input<string>;
    config: WombatConfig;
    security: SecurityConfig;
    secrets?: SecretsConfig;
    /** Optional: environments can be created from the app instead. Without it, nothing is provisioned. */
    monitoredEnvironments?: {
        environments?: {
            [envId: string]: MonitoredEnvironment;
        };
    };
    persistence: PersistenceProfile;
    compaction?: CompactionConfig;
    ui?: UiConfig;
    dependencies: WombatDependencyConfig;
    extensions?: ExtensionsConfig;
    container: {
        imageVersion: pulumi.Input<string>;
        pullSecret?: PullSecretConfig;
    };
    ingress?: IngressArgs;
    resources?: k8s.types.input.core.v1.ResourceRequirements;
    jvmOptions?: JVMOptions;
}
