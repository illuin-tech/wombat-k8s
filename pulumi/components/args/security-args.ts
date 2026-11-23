import * as pulumi from "@pulumi/pulumi";

/**
 * Turns on the app's OIDC authentication, its `oidc` profile. See
 * https://github.com/illuin-tech/wombat/blob/master/doc/access-control.md
 */
export interface SecurityConfig {
    enabled: boolean;
    oidc?: OidcConfig;
    auth?: AuthConfig;
}

/**
 * The identity provider, written to `quarkus.oidc`. The `oidc` profile sets the rest: callback path, protected paths.
 */
export interface OidcConfig {
    /** The issuer URL. */
    authServerUrl: pulumi.Input<string>;
    clientId: pulumi.Input<string>;
    credentials: {
        /** The client secret, as a Pulumi secret: it is written to the `application.yaml` override, itself a Secret. */
        secret: pulumi.Input<string>;
    };
    authentication?: {
        scopes?: pulumi.Input<string[]>;
        userInfoRequired?: pulumi.Input<boolean>;
        extraParams?: { [key: string]: pulumi.Input<string>; };
    };
    roles?: {
        roleClaimPath?: pulumi.Input<string>;
        source?: pulumi.Input<string>;
    };
}

/**
 * The app's access rules, written to its top-level `auth`. Unset keys keep the app's defaults.
 */
export interface AuthConfig {
    /** Provider roles or groups, emails, or `"*"` granting each Wombat role. `admin` is required. */
    roles: {
        admin: pulumi.Input<string[]>;
        user?: pulumi.Input<string[]>;
        apiKeyManager?: pulumi.Input<string[]>;
    };
    allowedEmailDomains?: pulumi.Input<string[]>;
    emailClaim?: pulumi.Input<string>;
    requireVerifiedEmail?: pulumi.Input<boolean>;
    displayNameClaims?: pulumi.Input<string[]>;
    idpLogout?: pulumi.Input<boolean>;
    apiKeys?: {
        maxLifetime?: pulumi.Input<string>;
        allowNeverExpiring?: pulumi.Input<boolean>;
    };
}
