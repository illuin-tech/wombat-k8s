import {WombatArgs} from "./wombat-args";
import {Conf, ConfGroup, kebabize} from "../utils/tools";
import {K8SApiAsset, LLMPrometheusAsset, LLMStaticAsset, MonitoredEnvironmentAsset, MonitoredEnvironmentAssetType} from "./monitored-environments-args";
import * as yaml from "yaml";

function createKubeconfigConf(args: WombatArgs): ConfGroup {
    return new ConfGroup(
        "/kubeconfigs",
        "kubeconfigs",
        args.monitoredEnvironments.kubeconfigs.map(kc => ({
            id: kc.id.toString(),
            filename: `${kc.id}.config`,
            data: kc.content.toString(),
        }))
    );
}

/**
 * Rewrites a `KUBERNETES_API` asset: looks up its mounted kubeconfig by id and points `config-path` at it.
 * Throws if no matching kubeconfig was provided.
 */
function rewriteKubernetesApiAsset(asset: K8SApiAsset, kubeconfigConf: ConfGroup, kubeconfigById: Map<string, Conf>): {[key: string]: unknown} {
    const kubeconfig = kubeconfigById.get(asset.id);
    if (!kubeconfig)
        throw new Error(`No kubeconfig provided for monitored environment asset "${asset.id}"`);

    return {
        ...kebabize(asset),
        "config-path": `${kubeconfigConf.path}/${kubeconfig.filename}`,
    };
}

function rewriteLLMStaticAsset(asset: LLMStaticAsset): {[key: string]: unknown} {
    return kebabize(asset);
}

function rewriteLLMPrometheusAsset(asset: LLMPrometheusAsset): {[key: string]: unknown} {
    return kebabize(asset);
}

function rewriteAsset(asset: MonitoredEnvironmentAsset, kubeconfigConf: ConfGroup, kubeconfigById: Map<string, Conf>): {[key: string]: unknown} {
    switch (asset.type) {
        case MonitoredEnvironmentAssetType.KUBERNETES_API:
            return rewriteKubernetesApiAsset(asset, kubeconfigConf, kubeconfigById);
        case MonitoredEnvironmentAssetType.LLM_STATIC:
            return rewriteLLMStaticAsset(asset);
        case MonitoredEnvironmentAssetType.LLM_PROMETHEUS:
            return rewriteLLMPrometheusAsset(asset);
    }
}

export function createMonitoredEnvironmentsConf(args: WombatArgs): { kubeconfigConf: ConfGroup, monitoredEnvConf: ConfGroup } {
    const kubeconfigConf = createKubeconfigConf(args);
    const kubeconfigById = new Map(kubeconfigConf.confs.map(c => [c.id, c]));

    const environments = Object.fromEntries(
        Object.entries(args.monitoredEnvironments.environments).map(([envId, env]) => [
            envId,
            {
                name: env.name,
                assets: env.assets.map((asset: MonitoredEnvironmentAsset) => rewriteAsset(asset, kubeconfigConf, kubeconfigById)),
            },
        ])
    );

    const monitoredEnvConf = new ConfGroup(
        "/monitored",
        "monitored-environments-conf",
        [{
            id: "monitored-environments-conf",
            filename: "monitored-environments.yaml",
            data: yaml.stringify({ environments }),
        }]
    );

    return { kubeconfigConf, monitoredEnvConf };
}
