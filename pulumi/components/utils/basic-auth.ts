import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import aprMd5Module = require('apache-md5');

// The package's typings declare a default export (`export default aprMd5`), but its actual runtime export is a plain CommonJS function (`module.exports = function(...)`).
// So it must be imported via `require` and cast to be callable.
const aprMd5 = aprMd5Module as unknown as (password: string, salt?: string) => string;

export interface BasicAuthArgs {
    username: pulumi.Input<string>;
    password: pulumi.Input<string>;
    realm?: pulumi.Input<string>;
}

/**
 * Creates a Secret holding a single htpasswd-formatted "auth" entry, compatible with
 * ingress-nginx's `nginx.ingress.kubernetes.io/auth-type: basic` annotation.
 */
export function createBasicAuthSecret(name: string, namespace: pulumi.Input<string>, labels: {[key: string]: string}, basicAuth: BasicAuthArgs): k8s.core.v1.Secret {
    const auth = pulumi.all([basicAuth.username, basicAuth.password])
        .apply(([username, password]) => `${username}:${aprMd5(password)}`);

    return new k8s.core.v1.Secret(name, {
        metadata: {
            namespace: namespace,
            labels: labels,
        },
        stringData: {
            auth: auth,
        },
    });
}

/**
 * Builds the ingress-nginx annotations enabling basic auth against the given secret.
 */
export function createBasicAuthAnnotations(secretName: pulumi.Input<string>, realm?: pulumi.Input<string>): {[key: string]: pulumi.Input<string>} {
    return {
        "nginx.ingress.kubernetes.io/auth-type": "basic",
        "nginx.ingress.kubernetes.io/auth-secret": secretName,
        "nginx.ingress.kubernetes.io/auth-realm": realm ?? "Authentication Required",
    };
}
