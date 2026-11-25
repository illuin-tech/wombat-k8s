# @illuin-public/wombat-pulumi

Pulumi Component Resource library for deploying the `wombat` service to Kubernetes.

## Installation

```bash
npm install @illuin-public/wombat-pulumi
```

## Basic Usage

```typescript
import * as pulumi from "@pulumi/pulumi";
import { WombatResource, WombatArgs } from "@illuin-public/wombat-pulumi";

const config = new pulumi.Config();
const serviceArgs = config.requireObject<WombatArgs>("service");

export const wombat = new WombatResource("wombat", serviceArgs);
```

## Configuration Reference (`WombatArgs`)

All service settings live under the `service` config key (or pass them directly as `WombatArgs`).

### Application & Monitoring Configuration

These are optional settings, if left out the app's defaults apply.

* `config.monitor.heartbeat`: how often monitored assets are sampled, as an amount and a unit `s`, `m` or `h` (e.g. `"10s"`, the default).
* `compaction`: how sampled metrics are folded (`persistence.compaction` in the app): `cron` (default `"0 1 * * * ?"`), `window` (default `"1h"`) and `delay` (default `"1m"`).
* `ui.maxDateRange`: `{ duration: number, unit: "DAYS" | "MONTHS" | "YEARS" }` specifying the maximum date range queryable in the dashboard UI (default `{ duration: 1, unit: "YEARS" }`).

### OIDC Authentication (optional)

`security` turns on the app's `oidc` profile (see [access control](https://github.com/illuin-tech/wombat/blob/master/doc/access-control.md)). Without it, the app runs without authentication.

* `security.enabled`: turns it on.
* `security.oidc`: the identity provider, written to `quarkus.oidc`
  * `authServerUrl` (the issuer URL) and `clientId` are required.
  * `authentication` (`scopes`, `userInfoRequired`, `extraParams`) and `roles` (`roleClaimPath`, `source`) are optional.
* `security.oidc.credentials.secret`: the OIDC client secret, required, as a Pulumi secret. It is written to the `application.yaml` override, which is itself a Secret.
* `security.auth`: the access rules, written to `auth`.
  * `roles.admin` is required.
  * `roles.user`, `roles.apiKeyManager`, `allowedEmailDomains`, `emailClaim`, `requireVerifiedEmail`, `displayNameClaims`, `idpLogout` and `apiKeys` (`maxLifetime`, `allowNeverExpiring`) are all optional.

```yaml
security:
  enabled: true
  oidc:
    authServerUrl: https://idp.example.com
    clientId: wombat
    authentication:
      userInfoRequired: true
  auth:
    allowedEmailDomains: [example.com]
    roles:
      admin: [wombat-admins]
      user: [wombat-users]
```

```bash
pulumi config set --secret --path 'service.security.oidc.credentials.secret' <client-secret>
```

### Deployment Mode

* `mode`: optional, `{ type: "standalone" }` by default. Each `WombatResource` deploys a single instance in one of these modes:
  * `standalone`: samples its environments into its own database and serves them.
  * `aggregator`: stores and serves the metrics pushed by workers, and samples nothing itself.
  * `worker`: samples its environments and pushes the metrics to an aggregator. Requires `id` (unique among the workers of an aggregator), `aggregator.url` and `aggregator.apiKey` (holding `api.metric.write` and `api.environment.write` on the aggregator), and optionally `aggregator.proxyUrl` and `aggregator.timeout` (e.g. `30s`). A worker writes no metric to its own database, so it requires the `SQLITE_TRANSIENT` persistence type.

A distributed setup is one `aggregator` resource plus one `worker` resource next to each environment the aggregator cannot reach. See the [Wombat distributed setup documentation](https://github.com/illuin-tech/wombat/blob/master/doc/distributed.md) for details.

```bash
pulumi config set --path 'service.mode.type' worker
pulumi config set --path 'service.mode.id' east
pulumi config set --path 'service.mode.aggregator.url' https://wombat-aggregator.example.com
pulumi config set --secret --path 'service.mode.aggregator.apiKey' <api-key>
```

### Provisioned Environments (optional)

`monitoredEnvironments` is optional. Without it, Wombat starts with no environment, and they are created from its dashboard or its API. With it, the environments it declares are provisioned at every startup: kept in sync with your stack, and read-only in the app. See [environments and provisioning](https://github.com/illuin-tech/wombat/blob/master/doc/provisioning.md).

* `monitoredEnvironments.environments`: a map of environment id → `{ assets }`. Each asset has a `type` and an `id`, and the properties of its module, as documented in [the `wombat-core` modules](https://github.com/illuin-tech/wombat-core/tree/master/doc/module). They are passed through as they are, their keys in kebab-case (camelCase keys are converted), so a block from the module documentation or from the app's environments file can be pasted as is. See the commented sample in `Pulumi.local.yaml.dist`.

They are compiled into a `/monitored/monitored-environments.yaml` file mounted in the container, with `environments: {}` when there are none.

### Secrets

`secrets` holds the secret backends the app resolves secret keys from. An asset references its credentials by key, such as a `tech.illuin.wombat-module.kubernetes-api` asset's `kubeconfigKey`. Each backend is optional. The app looks a key up in the writer first, if any, then Vault, then the files, as described in [secret management](https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md). The component supports files, Vault and the database; not the app's keystore or environment resolvers. `secrets.vault` and `secrets.cache` need a Wombat release after `0.24.0`.

#### Files

`secrets.provisioned` maps keys to values, each set as a Pulumi secret:

```bash
pulumi config set --secret --path 'service.secrets.provisioned.kubeconfig-my-cluster' -- "$(cat /path/to/kubeconfig)"
```

They are compiled into a Kubernetes `Secret`, mounted at `/secrets` as the app's directory secret resolver (`wombat.secret.directory.path`): a read-only backend, with one file per key. A key is made of letters, digits, `-` and `_`, the app's secret key format, and the deployment fails on any other.

Kubeconfigs are provisioned secrets too. An asset, provisioned or created in the app, names its kubeconfig in `kubeconfigKey`. The kubeconfig must inline its certificates and keys (`certificate-authority-data`, `client-certificate-data`, `client-key-data`): the app reads it in memory, with no file to resolve a relative path against.

`secrets.existingSecrets` adds Secrets created outside the stack, e.g. by the External Secrets Operator or Sealed Secrets, to the same directory. Each of their keys becomes a secret, so name the keys in the app's key format: the component cannot check them. Don't use a key twice across these Secrets and `secrets.provisioned`. A Secret updated in place reaches the app within the kubelet's sync period, plus the cache TTL.

#### Writer

`secrets.writeMode` picks the backend behind the app's secret-management API (`/api/secrets`), which also comes first when resolving a key: `database` or `vault`. With `disabled`, the default, secrets are only read.

> ⚠️ The API lists, writes and deletes secrets. Turn on `security` with it: without authentication, anyone who reaches the service can use it.

#### Database

With `secrets.writeMode: database`, the app stores the secrets written through its API in its own database, encrypted with key-encryption keys (KEKs).

* `secrets.database.kek`: the KEKs by id, each Base64 for 32 random bytes (e.g. from `openssl rand -base64 32`), as Pulumi secrets. An id is made of lowercase letters, digits and `-`. They are written to the `application.yaml` override, itself a Secret.
* `secrets.database.activeKekId`: the one new writes use.

```bash
pulumi config set --path 'service.secrets.writeMode' database
pulumi config set --path 'service.secrets.database.activeKekId' current
pulumi config set --secret --path 'service.secrets.database.kek.current' "$(openssl rand -base64 32)"
```

To rotate a KEK, add the new one, switch `activeKekId`, then follow the app's [KEK rotation](https://github.com/illuin-tech/wombat/blob/master/doc/secret-management.md#kek-rotation-and-backups) steps before removing the old one. With `SQLITE_TRANSIENT` persistence, the database lives in memory: the secrets written through the API are lost on every restart.

#### Vault

`secrets.vault.enabled` makes the app resolve keys from a HashiCorp Vault KV v2 mount, under `secrets.vault.pathPrefix` (the app's default: `wombat`). It is read-only, unless `secrets.writeMode` is `vault`: then Vault is also the writer.

* `secrets.vault.client`: written to `quarkus.vault`, see the [Quarkus Vault configuration](https://docs.quarkiverse.io/quarkus-vault/dev/index.html). It requires `url` and exactly one `authentication` method:
  * `kubernetes`, recommended in a cluster: Vault trusts the pod's ServiceAccount, with no credential to manage. Bind the Vault `role` to the account set in `serviceAccountName`, or to `default`.
  * `appRole`, with `roleId` and `secretId`.
  * `clientToken`.

  `appRole.secretId` and `clientToken` are Pulumi secrets, written to the `application.yaml` override, itself a Secret.
* `secrets.vault.caCert`: the PEM of the CA that signs Vault's certificate. It is mounted, and set as `client.tls.caCert`. Without it, `kubernetes` authentication checks Vault's certificate against the cluster's CA: for a Vault behind another CA, set `caCert`, or `client.tls.useKubernetesCaCert: false` for a public one.

```yaml
serviceAccountName: wombat
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

### Extensions

Mount user-provided extension JARs into the container (default mount path `/extensions`):

* `extensions.existingClaimName`: reference an existing PersistentVolumeClaim.
* `extensions.pvc`: provision a managed PVC with `size` (e.g. `1Gi`), `storageClassName`, and `accessModes` (e.g. `["ReadWriteOnce"]`).
* `extensions.mountPath`: optional custom mount path inside the container (defaults to `/extensions`).

### Dependencies & Connectors

Wombat can use either container sidecars or external endpoints for BoaviztAPI and Ecologits:

* `dependencies.boaviztapi`: `CONTAINER` (defaults to sidecar with BoaviztAPI `2.4.1`) or `EXTERNAL` with `endpoint`.
* `dependencies.ecologits`: `CONTAINER` (defaults to sidecar with Ecologits `0.0.2`) or `EXTERNAL` with `endpoint`.

These are automatically mapped to the `uri` settings of the Boavizta and Ecologits modules in the container configuration,
`wombat.module.settings."tech.illuin.wombat-module.boavizta".uri` and its Ecologits equivalent. Give the modules other
settings, such as a `proxy-url`, through `config.module.settings`.

### Persistence

#### Persistence Modes
* `persistence.type`: `SQLITE_TRANSIENT` (in-memory SQLite, Deployment), `SQLITE_WITH_BACKUP` (file-backed SQLite with S3 backup, StatefulSet), or `POSTGRESQL` (PostgreSQL configured through `config.persistence.backend.postgresql`, Deployment).

For PostgreSQL, supply `config.persistence.backend.postgresql.jdbcUrl`, `username`, and `password`. The component connects to an existing PostgreSQL server; it does not provision one. Set the password as a Pulumi secret, for example:

```bash
pulumi config set --secret --path 'service.config.persistence.backend.postgresql.password' <password>
```

#### S3 Backup
* `persistence.backup.enabled` (boolean, default `true` when using `SQLITE_WITH_BACKUP`): enables the periodic SQLite backup service.
* `persistence.backup.cron`: cron expression for the backup schedule (default `0 0 2 * * ?`, i.e. daily at 2am).
* `persistence.backup.restoreOnStartup`: boolean, restore latest S3 backup snapshot on container startup (default `true`).
* `persistence.backup.cleanup.cron`: cron expression for old backup cleanup (e.g. `0 0 3 * * ?`).
* `persistence.backup.cleanup.retainLast`: number of most recent snapshots to retain in S3 (e.g. `25`).
* `persistence.backup.s3`: **required when `backup.enabled` is `true`**. Set `endpoint`, `bucket`, `accessKey`, `secretKey`, and optionally `keyPrefix` and `region`.

```bash
pulumi config set --path 'service.persistence.backup.s3.endpoint' https://s3.example.com
pulumi config set --path 'service.persistence.backup.s3.bucket' wombat-backup
pulumi config set --secret --path 'service.persistence.backup.s3.accessKey' <access-key>
pulumi config set --secret --path 'service.persistence.backup.s3.secretKey' <secret-key>
```

### Other Useful Settings

* `container.imageVersion`: the `wombat` image tag to deploy.
* `container.pullSecret`: optional; GAR/GCR service account JSON (as a secret) for pulling the image from a private registry.
* `serviceAccountName`: optional; an existing ServiceAccount for the pod, e.g. the one a Vault `kubernetes` role is bound to. The namespace's `default` otherwise.
* `resources`: K8S `resources.limits` and `resources.requests` for the container.
* `jvmOptions`: JVM options such as `xms: 512M`, `xmx: 512M`.
* `ingress`: optional; set `className`, `host`, `path`, `pathType`, `annotations`, and `tlsSecretName` to expose the service through an `Ingress`.
  * `ingress.basicAuth`: optional; set `username` and `password` (optionally `realm`) to protect the ingress with HTTP basic auth. A `Secret` holding the corresponding htpasswd entry is created automatically.
