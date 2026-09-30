export enum WorkloadType {
    DEPLOYMENT = "DEPLOYMENT",
    STATEFUL_SET = "STATEFUL_SET",
}

export interface WorkloadConfig {
    workloadType: WorkloadType;
    podConfig: {
        terminationGracePeriodSeconds: number;
    }
}