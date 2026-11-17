import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {JVMOptions} from "../utils/tools";
import {PullSecretConfig} from "../utils/image-pull-secrets";
import {Duration} from "./commons-args";
import {MonitoredEnvironment, KubeconfigEntry} from "./monitored-environments-args";
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
}

export interface AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage;
}

export interface AppPackage {
    config: AppConfig,
    envVariables?: inputs.core.v1.EnvVar[];
}

export interface WombatArgs {
    namespace: pulumi.Input<string>;
    environment: pulumi.Input<string>;
    config: WombatConfig;
    secrets?: {
        [key: string]: pulumi.Input<string>;
    };
    monitoredEnvironments: {
        environments: {
            [envId: string]: MonitoredEnvironment;
        };
        kubeconfigs: KubeconfigEntry[];
    };
    persistence: PersistenceProfile;
    compaction: CompactionConfig;
    ui: UiConfig;
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
