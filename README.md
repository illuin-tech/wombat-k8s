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

All service settings live under the `wombat:service` config key, matching the `WombatArgs` shape (`pulumi/components/wombat-args.ts`).

## Tweaking important settings

### Monitoring configuration

* `config.monitor.heartbeat`: CRON expression controlling how often monitored assets are polled.
* `monitoredEnvironments.environments`: a map of environment id → `{ name, assets }`, where each asset has a `type` (`KUBERNETES_API`, `LLM_STATIC`, `LLM_PROMETHEUS`), an `id`, a `name`, and a `profile` configuration, they can be either one of:
  * `KUBERNETES_API`
  * `LLM_STATIC`
  * `LLM_PROMETHEUS`

Monitoring configurations are then compiled a `/monitored/monitored-environments.yaml` file and each `KUBERNETES_API` asset's `config-path` is automatically pointed at it.

### Kubeconfigs

Kubeconfigs are supplied inline as strings in `monitoredEnvironments.kubeconfigs`. Set it via the Pulumi CLI (do not commit it in plain text), e.g.:

```
pulumi config set --secret --path 'service.monitoredEnvironments.kubeconfigs[0].content' -- "$(cat /path/to/kubeconfig)"
```

They are then automatically compiled into mounted `ConfigMap`s during deployment under the `/kubeconfigs` directory.

### Persistence

#### Persistence modes

* `config.persistence.enableKubernetesMetricsPersister` (boolean): enables/disables periodic persistence of Kubernetes metrics to the local SQLite database.

#### S3 Backup

* `config.backup.enabled` (boolean, default `false`): enables the periodic SQLite backup service.
* `config.backup.cron`: cron expression for the backup schedule (default `0 0 2 * * ?`, i.e. daily at 2am).
* `config.backup.s3`: **required when `backup.enabled` is `true`**. Set `endpoint`, `bucket`, `accessKey`, `secretKey`, and optionally `keyPrefix`. Without backup enabled, this block can be omitted entirely.

Since `accessKey` / `secretKey` are sensitive, set them as secret config values rather than plain YAML, e.g.:

```
pulumi config set --path 'service.config.backup.enabled' true
pulumi config set --path 'service.config.backup.s3.endpoint' https://s3.example.com
pulumi config set --path 'service.config.backup.s3.bucket' wombat-backup
pulumi config set --secret --path 'service.config.backup.s3.accessKey' <access-key>
pulumi config set --secret --path 'service.config.backup.s3.secretKey' <secret-key>
```

## Other useful settings

* `container.imageVersion`: the `wombat` image tag to deploy (overridden in CI via `pulumi config set --path 'service.container.imageVersion' $VERSION`).
* `container.pullSecret`: optional; GCR service account JSON (as a secret) for pulling the image from a private registry.
* `resources`: K8S `resources.limits` and `resources.requests` for the container.
* `ingress`: optional; set `class_name`, `host`, `path`, `path_type`, `annotations`, and `tls_secret_name` to expose the service through an `Ingress`.
  * `ingress.basicAuth`: optional; set `username` and `password` (optionally `realm`) to protect the ingress with HTTP basic auth. A `Secret` holding the corresponding htpasswd entry (`apr1`-hashed, natively supported by ingress-nginx) is created automatically, and the `nginx.ingress.kubernetes.io/auth-*` annotations are added on top of `ingress.annotations`. Set the password as a secret config value, e.g.:
    ```
    pulumi config set --path 'service.ingress.basicAuth.username' admin
    pulumi config set --secret --path 'service.ingress.basicAuth.password' <password>
    ```

## Deploying

Locally, after configuring `Pulumi.local.yaml`, simply run:

```
pulumi up
```

On the CI side (`pulumi/.gitlab-ci.yml`) it will select the `STACK_NAME` stack, set `container.imageVersion` to `VERSION` and then run `pulumi up --yes`. 
