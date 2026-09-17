import * as pulumi from "@pulumi/pulumi";

export enum PersistenceMode {
    SQLITE_TRANSIENT = "SQLITE_TRANSIENT",
    SQLITE_WITH_BACKUP = "SQLITE_WITH_BACKUP",
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

export type PersistenceProfile = SqliteTransient | SqliteWithBackup;
