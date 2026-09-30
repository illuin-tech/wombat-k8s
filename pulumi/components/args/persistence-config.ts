import {WombatNativeConfig} from "./wombat-args";
import {PersistenceProfile, PersistenceMode} from "./persistence-args";

/**
 * Tweaks the Quarkus application configuration based on the PersistenceProfile.
 */
export function applyPersistenceConfig(config: WombatNativeConfig, profile: PersistenceProfile): WombatNativeConfig {
    config.quarkus = config.quarkus || {};
    config.quarkus.datasource = config.quarkus.datasource || {};
    config.quarkus.datasource.jdbc = config.quarkus.datasource.jdbc || {};

    switch (profile.type) {
        case PersistenceMode.SQLITE_TRANSIENT:
            // We use an in-memory SQLite database for transient setups
            config.quarkus.datasource.jdbc.url = "jdbc:sqlite::memory:";
            config.backup = { enabled: false };
            break;

        case PersistenceMode.SQLITE_WITH_BACKUP:
            // We use a temporary file that is periodically backed up in on an S3 bucket
            config.quarkus.datasource.jdbc.url = "jdbc:sqlite:/var/tmp/wombat.db";
            config.backup = profile.backup;
            config.backup.enabled = true;
            if (config.backup.cleanup)
                config.backup.cleanup.enabled = true;
            break;
    }

    return config;
}
