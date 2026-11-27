import * as pulumi from "@pulumi/pulumi";

export enum NodeMode {
    STANDALONE = "standalone",
    AGGREGATOR = "aggregator",
    WORKER = "worker",
}

interface NodeModeProfileBase {
    type: NodeMode
}

/**
 * Samples its environments into its own database and serves them: the single-instance setup.
 */
export interface Standalone extends NodeModeProfileBase {
    type: NodeMode.STANDALONE
}

/**
 * Stores and serves the metrics pushed by workers, and samples nothing itself.
 */
export interface Aggregator extends NodeModeProfileBase {
    type: NodeMode.AGGREGATOR
}

/**
 * Samples its environments and pushes the metrics to an aggregator instead of its own database.
 */
export interface Worker extends NodeModeProfileBase {
    type: NodeMode.WORKER
    /* Owner of the environments this worker declares, unique among the workers of an aggregator */
    id: pulumi.Input<string>;
    aggregator: {
        url: pulumi.Input<string>;
        /* API key holding api.metric.write and api.environment.write on the aggregator */
        apiKey: pulumi.Input<string>;
        proxyUrl?: pulumi.Input<string>;
        timeout?: pulumi.Input<string>;
    };
    environments?: {
        /*
         * Whether PUT /api/worker/environments also declares environments, on top of monitoredEnvironments: called by a
         * process next to the worker, e.g. a sidecar listing the namespaces of its cluster. false by default. Requires an
         * image supporting it.
         */
        api?: boolean;
    };
}

export type NodeModeProfile = Standalone | Aggregator | Worker;
