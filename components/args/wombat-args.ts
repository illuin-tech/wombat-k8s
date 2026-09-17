import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {JVMOptions} from "../utils/tools";
import {PullSecretConfig} from "../utils/image-pull-secrets";
import {Duration} from "./commons-args";
import {MonitoredEnvironment, KubeconfigEntry} from "./monitored-environments-args";
import {IngressArgs} from "./k8s-args";
import {PersistenceProfile} from "./persistence-args";
import {WombatDependencyConfig} from "./dependencies-args";

export interface WombatConfig {
    monitor?: {
        heartbeat?: pulumi.Input<string>;
        environmentsFile?: pulumi.Input<string>;
    };
    metrics?: {
        aggregationWindow?: Duration;
    };
    ui?: {
        maxDateRange?: Duration;
    };
}

export interface WombatNativeConfig extends WombatConfig {
    [key: string]: any;
}

export interface WombatArgs {
    namespace: pulumi.Input<string>;
    environment: pulumi.Input<string>;
    config: WombatConfig;
    monitoredEnvironments: {
        environments: {
            [envId: string]: MonitoredEnvironment;
        };
        kubeconfigs: KubeconfigEntry[];
    };
    persistence: PersistenceProfile;
    dependencies: WombatDependencyConfig;
    container: {
        imageVersion: pulumi.Input<string>;
        pullSecret?: PullSecretConfig;
    };
    ingress?: IngressArgs;
    resources?: k8s.types.input.core.v1.ResourceRequirements;
    jvmOptions?: JVMOptions;
}
