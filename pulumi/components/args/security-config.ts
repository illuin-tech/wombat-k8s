import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";

/**
 * Turns on the app's `oidc` profile, and writes the provider to `quarkus.oidc` and the access rules to `auth`.
 */
export class SecurityConfigCompiler implements AppConfigCompiler {
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        const security = args.security;
        if (!security?.enabled)
            return { config: config };

        const oidc = security.oidc;
        if (!oidc)
            throw new Error("security.oidc is required when security.enabled is true");
        if (oidc.credentials?.secret === undefined)
            throw new Error("security.oidc.credentials.secret is required when security.enabled is true");
        if (!security.auth?.roles?.admin)
            throw new Error("security.auth.roles.admin is required when security.enabled is true, or nobody can administer Wombat");

        /* The override is a Secret, so the client secret can sit there */
        config.quarkus = config.quarkus || {};
        config.quarkus.oidc = oidc;
        config.auth = security.auth;

        return {
            config: config,
            envVariables: [{ name: "QUARKUS_PROFILE", value: "prod,oidc" }],
        };
    }
}
