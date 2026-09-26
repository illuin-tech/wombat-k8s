import * as pulumi from "@pulumi/pulumi";

export interface ExtensionsPvcArgs {
    existingClaimName?: pulumi.Input<string>;
    size?: pulumi.Input<string>;
    storageClassName?: pulumi.Input<string>;
    accessModes?: pulumi.Input<pulumi.Input<string>[]>;
}

export interface ExtensionsConfig {
    pvc?: ExtensionsPvcArgs;
    existingClaimName?: pulumi.Input<string>;
    mountPath?: string;
}
