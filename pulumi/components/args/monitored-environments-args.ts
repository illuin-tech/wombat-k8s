import * as pulumi from "@pulumi/pulumi";

/**
 * An asset of any module, passed through to the app as is (keys are kebabized). Its properties belong to the module:
 * see the `wombat-core` module documentation (https://github.com/illuin-tech/wombat-core/tree/master/doc/module).
 *
 * The secrets it references, such as a `kubernetes-api` asset's `kubeconfigKey`, are resolved by the app: see `secrets`.
 */
export interface MonitoredEnvironmentAsset {
    type: pulumi.Input<string>;
    id: pulumi.Input<string>;
    [property: string]: unknown;
}

export interface MonitoredEnvironment {
    id?: string;
    assets: MonitoredEnvironmentAsset[];
}
