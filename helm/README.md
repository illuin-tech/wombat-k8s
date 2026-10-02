# Wombat Helm Chart

Helm chart for deploying the [Wombat Carbon Tracker](https://github.com/illuin-tech/wombat) service to Kubernetes.

The chart is published as an OCI artifact to Docker Hub at `oci://registry-1.docker.io/illuin/wombat-chart`.

## Prerequisites

- Kubernetes 1.23+
- Helm 3.8+ (with OCI support)

## Installation

### From Docker Hub OCI Registry (Recommended)

```bash
helm install wombat oci://registry-1.docker.io/illuin/wombat-chart --version <version> -f my-values.yaml
```

To download and extract the chart locally:

```bash
helm pull oci://registry-1.docker.io/illuin/wombat-chart --version <version>
```

### From Local Repository Source

```bash
# Check chart syntax
helm lint helm/wombat

# Install locally
helm install wombat ./helm/wombat -f my-values.yaml
```

## Configuration Reference

The following table lists the configurable parameters of the Wombat chart and their default values.

### Image & Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Wombat image repository | `illuin/wombat` |
| `image.tag` | Wombat image tag (defaults to `Chart.appVersion`) | `""` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `imagePullSecrets` | Secrets for pulling images from private registries | `[]` |
| `nameOverride` | Override the chart name | `""` |
| `fullnameOverride` | Override the full release name | `""` |
| `environment` | Deployment environment name (e.g. `dev`, `prod`, `local`) | `dev` |
| `serviceAccount.create` | Whether to create a ServiceAccount | `false` |
| `serviceAccount.annotations` | Annotations for the ServiceAccount | `{}` |
| `serviceAccount.name` | Name of the ServiceAccount to use | `""` |
| `resources.limits.cpu` | CPU resource limit for Wombat container | `1000m` |
| `resources.limits.memory` | Memory resource limit for Wombat container | `1024Mi` |
| `resources.requests.cpu` | CPU resource request for Wombat container | `200m` |
| `resources.requests.memory` | Memory resource request for Wombat container | `512Mi` |
| `jvmOptions.xms` | Initial JVM heap size | `512M` |
| `jvmOptions.xmx` | Maximum JVM heap size | `512M` |

### Service & Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes Service type | `ClusterIP` |
| `service.port` | Service port exposed | `80` |
| `service.targetPort` | Container target port | `8080` |
| `ingress.enabled` | Enable Ingress resource | `false` |
| `ingress.className` | Ingress class name (e.g. `nginx`) | `""` |
| `ingress.annotations` | Annotations for the Ingress resource | `{}` |
| `ingress.host` | Hostname for the Ingress rule | `""` |
| `ingress.path` | URL path | `/` |
| `ingress.pathType` | Ingress path matching type | `Prefix` |
| `ingress.tlsSecretName` | TLS secret name for HTTPS | `""` |
| `ingress.tls` | Custom TLS configuration array | `[]` |
| `ingress.basicAuth.enabled` | Enable HTTP basic authentication for Ingress | `false` |
| `ingress.basicAuth.username` | Username for basic authentication | `""` |
| `ingress.basicAuth.password` | Password for basic auth (automatically hashed in Secret) | `""` |
| `ingress.basicAuth.realm` | Authentication realm description | `Wombat Dashboard` |
| `ingress.basicAuth.existingSecret` | Use an existing basic auth secret | `""` |

### Persistence & S3 Backup

| Parameter | Description | Default |
|-----------|-------------|---------|
| `persistence.type` | Persistence mode: `SQLITE_TRANSIENT` (Deployment with in-memory DB) or `SQLITE_WITH_BACKUP` (StatefulSet with S3 backup) | `SQLITE_TRANSIENT` |
| `persistence.storageClassName` | Storage class name for persistent volume claim | `""` |
| `persistence.size` | PVC disk storage request size | `10Gi` |
| `persistence.backup.enabled` | Enable scheduled S3 database backups | `false` |
| `persistence.backup.cron` | Cron schedule for taking database backups | `0 0 2 * * ?` |
| `persistence.backup.restoreOnStartup` | Restore the latest snapshot from S3 upon container start | `true` |
| `persistence.backup.cleanup.cron` | Cron schedule for cleaning old S3 snapshots | `0 0 3 * * ?` |
| `persistence.backup.cleanup.retainLast` | Number of most recent S3 snapshots to retain | `25` |
| `persistence.backup.s3.endpoint` | S3 endpoint URL | `""` |
| `persistence.backup.s3.bucket` | S3 bucket name | `""` |
| `persistence.backup.s3.region` | S3 bucket region | `""` |
| `persistence.backup.s3.keyPrefix` | S3 object key prefix path | `""` |
| `persistence.backup.s3.accessKey` | S3 access key ID | `""` |
| `persistence.backup.s3.secretKey` | S3 secret access key | `""` |
| `persistence.backup.s3.existingSecret` | Existing Secret containing `access-key` and `secret-key` | `""` |

### Dependencies (BoaviztAPI & Ecologits)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `dependencies.boaviztapi.type` | `CONTAINER` (deploy sidecar) or `EXTERNAL` (use remote API) | `CONTAINER` |
| `dependencies.boaviztapi.endpoint` | Remote endpoint URI if `type: EXTERNAL` | `""` |
| `dependencies.boaviztapi.image.repository` | Sidecar container image repository | `ghcr.io/boavizta/boaviztapi` |
| `dependencies.boaviztapi.image.tag` | Sidecar container image tag | `2.4.1` |
| `dependencies.boaviztapi.port` | Sidecar container listening port | `5001` |
| `dependencies.boaviztapi.resources` | Resource limits and requests for BoaviztAPI sidecar | Limits: 500m / 512Mi |
| `dependencies.ecologits.type` | `CONTAINER` (deploy sidecar) or `EXTERNAL` (use remote API) | `CONTAINER` |
| `dependencies.ecologits.endpoint` | Remote endpoint URI if `type: EXTERNAL` | `""` |
| `dependencies.ecologits.image.repository` | Sidecar container image repository | `ghcr.io/mlco2/ecologits-api` |
| `dependencies.ecologits.image.tag` | Sidecar container image tag | `0.0.2` |
| `dependencies.ecologits.port` | Sidecar container listening port | `5002` |
| `dependencies.ecologits.resources` | Resource limits and requests for Ecologits sidecar | Limits: 500m / 512Mi |

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.monitor.heartbeat` | Cron schedule controlling asset monitoring frequency | `0 * * * * ?` |
| `config.metrics.aggregationWindow.duration` | Aggregation time window duration | `5` |
| `config.metrics.aggregationWindow.unit` | Aggregation time window unit (`MINUTES`, `HOURS`, etc.) | `MINUTES` |
| `config.ui.maxDateRange.duration` | Maximum queryable date range in the dashboard UI | `1` |
| `config.ui.maxDateRange.unit` | Maximum date range unit (`DAYS`, `MONTHS`, `YEARS`) | `YEARS` |

### Dynamic Extensions

| Parameter | Description | Default |
|-----------|-------------|---------|
| `extensions.enabled` | Enable mounting external extension JARs | `false` |
| `extensions.mountPath` | Container path where extensions are mounted | `/extensions` |
| `extensions.existingClaim` | Existing PersistentVolumeClaim name to mount | `""` |
| `extensions.storageClassName` | Storage class name when provisioning a new PVC | `""` |
| `extensions.size` | Storage capacity request for extensions PVC | `1Gi` |

### Secrets & Config Overrides

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets` | Key-value map of generic runtime secrets mounted in `/secrets` | `{}` |
| `configOverrides` | Arbitrary YAML map merged directly into `application.yaml` | `{}` |

### Monitored Environments & Kubeconfigs

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoredEnvironments.environments` | Map of environment definitions and monitored assets | `{}` |
| `monitoredEnvironments.kubeconfigs` | List of `{ id, content }` kubeconfigs mounted into `/kubeconfigs/<id>.config` | `[]` |

Supported asset types:
- `tech.illuin.wombat-module.kubernetes-api`: Polls Kubernetes workload metrics using a mounted kubeconfig.
- `tech.illuin.wombat-module.llm-static`: Static LLM consumption profiles.
- `tech.illuin.wombat-module.llm-prometheus`: Dynamic LLM consumption gathered from Prometheus queries.

### Node Placement & Scheduling

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nodeSelector` | Node selector labels | `{}` |
| `tolerations` | Pod tolerations list | `[]` |
| `affinity` | Pod affinity / anti-affinity rules | `{}` |
| `podAnnotations` | Annotations to add to pods | `{}` |
| `podLabels` | Additional labels to add to pods | `{}` |
| `podSecurityContext` | Pod-level security context | `{}` |
| `securityContext` | Container-level security context | `{}` |

## Local Sample Configuration

See [`values-local.yaml.dist`](values-local.yaml.dist) for a complete example configuration ready for local deployment.
