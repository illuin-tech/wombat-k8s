import {WombatArgs} from "./wombat-args";
import {ConfGroup, kebabize} from "../utils/tools";
import {MonitoredEnvironmentAsset} from "./monitored-environments-args";
import * as yaml from "yaml";

export function createMonitoredEnvironmentsConf(args: WombatArgs): ConfGroup {
    const environments = Object.fromEntries(
        Object.entries(args.monitoredEnvironments?.environments || {}).map(([envId, env]) => [
            envId,
            {
                id: env.id || envId,
                assets: env.assets.map((asset: MonitoredEnvironmentAsset) => ({
                    ...kebabize(asset),
                    "environment-id": envId,
                })),
            },
        ])
    );

    return new ConfGroup(
        "/monitored",
        "monitored-environments-conf",
        [{
            id: "monitored-environments-conf",
            filename: "monitored-environments.yaml",
            data: yaml.stringify({ environments }),
        }]
    );
}
