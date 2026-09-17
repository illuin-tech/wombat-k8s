import * as pulumi from "@pulumi/pulumi";

export interface IngressBasicAuthArgs {
    username: pulumi.Input<string>;
    password: pulumi.Input<string>;
    realm?: pulumi.Input<string>;
}

export interface IngressArgs {
    className: pulumi.Input<string>;
    annotations: { [key: string]: string };
    host: pulumi.Input<string>;
    tlsSecretName: pulumi.Input<string>;
    path: pulumi.Input<string>;
    pathType: pulumi.Input<string>;
    basicAuth?: IngressBasicAuthArgs;
}
