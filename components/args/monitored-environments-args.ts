import * as pulumi from "@pulumi/pulumi";

export enum MonitoredEnvironmentAssetType {
    KUBERNETES_API = "KUBERNETES_API",
    LLM_STATIC = "LLM_STATIC",
    LLM_PROMETHEUS = "LLM_PROMETHEUS",
}

interface MonitoredEnvironmentAssetBase {
    id: string;
    name: string;
}

export interface K8SApiAsset extends MonitoredEnvironmentAssetBase {
    type: MonitoredEnvironmentAssetType.KUBERNETES_API;
    namespace: string;
    configPath: string; // rewritten at deploy time to the mounted kubeconfig path
    context?: string;
    readTimeout?: string;
    heartbeatSkip?: number;
    profile: {
        provider: pulumi.Input<string>;
        instanceType: pulumi.Input<string>;
        location: pulumi.Input<string>;
        lifespan: pulumi.Input<number>; // hours
    };
}

export interface LLMStaticAsset extends MonitoredEnvironmentAssetBase {
    type: MonitoredEnvironmentAssetType.LLM_STATIC;
    profile: {
        provider: pulumi.Input<string>;
        model: pulumi.Input<string>;
        location: pulumi.Input<string>;
        requestProfile: {
            outputTokenCount: pulumi.Input<number>;
            requestPerYear: pulumi.Input<number>;
        };
    };
}

export interface LLMPrometheusAsset extends MonitoredEnvironmentAssetBase {
    type: MonitoredEnvironmentAssetType.LLM_PROMETHEUS;
    prometheusUrl: string;
    proxyUrl?: string;
    username?: string;
    password?: string;
    heartbeatSkip?: number;
    profile: {
        provider: pulumi.Input<string>;
        model: pulumi.Input<string>;
        location: pulumi.Input<string>;
        dynamicProfile: {
            query: pulumi.Input<string>;
        };
    };
}

export type MonitoredEnvironmentAsset = K8SApiAsset | LLMStaticAsset | LLMPrometheusAsset;

export interface MonitoredEnvironment {
    name: string;
    assets: MonitoredEnvironmentAsset[];
}

export interface KubeconfigEntry {
    id: pulumi.Input<string>; // matches an asset `id` in the monitored-environments tree
    content: pulumi.Input<string>; // raw kubeconfig file contents
}
