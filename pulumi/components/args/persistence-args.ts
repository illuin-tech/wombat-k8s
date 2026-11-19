import * as pulumi from "@pulumi/pulumi";

export enum PersistenceMode {
    SQLITE_TRANSIENT = "SQLITE_TRANSIENT",
    SQLITE_WITH_BACKUP = "SQLITE_WITH_BACKUP",
    POSTGRESQL = "POSTGRESQL",
}

export enum PersistenceBackendMode {
    SQLITE = "sqlite",
    POSTGRESQL = "postgresql",
}

interface PersistenceProfileBase {
    type: PersistenceMode
}

export interface SqliteTransient extends PersistenceProfileBase {
    type: PersistenceMode.SQLITE_TRANSIENT
}

export interface SqliteWithBackup extends PersistenceProfileBase {
    type: PersistenceMode.SQLITE_WITH_BACKUP
    backup: {
        cron: pulumi.Input<string>;
        restoreOnStartup: pulumi.Input<boolean>;
        s3: {
            endpoint: pulumi.Input<string>;
            bucket: pulumi.Input<string>;
            region?: pulumi.Input<string>;
            keyPrefix?: pulumi.Input<string>;
            accessKey: pulumi.Input<string>;
            secretKey: pulumi.Input<string>;
        };
        cleanup?: {
            cron: pulumi.Input<string>;
            retainLast: pulumi.Input<number>;
        }
    };
}

export interface PostgreSql extends PersistenceProfileBase {
    type: PersistenceMode.POSTGRESQL;
    host: pulumi.Input<string>;
    databaseName: pulumi.Input<string>;
    username: pulumi.Input<string>;
    password: pulumi.Input<string>;
}

export type PersistenceProfile = SqliteTransient | SqliteWithBackup | PostgreSql;

export interface CompactionConfig {
    cron: pulumi.Input<string>;
    window: pulumi.Input<string>;
    delay: pulumi.Input<string>;
}
