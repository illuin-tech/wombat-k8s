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

### Monitoring Configuration

* `config.monitor.heartbeat`: CRON expression controlling how often monitored assets are polled.
* `monitoredEnvironments.environments`: a map of environment id → `{ id, name, assets }`, where each asset has a `type` (`KUBERNETES_API`, `LLM_STATIC`, `LLM_PROMETHEUS`), an `id`, an `environmentId`, a `name`, optional `resolvers`, and a `profile` configuration:
  * `KUBERNETES_API`: reads cluster workload via a mounted kubeconfig.
  * `LLM_STATIC`: static LLM traffic estimation.
  * `LLM_PROMETHEUS`: live LLM metrics polled from a Prometheus endpoint, supporting optional `username` and `passwordKey`.

Monitoring configurations are compiled into a `/monitored/monitored-environments.yaml` file mounted in the container. Each `KUBERNETES_API` asset's `config-path` is automatically pointed to `/kubeconfigs/<id>.config`.

### Kubeconfigs & Secret Management

#### Kubeconfigs
Kubeconfigs are supplied inline as strings in `monitoredEnvironments.kubeconfigs`. Set each via the Pulumi CLI as a secret:

```bash
pulumi config set --secret --path 'service.monitoredEnvironments.kubeconfigs[0].content' -- "$(cat /path/to/kubeconfig)"
```

They are compiled into a Kubernetes `Secret` and mounted into the container under `/kubeconfigs/<id>.config`.

#### Runtime Secrets
Generic runtime secrets (e.g. Prometheus passwords referenced in `passwordKey`) are declared under `secrets`:

```bash
pulumi config set --secret --path 'service.secrets.WOMBAT_PROMETHEUS_PASSWORD' <password>
```

When provided, Pulumi provisions a Kubernetes `Secret` mounted as a directory volume at `/secrets`, and configures `wombat.secret.directory.path: /secrets`. The backend's `DirectorySecretResolver` resolves secrets directly from this directory.

### Dependencies & Connectors

Wombat can use either container sidecars or external endpoints for BoaviztAPI and Ecologits:

* `dependencies.boaviztapi`: `CONTAINER` (defaults to sidecar with BoaviztAPI `2.4.1`) or `EXTERNAL` with `endpoint`.
* `dependencies.ecologits`: `CONTAINER` (defaults to sidecar with Ecologits `0.0.2`) or `EXTERNAL` with `endpoint`.

These are automatically mapped to `connector.boavizta.uri` and `connector.ecologits.uri` in the container configuration.

### Persistence

#### Persistence Modes
* `persistence.type`: `SQLITE_TRANSIENT` (in-memory SQLite, Deployment) or `SQLITE_WITH_BACKUP` (file-backed SQLite with S3 backup, StatefulSet).

#### S3 Backup
* `persistence.backup.enabled` (boolean, default `true` when using `SQLITE_WITH_BACKUP`): enables the periodic SQLite backup service.
* `persistence.backup.cron`: cron expression for the backup schedule (default `0 0 2 * * ?`, i.e. daily at 2am).
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
* `resources`: K8S `resources.limits` and `resources.requests` for the container.
* `jvmOptions`: JVM options such as `xms: 512M`, `xmx: 512M`.
* `ingress`: optional; set `className`, `host`, `path`, `pathType`, `annotations`, and `tlsSecretName` to expose the service through an `Ingress`.
  * `ingress.basicAuth`: optional; set `username` and `password` (optionally `realm`) to protect the ingress with HTTP basic auth. A `Secret` holding the corresponding htpasswd entry is created automatically.
