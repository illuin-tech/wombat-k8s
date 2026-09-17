import {WombatArgs, WombatNativeConfig} from "./wombat-args";
import {applyPersistenceConfig} from "./persistence-config";
import {applyDependenciesConfig} from "./dependencies-config";
import {PersistenceMode} from "./persistence-args";
import {WorkloadType, WorkloadConfig} from "./k8s-config";

export function compileNativeConfig(args: WombatArgs): WombatNativeConfig {
    let compiled: WombatNativeConfig = { ...args.config };

    /* Apply dynamic mutations to the quarkus configuration */
    compiled = applyPersistenceConfig(compiled, args.persistence);
    compiled = applyDependenciesConfig(compiled, args.dependencies);

    return compiled;
}

export function compileWorkloadConfig(args: WombatArgs): WorkloadConfig {
    switch (args.persistence.type) {
        case PersistenceMode.SQLITE_TRANSIENT:
            return {
                workloadType: WorkloadType.DEPLOYMENT,
                podConfig: {
                    terminationGracePeriodSeconds: 60,
                }
            };
        case PersistenceMode.SQLITE_WITH_BACKUP:
            return {
                workloadType: WorkloadType.STATEFUL_SET,
                podConfig: {
                    terminationGracePeriodSeconds: 120,
                }
            };
    }
}
