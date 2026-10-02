# Wombat Helm Chart

Official Helm chart for installing the [Wombat Carbon Tracker](https://github.com/illuin-tech/wombat) application on a Kubernetes cluster.

### Pulling the Chart

```bash
helm pull oci://registry-1.docker.io/illuin/wombat-chart --version <version>
```

### Installation

```bash
helm install wombat oci://registry-1.docker.io/illuin/wombat-chart --version <version> -f my-values.yaml
```

For full details on configuration options (monitoring, secrets, persistence, ingress), see [the full Helm chart documentation](https://github.com/illuin-tech/wombat-k8s/blob/main/helm/README.md).
