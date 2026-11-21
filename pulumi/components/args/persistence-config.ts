import {AppConfig, AppConfigCompiler, AppPackage, WombatArgs} from "./wombat-args";
import {PersistenceBackendMode, PersistenceMode} from "./persistence-args";
import * as pulumi from "@pulumi/pulumi";

/**
 * Tweaks the Quarkus application configuration based on the PersistenceProfile.
 */
export class PersistenceConfigCompiler implements AppConfigCompiler
{
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        config.persistence = config.persistence || {};
        config.persistence.backend = config.persistence.backend || {};
        const mode = args.persistence.type;
        switch (args.persistence.type) {
            case PersistenceMode.SQLITE_TRANSIENT:
                // We use an in-memory SQLite database for transient setups
                config.persistence.backend.mode = PersistenceBackendMode.SQLITE;
                config.persistence.backend.sqlite = config.persistence.backend.sqlite || {};
                config.persistence.backend.sqlite.jdbcUrl = "jdbc:sqlite::memory:";
                config.persistence.backend.sqlite.backup = { enabled: false };
                return { config };

            case PersistenceMode.SQLITE_WITH_BACKUP:
                // We use a temporary file that is periodically backed up in on an S3 bucket
                config.persistence.backend.mode = PersistenceBackendMode.SQLITE;
                config.persistence.backend.sqlite = config.persistence.backend.sqlite || {};
                config.persistence.backend.sqlite.jdbcUrl = "jdbc:sqlite:/var/tmp/wombat.db";
                config.persistence.backend.sqlite.backup = args.persistence.backup;
                config.persistence.backend.sqlite.backup.enabled = true;
                if (config.persistence.backend.sqlite.backup.cleanup)
                    config.persistence.backend.sqlite.backup.cleanup.enabled = true;
                return { config };

            case PersistenceMode.POSTGRESQL:
                // We connect to an existing PostgreSQL server
                config.persistence.backend.mode = PersistenceBackendMode.POSTGRESQL;
                config.persistence.backend.postgresql = config.persistence.backend.postgresql || {};
                config.persistence.backend.postgresql.jdbcUrl = pulumi.interpolate`jdbc:postgresql://${args.persistence.host}/${args.persistence.databaseName}`;
                config.persistence.backend.postgresql.username = args.persistence.username;
                config.persistence.backend.postgresql.password = args.persistence.password;
                return { config };
        }

        throw new Error(`Unsupported persistence mode: ${mode}`);
    }
}

/**
 * Tweaks the Quarkus application configuration based on the CompactionConfig.
 */
export class CompactionConfigCompiler implements AppConfigCompiler
{
    compile(config: AppConfig, args: WombatArgs): AppPackage {
        if (!args.compaction)
            return { config };

        /* Unset keys are left out of the YAML, so the app's defaults apply to them */
        config.persistence = config.persistence || {};
        config.persistence.compaction = args.compaction;
        return { config };
    }
}
