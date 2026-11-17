import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {PersistenceMode} from "./persistence-args";

/**
 * Tweaks the Quarkus application configuration based on the PersistenceProfile.
 */
export class PersistenceConfigCompiler implements AppConfigCompiler
{
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        switch (args.persistence.type) {
            case PersistenceMode.SQLITE_TRANSIENT:
                // We use an in-memory SQLite database for transient setups
                config.wombat.persistence.sqlite.jdbcUrl = "jdbc:sqlite::memory:";
                config.wombat.persistence.sqlite.backup = { enabled: false };
                break;

            case PersistenceMode.SQLITE_WITH_BACKUP:
                // We use a temporary file that is periodically backed up in on an S3 bucket
                config.wombat.persistence.sqlite.jdbcUrl = "jdbc:sqlite:/var/tmp/wombat.db";
                config.wombat.persistence.sqlite.backup = args.persistence.backup;
                config.wombat.persistence.sqlite.backup.enabled = true;
                if (config.wombat.persistence.sqlite.backup.cleanup)
                    config.wombat.persistence.sqlite.backup.cleanup.enabled = true;
                break;
        }

        return { config: config };
    }
}
