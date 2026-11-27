import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {WombatArgs, AppConfig, AppPackage} from "./args/wombat-args";
import {ConfGroup, createJVMString} from "./utils/tools";
import {createOverrideConf} from "./args/commons-config";
import {createMonitoredEnvironmentsConf} from "./args/monitored-environments-config";
import {
    createProvisionedSecretsConf,
    createVaultCaConf,
    hasSecretsDirectory,
    SECRETS_PATH,
    SECRETS_VOLUME_NAME
} from "./args/secrets-config";
import {createImagePullSecret} from "./utils/image-pull-secrets";
import {createBasicAuthAnnotations, createBasicAuthSecret} from "./utils/basic-auth";
import {compileNativeConfig, compileWorkloadConfig} from "./args/wombat-config";
import {WorkloadConfig, WorkloadType} from "./args/k8s-config";
import * as inputs from "@pulumi/kubernetes/types/input";
import {createDependencyContainers} from "./args/dependencies-config";

export class WombatResource extends pulumi.ComponentResource {
    constructor(name: string, args: WombatArgs, opts?: pulumi.ComponentResourceOptions) {
        super(`illuin:wombat:service-${args.environment}`, name, {
            ...args,
            config: pulumi.secret(args.config),
            security: pulumi.secret(args.security),
            persistence: pulumi.secret(args.persistence),
            secrets: pulumi.secret(args.secrets),
        }, opts);

        const selectorLabels: {[key: string]: string} = {
            "app.kubernetes.io/name": "wombat",
            "app.kubernetes.io/instance": `${name}-${args.environment}`,
        };
        const labels: {[key: string]: string} = {
            ...selectorLabels,
            "app.kubernetes.io/managed-by": "Pulumi",
        };

        const service = new k8s.core.v1.Service(`wombat-service-${args.environment}`, {
            metadata: {
                namespace: args.namespace,
                labels: labels,
                annotations: {
                    "pulumi.com/skipAwait": "true",
                }
            },
            spec: {
                type: "ClusterIP",
                ports: [{ port: 80, targetPort: "http" }],
                selector: labels,
            },
        });

        const workload: pulumi.CustomResource = this.createWorkload(args, service, selectorLabels, labels);

        if (args.ingress)
        {
            const basicAuthSecret: k8s.core.v1.Secret | undefined = args.ingress.basicAuth
                ? createBasicAuthSecret(`wombat-service-basic-auth-${args.environment}`, args.namespace, labels, args.ingress.basicAuth)
                : undefined;

            const annotations: {[key: string]: pulumi.Input<string>} = basicAuthSecret
                ? { ...args.ingress.annotations, ...createBasicAuthAnnotations(basicAuthSecret.metadata.name, args.ingress.basicAuth!.realm) }
                : args.ingress.annotations;

            new k8s.networking.v1.Ingress(`wombat-service-${args.environment}`, {
                metadata: {
                    namespace: args.namespace,
                    labels: labels,
                    annotations: annotations,
                },
                spec: {
                    ingressClassName: args.ingress.className,
                    rules: [{
                        host: args.ingress.host,
                        http: {
                            paths: [{
                                path: args.ingress.path,
                                pathType: args.ingress.pathType,
                                backend: {
                                    service: {
                                        name: service.metadata.name,
                                        port: {
                                            number: 80,
                                        },
                                    },
                                },
                            }],
                        },
                    }],
                    tls: !!args.ingress.tlsSecretName ? [{
                        secretName: args.ingress.tlsSecretName,
                        hosts: [
                            args.ingress.host
                        ],
                    }] : [],
                },
            });
        }
    }

    private createWorkload(
        args: WombatArgs,
        service: k8s.core.v1.Service,
        selectorLabels: {[key: string]: string},
        labels: {[key: string]: string}
    ): k8s.apps.v1.Deployment | k8s.apps.v1.StatefulSet {
        const pullSecret: k8s.core.v1.Secret | undefined = args.container.pullSecret
            ? createImagePullSecret(
                `wombat-service-gcr-key-${args.environment}`,
                `${args.namespace}`,
                [args.container.pullSecret]
            )
            : undefined;

        const appPackage: AppPackage = compileNativeConfig(args);
        const nativeConfig: AppConfig = appPackage.config;

        /* The SecretsConfigCompiler points the app's directory secret resolver at them */
        const provisionedSecretsConf: ConfGroup | undefined = createProvisionedSecretsConf(args);
        const provisionedSecretsSecret: k8s.core.v1.Secret | undefined = provisionedSecretsConf
            ? new k8s.core.v1.Secret(`wombat-service-secrets-${args.environment}`, provisionedSecretsConf.asSecretArgs(args.namespace, labels))
            : undefined;

        /* The SecretsConfigCompiler points quarkus.vault.tls.ca-cert at it */
        const vaultCaConf: ConfGroup | undefined = createVaultCaConf(args);
        const vaultCaConfigMap: k8s.core.v1.ConfigMap | undefined = vaultCaConf
            ? new k8s.core.v1.ConfigMap(`wombat-service-vault-ca-${args.environment}`, vaultCaConf.asConfigMapArgs(args.namespace, labels))
            : undefined;

        const confOverride: ConfGroup = createOverrideConf(nativeConfig);
        const confOverrideSecret = new k8s.core.v1.Secret(`wombat-service-config-${args.environment}`, confOverride.asSecretArgs(args.namespace, labels));

        const monitoredEnvConf: ConfGroup = createMonitoredEnvironmentsConf(args);
        const monitoredEnvConfigMap = new k8s.core.v1.ConfigMap(`wombat-service-monitored-environments-${args.environment}`, monitoredEnvConf.asConfigMapArgs(args.namespace, labels));

        let extensionsClaimName: pulumi.Input<string> | undefined = undefined;
        const extensionsMountPath = args.extensions?.mountPath || "/extensions";
        const extensionsVolumeName = "wombat-service-extensions";

        if (args.extensions) {
            if (args.extensions.existingClaimName) {
                extensionsClaimName = args.extensions.existingClaimName;
            }
            else if (args.extensions.pvc?.existingClaimName) {
                extensionsClaimName = args.extensions.pvc.existingClaimName;
            }
            else if (args.extensions.pvc) {
                const extensionsPvc = new k8s.core.v1.PersistentVolumeClaim(`wombat-service-extensions-${args.environment}`, {
                    metadata: {
                        namespace: args.namespace,
                        labels: labels,
                    },
                    spec: {
                        accessModes: args.extensions.pvc.accessModes || ["ReadWriteOnce"],
                        storageClassName: args.extensions.pvc.storageClassName,
                        resources: {
                            requests: {
                                storage: args.extensions.pvc.size || "1Gi",
                            },
                        },
                    },
                });
                extensionsClaimName = extensionsPvc.metadata.name;
            }
        }

        const workloadConfig: WorkloadConfig = compileWorkloadConfig(args);

        const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = [
            { name: confOverride.volumeName, mountPath: confOverride.path, readOnly: true },
            { name: monitoredEnvConf.volumeName, mountPath: monitoredEnvConf.path, readOnly: true },
        ];

        if (hasSecretsDirectory(args)) {
            volumeMounts.push({
                name: SECRETS_VOLUME_NAME,
                mountPath: SECRETS_PATH,
                readOnly: true,
            });
        }

        if (vaultCaConf) {
            volumeMounts.push({
                name: vaultCaConf.volumeName,
                mountPath: vaultCaConf.path,
                readOnly: true,
            });
        }

        if (extensionsClaimName) {
            volumeMounts.push({
                name: extensionsVolumeName,
                mountPath: extensionsMountPath,
                readOnly: true,
            });
        }

        const volumes: k8s.types.input.core.v1.Volume[] = [
            { name: confOverride.volumeName, secret: { secretName: confOverrideSecret.metadata.name } },
            { name: monitoredEnvConf.volumeName, configMap: { name: monitoredEnvConfigMap.metadata.name } },
        ];

        if (hasSecretsDirectory(args)) {
            /* One directory for both, so the app's single directory resolver reads them all */
            const sources: k8s.types.input.core.v1.VolumeProjection[] = [
                ...(provisionedSecretsSecret ? [{ secret: { name: provisionedSecretsSecret.metadata.name } }] : []),
                ...(args.secrets?.existingSecrets || []).map(name => ({ secret: { name: name } })),
            ];
            volumes.push({
                name: SECRETS_VOLUME_NAME,
                projected: { sources: sources },
            });
        }

        if (vaultCaConf && vaultCaConfigMap) {
            volumes.push({
                name: vaultCaConf.volumeName,
                configMap: { name: vaultCaConfigMap.metadata.name },
            });
        }

        if (extensionsClaimName) {
            volumes.push({
                name: extensionsVolumeName,
                persistentVolumeClaim: {
                    claimName: extensionsClaimName,
                    readOnly: true,
                },
            });
        }

        const envVars: pulumi.Input<pulumi.Input<inputs.core.v1.EnvVar>[]> = [
            { name: "JAVA_TOOL_OPTIONS", value: createJVMString(args.jvmOptions ? args.jvmOptions : {}) },
            { name: "QUARKUS_CONFIG_LOCATIONS", value: confOverride.asFileList().join(',') },
            { name: "WOMBAT_MONITOR_ENVIRONMENTS_FILE", value: monitoredEnvConf.asFileList().join(',') },
            ...(appPackage.envVariables ? appPackage.envVariables : []),
        ];

        const containers: k8s.types.input.core.v1.Container[] = [
            {
                name: "wombat",
                image: pulumi.interpolate`illuin/wombat:${args.container.imageVersion}`,
                imagePullPolicy: "Always",
                ports: [{ containerPort: 8080, name: "http" }],
                resources: args.resources,
                env: envVars,
                volumeMounts: volumeMounts,
                startupProbe: {
                    httpGet: { port: "http", path: "/q/health/started" }
                },
                readinessProbe: {
                    httpGet: { port: "http", path: "/q/health/ready" }
                },
                livenessProbe: {
                    httpGet: { port: "http", path: "/q/health/live" }
                },
            },
            ...createDependencyContainers(args.dependencies),
            ...(args.sidecars || []),
        ];

        const workloadName: string = `wombat-service-${args.environment}`;
        const workloadMetadata: inputs.meta.v1.ObjectMeta = {
            namespace: args.namespace,
            labels: labels
        };
        const podTemplateSpec: k8s.types.input.core.v1.PodTemplateSpec = {
            metadata: {
                namespace: args.namespace,
                labels: labels,
                annotations: {
                    "wombat.illuin.tech/config-resource-version": confOverrideSecret.metadata.resourceVersion,
                    /* The Vault client reads its CA at startup only */
                    ...(vaultCaConfigMap ? { "wombat.illuin.tech/vault-ca-resource-version": vaultCaConfigMap.metadata.resourceVersion } : {}),
                },
            },
            spec: {
                imagePullSecrets: pullSecret
                    ? [{ name: pullSecret.metadata.name }]
                    : undefined,
                serviceAccountName: args.serviceAccountName,
                terminationGracePeriodSeconds: workloadConfig.podConfig.terminationGracePeriodSeconds || 120,
                containers: containers,
                volumes: volumes
            },
        };

        switch (workloadConfig.workloadType) {
            case WorkloadType.DEPLOYMENT:
                return new k8s.apps.v1.Deployment(workloadName, {
                    metadata: workloadMetadata,
                    spec: {
                        selector: { matchLabels: selectorLabels },
                        replicas: 1,
                        template: podTemplateSpec,
                    },
                });
            case WorkloadType.STATEFUL_SET:
                return new k8s.apps.v1.StatefulSet(workloadName, {
                    metadata: workloadMetadata,
                    spec: {
                        serviceName: service.metadata.name,
                        selector: { matchLabels: selectorLabels },
                        replicas: 1,
                        template: podTemplateSpec,
                    },
                });
        }
    }
}
