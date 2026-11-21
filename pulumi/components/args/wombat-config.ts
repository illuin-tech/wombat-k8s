import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {CompactionConfigCompiler, PersistenceConfigCompiler} from "./persistence-config";
import {DependenciesConfigCompiler} from "./dependencies-config";
import {ExtensionsConfigCompiler} from "./extensions-config";
import {NodeModeConfigCompiler} from "./node-mode-config";
import {UiConfigCompiler} from "./ui-config";
import {SecretsConfigCompiler} from "./secrets-config";
import {SecurityConfigCompiler} from "./security-config";
import {PersistenceMode} from "./persistence-args";
import {WorkloadType, WorkloadConfig} from "./k8s-config";

export function compileNativeConfig(args: WombatArgs): AppPackage {
    const config: AppConfig = { wombat: { ...args.config } };

    const compilers: AppConfigCompiler[] = [
        new NodeModeConfigCompiler(),
        new PersistenceConfigCompiler(),
        new CompactionConfigCompiler(),
        new DependenciesConfigCompiler(),
        new ExtensionsConfigCompiler(),
        new UiConfigCompiler(),
        new SecretsConfigCompiler(),
        new SecurityConfigCompiler(),
    ]

    /* Apply dynamic mutations to the quarkus configuration */
    const compiled: AppPackage = { config: config, envVariables: []};
    for (const compiler of compilers) {
        const pass = compiler.compile(compiled.config, args);
        compiled.config = pass.config;
        if (pass.envVariables) {
            compiled.envVariables?.push(...pass.envVariables);
        }
    }

    return compiled;
}

export function compileWorkloadConfig(args: WombatArgs): WorkloadConfig {
    switch (args.persistence.type) {
        case PersistenceMode.SQLITE_TRANSIENT:
        case PersistenceMode.POSTGRESQL:
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
