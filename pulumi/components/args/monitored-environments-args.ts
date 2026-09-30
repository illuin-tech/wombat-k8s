import * as pulumi from "@pulumi/pulumi";

export enum MonitoredEnvironmentAssetType {
    KUBERNETES_API = "tech.illuin.wombat-module.kubernetes-api",
    LLM_STATIC = "tech.illuin.wombat-module.llm-static",
    LLM_PROMETHEUS = "tech.illuin.wombat-module.llm-prometheus",
}

interface MonitoredEnvironmentAssetBase {
    type: pulumi.Input<string>;
    id: pulumi.Input<string>;
    name: pulumi.Input<string>;
    resolvers?: {
        cost?: pulumi.Input<string>;
        activity?: pulumi.Input<string>;
        impact?: pulumi.Input<string>;
        [key: string]: pulumi.Input<string> | undefined;
    };
}

export interface K8SApiAsset extends MonitoredEnvironmentAssetBase {
    type: MonitoredEnvironmentAssetType.KUBERNETES_API;
    namespace: pulumi.Input<string>;
    configPath?: pulumi.Input<string>; // rewritten at deploy time to the mounted kubeconfig path
    context?: pulumi.Input<string>;
    readTimeout?: pulumi.Input<string>;
    heartbeatSkip?: pulumi.Input<number>;
    profile: {
        provider: pulumi.Input<string>;
        instanceType: pulumi.Input<string>;
        location: pulumi.Input<string>;
        lifespan: pulumi.Input<number>; // hours
    };
}

export interface LLMStaticModelConfig {
    provider: pulumi.Input<string>;
    model: pulumi.Input<string>;
    location: pulumi.Input<string>;
    requestProfile: {
        outputTokenCount: pulumi.Input<number>;
        requestPerYear: pulumi.Input<number>;
    };
}

export interface LLMStaticAsset {
    type: MonitoredEnvironmentAssetType.LLM_STATIC;
    profile: {
        models: LLMStaticModelConfig[];
    };
}

export interface LLMPrometheusAsset extends MonitoredEnvironmentAssetBase {
    type: MonitoredEnvironmentAssetType.LLM_PROMETHEUS;
    prometheusUrl: pulumi.Input<string>;
    proxyUrl?: pulumi.Input<string>;
    username?: pulumi.Input<string>;
    passwordKey?: pulumi.Input<string>;
    heartbeatSkip?: pulumi.Input<number>;
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
    id?: string;
    assets: MonitoredEnvironmentAsset[];
}

export interface KubeconfigEntry {
    id: pulumi.Input<string>; // matches an asset `id` in the monitored-environments tree
    content: pulumi.Input<string>; // raw kubeconfig file contents
}
