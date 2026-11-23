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

### Deployment Mode

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mode` | `standalone` (samples its environments into its own database), `aggregator` (stores and serves the metrics pushed by workers, samples nothing itself) or `worker` (samples its environments and pushes the metrics to an aggregator) | `standalone` |
| `worker.id` | Worker id, owner of the environments it declares: unique among the workers of an aggregator (`worker` mode only) | `""` |
| `worker.aggregator.url` | Base URL of the aggregator (`worker` mode only) | `""` |
| `worker.aggregator.apiKey` | API key holding `api.metric.write` and `api.environment.write` on the aggregator, stored in a chart-managed Secret | `""` |
| `worker.aggregator.existingSecret` | Existing Secret containing the aggregator API key under `api-key` | `""` |
| `worker.aggregator.proxyUrl` | Optional HTTP proxy to reach the aggregator through | `""` |
| `worker.aggregator.timeout` | Optional connect and read timeout of each request to the aggregator (e.g. `30s`) | `""` |

Each release deploys a single instance: a distributed setup is one `aggregator` release plus one `worker` release next to each environment the aggregator cannot reach. A worker writes no metric to its own database, so it requires `persistence.type: SQLITE_TRANSIENT`. See the [Wombat distributed setup documentation](https://github.com/illuin-tech/wombat/blob/master/doc/distributed.md) for details.

```yaml
mode: worker
worker:
  id: east
  aggregator:
    url: https://wombat-aggregator.example.com
    existingSecret: wombat-worker
persistence:
  type: SQLITE_TRANSIENT
```

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
| `persistence.type` | Persistence mode: `SQLITE_TRANSIENT` (Deployment with in-memory DB), `SQLITE_WITH_BACKUP` (StatefulSet with DB on a PVC, optionally backed up to S3), or `POSTGRESQL` (Deployment using an existing PostgreSQL server) | `SQLITE_TRANSIENT` |
| `persistence.postgresql.existingSecret` | Existing Secret containing the PostgreSQL password | `""` |
| `persistence.postgresql.passwordKey` | Password key in the existing Secret | `password` |
| `persistence.storageClassName` | Storage class name for persistent volume claim | `""` |
| `persistence.size` | PVC disk storage request size | `10Gi` |
| `persistence.backup.enabled` | Enable scheduled S3 database backups (`SQLITE_WITH_BACKUP` only; when `false` the DB is kept on the PVC without backups) | `false` |
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

To use an existing PostgreSQL server, create a Kubernetes Secret containing its password in the release namespace. Reference that Secret and set the JDBC URL and username:

```yaml
persistence:
  type: POSTGRESQL
  postgresql:
    existingSecret: wombat-postgres
    passwordKey: password
configOverrides:
  persistence:
    backend:
      postgresql:
        jdbc-url: jdbc:postgresql://postgres.example.com:5432/wombat
        username: wombat
        password: "${POSTGRESQL_PASSWORD}"
```

Keep `${POSTGRESQL_PASSWORD}` as written in the example. The chart reads the password from the referenced Secret; do not put the actual password in `configOverrides`. Restart the Wombat Deployment after rotating the password. Use a compatible Wombat image, such as `0.20.0`.

### OIDC Authentication

`security` turns on the app's `oidc` profile (see [access control](https://github.com/illuin-tech/wombat/blob/master/doc/access-control.md)). Its keys are camelCase, written kebab-case to `quarkus.oidc` and `auth` in `application.yaml`.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `security.enabled` | Turn on the app's `oidc` profile | `false` |
| `security.oidc.authServerUrl` | OIDC issuer URL | Required when enabled |
| `security.oidc.clientId` | OIDC client ID | Required when enabled |
| `security.oidc.credentials.secret` | OIDC client secret, kept in a Secret the chart creates | Required when enabled |
| `security.oidc.authentication.scopes` | Scopes requested during sign-in | `[email, profile]` |
| `security.oidc.authentication.userInfoRequired` | Call the provider's UserInfo endpoint | App default |
| `security.oidc.authentication.extraParams` | Extra parameters of the authorization request | App default |
| `security.oidc.roles.roleClaimPath` | Claim holding the provider's roles, e.g. `realm_access/roles` for Keycloak | App default |
| `security.oidc.roles.source` | Token holding that claim, e.g. `accesstoken` | App default |
| `security.auth.roles.admin` | Provider roles or groups, emails, or `"*"` granting the Wombat `admin` role | Required when enabled |
| `security.auth.roles.user` | Same, for the `user` role | App default |
| `security.auth.roles.apiKeyManager` | Same, for the `api-key-manager` role | App default |
| `security.auth.allowedEmailDomains` | Only let in users with an email of these domains | App default |
| `security.auth.emailClaim` | Claim holding the user's email | `email` |
| `security.auth.requireVerifiedEmail` | Ignore emails the provider doesn't flag as verified | `true` |
| `security.auth.displayNameClaims` | Claims tried in order to display the user | `[email, name, preferred_username]` |
| `security.auth.idpLogout` | Also end the provider's session on logout | `true` |
| `security.auth.apiKeys.maxLifetime` | Longest lifetime of an API key | `365d` |
| `security.auth.apiKeys.allowNeverExpiring` | Allow API keys that never expire | `false` |

```yaml
security:
  enabled: true
  oidc:
    authServerUrl: https://idp.example.com
    clientId: wombat
    credentials:
      secret: CHANGE_ME
    authentication:
      userInfoRequired: true
  auth:
    allowedEmailDomains: [example.com]
    roles:
      admin: [wombat-admins]
      user: [wombat-users]
```

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
| `config.monitor.heartbeat` | How often monitored assets are sampled: an amount and a unit `s`, `m` or `h` | `10s` |
| `config.ui.maxDateRange.duration` | Maximum queryable date range in the dashboard UI | `1` |
| `config.ui.maxDateRange.unit` | Maximum date range unit (`DAYS`, `MONTHS`, `YEARS`) | `YEARS` |
| `compaction.cron` | When sampled metrics are folded (`persistence.compaction` in the app) | app default, `0 1 * * * ?` |
| `compaction.window` | The window metrics are folded into | app default, `1h` |
| `compaction.delay` | How long a closed window waits before it is folded | app default, `1m` |


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
| `secrets.provisioned` | Map of secret keys to values, mounted in `/secrets` as the app's directory secret resolver | `{}` |
| `secrets.existingSecrets` | Existing Secrets of the namespace, mounted in `/secrets` next to the provisioned ones | `[]` |
| `secrets.writeMode` | The backend behind the app's `/api/secrets`: `disabled`, `database` or `vault` | `disabled` |
| `secrets.database.activeKekId` | The key-encryption key new writes use, one of the ids of `secrets.database.kek` | `""` |
| `secrets.database.kek` | Key-encryption keys by id, Base64 for 32 bytes, kept in a Secret the chart creates | `{}` |
| `secrets.database.existingSecret` | Existing Secret holding each key-encryption key under its id | `""` |
| `secrets.vault.enabled` | Resolve secrets from HashiCorp Vault KV v2, read-only unless `secrets.writeMode` is `vault` | `false` |
| `secrets.vault.pathPrefix` | Where Wombat's keys sit in the KV mount (the app's default: `wombat`) | `""` |
| `secrets.vault.caCert` | The CA that signs Vault's certificate, in PEM | `""` |
| `secrets.vault.client` | The Vault client, written to `quarkus.vault`, camelCase | `{}` |
| `secrets.cache.ttl` | How long a resolved secret is kept in memory (the app's default: `10m`), `0` disables the cache | `""` |
| `configOverrides` | Arbitrary YAML map merged directly into `application.yaml` | `{}` |

`secrets` holds the secret backends the app resolves secret keys from. An asset references its credentials by key, such as a `tech.illuin.wombat-module.kubernetes-api` asset's `kubeconfig-key`. Each backend is optional. The app looks a key up in the writer first, if any, then Vault, then the files, as described in [secret management](https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md). The chart supports files, Vault and the database; not the app's keystore or environment resolvers. `secrets.vault` and `secrets.cache` need a Wombat release after `0.24.0`.

#### Files

`secrets.provisioned` is compiled into a Kubernetes `Secret`, mounted at `/secrets` as the app's directory secret resolver (`wombat.secret.directory.path`): a read-only backend, with one file per key. A key is made of letters, digits, `-` and `_`, the app's secret key format, and the chart fails on any other.

`secrets.existingSecrets` adds Secrets created outside the chart, e.g. by the External Secrets Operator or Sealed Secrets, to the same directory. Each of their keys becomes a secret, so name the keys in the app's key format: the chart cannot check them. Don't use a key twice across these Secrets and `secrets.provisioned`. A Secret updated in place reaches the app within the kubelet's sync period, plus the cache TTL.

Kubeconfigs are provisioned secrets too. An asset, provisioned or created in the app, names its kubeconfig in `kubeconfig-key`. The kubeconfig must inline its certificates and keys (`certificate-authority-data`, `client-certificate-data`, `client-key-data`): the app reads it in memory, with no file to resolve a relative path against.

```bash
helm install wombat oci://registry-1.docker.io/illuin/wombat-chart --version <version> -f my-values.yaml \
  --set-file secrets.provisioned.kubeconfig-my-cluster=/path/to/kubeconfig
```

#### Writer

`secrets.writeMode` picks the backend behind the app's secret-management API (`/api/secrets`), which also comes first when resolving a key: `database` or `vault`. With `disabled`, the default, secrets are only read.

> ⚠️ The API lists, writes and deletes secrets. Turn on `security` with it: without authentication, anyone who reaches the service can use it. The chart prints a warning after install when `security` is off.

#### Database

With `secrets.writeMode: database`, the app stores the secrets written through its API in its own database, encrypted with key-encryption keys (KEKs). Each KEK is Base64 for 32 random bytes, e.g. from `openssl rand -base64 32`, under an id made of lowercase letters, digits and `-`. `secrets.database.activeKekId` names the one new writes use. The chart keeps the KEKs in a Secret, and passes each one to the app as `WOMBAT_SECRET_DATABASE_KEK_<ID>`.

```bash
helm install wombat ... --set secrets.writeMode=database \
  --set secrets.database.activeKekId=current \
  --set secrets.database.kek.current="$(openssl rand -base64 32)"
```

To keep the KEKs in an existing Secret instead, store each one under its id, set `secrets.database.existingSecret`, and list the ids in `secrets.database.kek` with empty values. To rotate a KEK, add the new one, switch `activeKekId`, then follow the app's [KEK rotation](https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md#kek-rotation-and-backups) steps before removing the old one.

With `SQLITE_TRANSIENT` persistence, the database lives in memory: the secrets written through the API are lost on every restart.

#### Vault

`secrets.vault.enabled` makes the app resolve keys from a HashiCorp Vault KV v2 mount, under `secrets.vault.pathPrefix`. It is read-only, unless `secrets.writeMode` is `vault`: then Vault is also the writer.

`secrets.vault.client` is written to `quarkus.vault`, in camelCase: see the [Quarkus Vault configuration](https://docs.quarkiverse.io/quarkus-vault/dev/index.html). It requires `url` and exactly one `authentication` method:
- `kubernetes`, recommended in a cluster: Vault trusts the pod's ServiceAccount, with no credential to manage. Bind the Vault `role` to the ServiceAccount set in `serviceAccount`.
- `appRole`, with `roleId` and `secretId`.
- `clientToken`.

The chart keeps `appRole.secretId` and `clientToken` in a Secret, and passes them to the app through env vars. `secrets.vault.caCert` takes the PEM of the CA that signs Vault's certificate: the chart mounts it and sets `client.tls.caCert`. Without `caCert`, `kubernetes` authentication checks Vault's certificate against the cluster's CA: for a Vault behind another CA, set `caCert`, or `client.tls.useKubernetesCaCert: false` for a public one.

```yaml
serviceAccount:
  name: wombat
secrets:
  vault:
    enabled: true
    client:
      url: https://vault.example.com
      kvSecretEngineMountPath: secret
      authentication:
        kubernetes:
          role: wombat
```

The Vault policies each mode needs are in the app's [secret management](https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md#vault-backed-secretresolver) documentation.

#### Cache

The app keeps a resolved secret in memory for `secrets.cache.ttl` (its default: `10m`), so a rotated file or a value changed in Vault is seen within that time. A write through the API applies at once. `0` disables the cache.

### Provisioned Environments (optional)

`monitoredEnvironments` is optional. Without it, Wombat starts with no environment, and they are created from its dashboard or its API. With it, the environments it declares are provisioned at every startup: kept in sync with your values, and read-only in the app. See [environments and provisioning](https://github.com/illuin-tech/wombat/blob/master/doc/provisioning.md).

| Parameter | Description | Default |
|-----------|-------------|---------|
| `monitoredEnvironments.environments` | Map of the environments to provision, and their assets | `{}` (none) |

Each environment holds a list of `assets`. An asset has a `type` and an `id`, and the properties of its module, as documented in [the `wombat-core` modules](https://github.com/illuin-tech/wombat-core/tree/master/doc/module). Write them in kebab-case, exactly as in the app's environments file (e.g. `instance-type`, not `instanceType`): the app drops the keys it doesn't know. A `tech.illuin.wombat-module.kubernetes-api` asset names its kubeconfig in `kubeconfig-key`, a key of `secrets.provisioned`. See the commented sample in `values-local.yaml.dist`.

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
