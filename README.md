# Wombat Pulumi deployment

Pulumi project that deploys the `wombat` service to K8S.

## Setup locally

First, install dependencies:
```
cd pulumi
npm ci
```

Point Pulumi at your kubeconfig/cluster context. The K8S provider used here relies on the ambient `kubectl` config, so make sure `KUBECONFIG` (or `~/.kube/config`) points at the cluster/context you want to deploy to.

Create your local stack config from the template and edit it to fit your needs (see [below section](#tweaking-important-settings)):
```
cp Pulumi.local.yaml.dist Pulumi.local.yaml
```

Select/create the stack and deploy:

```
pulumi stack select local --create
pulumi up
```

All service settings live under the `wombat:service` config key, matching the `WombatArgs` shape (`pulumi/components/args/wombat-args.ts`).

## Tweaking important settings

### Monitoring configuration

* `config.monitor.heartbeat`: CRON expression controlling how often monitored assets are polled.
* `monitoredEnvironments.environments`: a map of environment id → `{ id, name, assets }`, where each asset has a `type` (`KUBERNETES_API`, `LLM_STATIC`, `LLM_PROMETHEUS`), an `id`, an `environmentId`, a `name`, optional `resolvers`, and a `profile` configuration:
  * `KUBERNETES_API`: reads cluster workload via a mounted kubeconfig.
  * `LLM_STATIC`: static LLM traffic estimation.
  * `LLM_PROMETHEUS`: live LLM metrics polled from a Prometheus endpoint, supporting optional `username` and `passwordKey`.

Monitoring configurations are compiled into a `/monitored/monitored-environments.yaml` file mounted in the container. Each `KUBERNETES_API` asset's `config-path` is automatically pointed to `/kubeconfigs/<id>.config`.

### Kubeconfigs & Secret Management

#### Kubeconfigs

Kubeconfigs are supplied inline as strings in `monitoredEnvironments.kubeconfigs`. Set each via the Pulumi CLI as a secret:

```
pulumi config set --secret --path 'service.monitoredEnvironments.kubeconfigs[0].content' -- "$(cat /path/to/kubeconfig)"
```

They are compiled into a Kubernetes `Secret` and mounted into the container under `/kubeconfigs/<id>.config`.

#### Runtime Secrets

Generic runtime secrets (e.g. Prometheus passwords referenced in `passwordKey`) are declared under `secrets`:

```
pulumi config set --secret --path 'service.secrets.WOMBAT_PROMETHEUS_PASSWORD' <password>
```

When provided, Pulumi provisions a Kubernetes `Secret` mounted as a directory volume at `/secrets`, and configures `wombat.secret.directory.path: /secrets`. The backend's `DirectorySecretResolver` resolves secrets directly from this directory to satisfy `RequiredSecretsCheck`.

### Dependencies & Connectors

Wombat can use either container sidecars or external endpoints for BoaviztAPI and Ecologits:

* `dependencies.boaviztapi`: `CONTAINER` (defaults to sidecar with BoaviztAPI `2.4.1`) or `EXTERNAL` with `endpoint`.
* `dependencies.ecologits`: `CONTAINER` (defaults to sidecar with Ecologits `0.0.2`) or `EXTERNAL` with `endpoint`.

These are automatically mapped to `connector.boavizta.uri` and `connector.ecologits.uri` in the container configuration.

### Persistence

#### Persistence modes

* `persistence.type`: `SQLITE_TRANSIENT` (in-memory SQLite, Deployment) or `SQLITE_WITH_BACKUP` (file-backed SQLite with S3 backup, StatefulSet).

#### S3 Backup

* `persistence.backup.enabled` (boolean, default `true` when using `SQLITE_WITH_BACKUP`): enables the periodic SQLite backup service.
* `persistence.backup.cron`: cron expression for the backup schedule (default `0 0 2 * * ?`, i.e. daily at 2am).
* `persistence.backup.s3`: **required when `backup.enabled` is `true`**. Set `endpoint`, `bucket`, `accessKey`, `secretKey`, and optionally `keyPrefix` and `region`.

Since `accessKey` / `secretKey` are sensitive, set them as secret config values rather than plain YAML:

```
pulumi config set --path 'service.persistence.backup.s3.endpoint' https://s3.example.com
pulumi config set --path 'service.persistence.backup.s3.bucket' wombat-backup
pulumi config set --secret --path 'service.persistence.backup.s3.accessKey' <access-key>
pulumi config set --secret --path 'service.persistence.backup.s3.secretKey' <secret-key>
```

## Other useful settings

* `container.imageVersion`: the `wombat` image tag to deploy (overridden in CI via `pulumi config set --path 'service.container.imageVersion' $VERSION`).
* `container.pullSecret`: optional; GAR/GCR service account JSON (as a secret) for pulling the image from a private registry.
* `resources`: K8S `resources.limits` and `resources.requests` for the container.
* `jvmOptions`: JVM options such as `xms: 512M`, `xmx: 512M`.
* `ingress`: optional; set `className`, `host`, `path`, `pathType`, `annotations`, and `tlsSecretName` to expose the service through an `Ingress`.
  * `ingress.basicAuth`: optional; set `username` and `password` (optionally `realm`) to protect the ingress with HTTP basic auth. A `Secret` holding the corresponding htpasswd entry (`apr1`-hashed) is created automatically. Set the password as a secret config value:
    ```
    pulumi config set --path 'service.ingress.basicAuth.username' admin
    pulumi config set --secret --path 'service.ingress.basicAuth.password' <password>
    ```

## Deploying

Locally, after configuring `Pulumi.local.yaml`, simply run:

```
pulumi up
```
