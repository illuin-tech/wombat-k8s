import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {NodeMode} from "./node-mode-args";
import {PersistenceMode} from "./persistence-args";

/**
 * Tweaks the Quarkus application configuration based on the NodeModeProfile.
 */
export class NodeModeConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        const mode = args.mode?.type || NodeMode.STANDALONE;
        switch (args.mode?.type) {
            case undefined:
            case NodeMode.STANDALONE:
                // Left unset, as images predating the distributed setup do not know it
                return { config };

            case NodeMode.AGGREGATOR:
                config.wombat.mode = mode;
                return { config };

            case NodeMode.WORKER:
                // Workers write no metric to their database and always run on an in-memory SQLite one
                if (args.persistence.type !== PersistenceMode.SQLITE_TRANSIENT) {
                    throw new Error(`Worker mode requires the ${PersistenceMode.SQLITE_TRANSIENT} persistence type, got ${args.persistence.type}`);
                }
                config.wombat.mode = mode;
                config.wombat.worker = {
                    ...(config.wombat.worker || {}),
                    id: args.mode.id,
                    aggregator: args.mode.aggregator,
                };
                return { config };
        }

        throw new Error(`Unsupported node mode: ${mode}`);
    }
}
