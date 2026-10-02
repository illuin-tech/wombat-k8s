# Wombat on Kubernetes

This repository provides Kubernetes deployment tooling for the [Wombat Carbon Tracker](https://github.com/illuin-tech/wombat) application:

* `pulumi/`: a Pulumi Component Resource library (`@illuin-public/wombat-pulumi` on NPM) for managing Wombat deployments programmatically via Pulumi (in TypeScript) - _**This is the recommended way to deploy Wombat at the moment, as it is the one we put the most effort on**_
* `helm/`: a Helm chart for packaging and installing Wombat on Kubernetes clusters, distributed via Docker Hub as an OCI artifact (`oci://registry-1.docker.io/illuin/wombat-chart`)

## Pulumi Package

The Pulumi library in `pulumi/` provides the `@illuin-public/wombat-pulumi` component package.

### Usage

In your Pulumi TypeScript project:

```bash
npm install @illuin-public/wombat-pulumi
```

```typescript
import * as pulumi from "@pulumi/pulumi";
import { WombatResource, WombatArgs } from "@illuin-public/wombat-pulumi";

const config = new pulumi.Config();
const serviceArgs = config.requireObject<WombatArgs>("service");

export const wombat = new WombatResource("wombat", serviceArgs);
```

### Building

```bash
cd pulumi
npm ci
npm run build
```

For full details on configuration options (monitoring, secrets, persistence, ingress), see [`pulumi/README.md`](pulumi/README.md).


## Helm Chart

The Helm chart is published as an OCI artifact to Docker Hub at `oci://registry-1.docker.io/illuin/wombat-chart`.

### Installation via OCI Registry

You can install the chart directly without cloning the repository:

```bash
helm install wombat oci://registry-1.docker.io/illuin/wombat-chart --version <version> -f my-values.yaml
```

To pull and inspect the packaged chart locally:

```bash
helm pull oci://registry-1.docker.io/illuin/wombat-chart --version <version>
```

### Local Development & Source Installation

If working from source or developing custom chart modifications:

```bash
# Lint the chart
helm lint helm/wombat

# Install from local directory
helm install wombat ./helm/wombat -f my-values.yaml
```

For full details on configuration options (monitoring, secrets, persistence, ingress), see [`helm/README.md`](helm/README.md).
