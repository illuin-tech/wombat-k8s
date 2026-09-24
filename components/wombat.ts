import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {WombatArgs, WombatNativeConfig} from "./args/wombat-args";
import {ConfGroup, createJVMString} from "./utils/tools";
import {createOverrideConf} from "./args/commons-config";
import {createMonitoredEnvironmentsConf} from "./args/monitored-environments-config";
import {createImagePullSecret} from "./utils/image-pull-secrets";
import {createBasicAuthAnnotations, createBasicAuthSecret} from "./utils/basic-auth";
import {compileNativeConfig, compileWorkloadConfig} from "./args/wombat-config";
import {WorkloadConfig, WorkloadType} from "./args/k8s-config";
import * as inputs from "@pulumi/kubernetes/types/input";
import {createDependencyContainers} from "./args/dependencies-config";

export class WombatResource extends pulumi.ComponentResource {
    constructor(name: string, args: WombatArgs, opts?: pulumi.ComponentResourceOptions) {
        super(`illuin:wombat:service-${args.environment}`, name, args, opts);

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

        const nativeConfig: WombatNativeConfig = compileNativeConfig(args);

        let secretsSecret: k8s.core.v1.Secret | undefined = undefined;
        const secretsVolumeName = "wombat-service-secrets";
        const secretsMountPath = "/secrets";

        if (args.secrets && Object.keys(args.secrets).length > 0) {
            nativeConfig.wombat = nativeConfig.wombat || {};
            nativeConfig.wombat.secret = nativeConfig.wombat.secret || {};
            nativeConfig.wombat.secret.directory = nativeConfig.wombat.secret.directory || {};
            nativeConfig.wombat.secret.directory.path = secretsMountPath;

            secretsSecret = new k8s.core.v1.Secret(`wombat-service-secrets-${args.environment}`, {
                metadata: {
                    namespace: args.namespace,
                    labels: labels,
                },
                stringData: args.secrets,
            });
        }

        const confOverride: ConfGroup = createOverrideConf(nativeConfig);
        const confOverrideConfigMap = new k8s.core.v1.ConfigMap(`wombat-service-config-${args.environment}`, confOverride.asConfigMapArgs(args.namespace, labels));

        const { kubeconfigConf, monitoredEnvConf } = createMonitoredEnvironmentsConf(args);
        const kubeconfigSecret = new k8s.core.v1.Secret(`wombat-service-kubeconfigs-${args.environment}`, kubeconfigConf.asSecretArgs(args.namespace, labels));
        const monitoredEnvConfigMap = new k8s.core.v1.ConfigMap(`wombat-service-monitored-environments-${args.environment}`, monitoredEnvConf.asConfigMapArgs(args.namespace, labels));

        const workloadConfig: WorkloadConfig = compileWorkloadConfig(args);

        const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = [
            { name: confOverride.volumeName, mountPath: confOverride.path, readOnly: true },
            { name: kubeconfigConf.volumeName, mountPath: kubeconfigConf.path, readOnly: true },
            { name: monitoredEnvConf.volumeName, mountPath: monitoredEnvConf.path, readOnly: true },
        ];

        if (secretsSecret) {
            volumeMounts.push({
                name: secretsVolumeName,
                mountPath: secretsMountPath,
                readOnly: true,
            });
        }

        const volumes: k8s.types.input.core.v1.Volume[] = [
            { name: confOverride.volumeName, configMap: { name: confOverrideConfigMap.metadata.name } },
            { name: kubeconfigConf.volumeName, secret: { secretName: kubeconfigSecret.metadata.name } },
            { name: monitoredEnvConf.volumeName, configMap: { name: monitoredEnvConfigMap.metadata.name } },
        ];

        if (secretsSecret) {
            volumes.push({
                name: secretsVolumeName,
                secret: { secretName: secretsSecret.metadata.name },
            });
        }

        const containers: k8s.types.input.core.v1.Container[] = [
            {
                name: "wombat",
                image: "illuin/wombat:" + args.container.imageVersion,
                imagePullPolicy: "Always",
                ports: [{ containerPort: 8080, name: "http" }],
                resources: args.resources,
                env: [
                    { name: "JAVA_TOOL_OPTIONS", value: createJVMString(args.jvmOptions ? args.jvmOptions : {}) },
                    { name: "QUARKUS_CONFIG_LOCATIONS", value: confOverride.asFileList().join(',') },
                    { name: "MONITOR_ENVIRONMENTS_FILE", value: monitoredEnvConf.asFileList().join(',') },
                ],
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
            },
            spec: {
                imagePullSecrets: pullSecret
                    ? [{ name: pullSecret.metadata.name }]
                    : undefined,
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
