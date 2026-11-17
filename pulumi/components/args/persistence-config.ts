import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {PersistenceMode} from "./persistence-args";

/**
 * Tweaks the Quarkus application configuration based on the PersistenceProfile.
 */
export class PersistenceConfigCompiler implements AppConfigCompiler
{
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        config.persistence = config.persistence || {};
        config.persistence.backend = config.persistence.backend || {};
        switch (args.persistence.type) {
            case PersistenceMode.SQLITE_TRANSIENT:
                // We use an in-memory SQLite database for transient setups
                config.persistence.backend.sqlite = config.persistence.backend.sqlite || {};
                config.persistence.backend.sqlite.jdbcUrl = "jdbc:sqlite::memory:";
                config.persistence.backend.sqlite.backup = { enabled: false };
                break;

            case PersistenceMode.SQLITE_WITH_BACKUP:
                // We use a temporary file that is periodically backed up in on an S3 bucket
                config.persistence.backend.sqlite = config.persistence.backend.sqlite || {};
                config.persistence.backend.sqlite.jdbcUrl = "jdbc:sqlite:/var/tmp/wombat.db";
                config.persistence.backend.sqlite.backup = args.persistence.backup;
                config.persistence.backend.sqlite.backup.enabled = true;
                if (config.persistence.backend.sqlite.backup.cleanup)
                    config.persistence.backend.sqlite.backup.cleanup.enabled = true;
                break;
        }

        return { config: config };
    }
}
