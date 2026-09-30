# Wombat Kubernetes Deployments

This repository provides Kubernetes deployment tooling for the `wombat` service:

- **`helm/`**: Helm chart for packaging and installing Wombat on Kubernetes clusters.
- **`pulumi/`**: Pulumi Component Resource library (`@illuin-public/wombat-pulumi`) for managing Wombat deployments programmatically via TypeScript/Pulumi.

---

## Directory Structure

```
.
├── helm/
│   └── wombat/               # Wombat Helm chart (Chart.yaml, values.yaml, templates/)
└── pulumi/                   # @illuin-public/wombat-pulumi library
    ├── components/           # Pulumi component implementations
    ├── index.ts              # Entry point exports
    ├── package.json          # Package definition
    └── tsconfig.json         # TypeScript configuration
```

---

## 1. Helm Chart (`helm/`)

The Helm chart is located in `helm/wombat/` and can be used to install Wombat on any Kubernetes cluster.

### Linting & Testing
```bash
helm lint helm/wombat
```

### Installation
```bash
helm install wombat ./helm/wombat -f my-values.yaml
```

---

## 2. Pulumi Component Package (`pulumi/`)

The Pulumi library in `pulumi/` provides the `@illuin-public/wombat-pulumi` component package.

### Building
```bash
cd pulumi
npm ci
npm run build
```

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

For full details on configuration options (monitoring, secrets, persistence, ingress), see [`pulumi/README.md`](pulumi/README.md).
