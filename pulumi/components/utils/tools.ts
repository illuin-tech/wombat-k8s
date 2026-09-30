import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface JVMOptions {
    xmx?: string;
    xms?: string;
}

export interface Conf {
    id: string;
    filename: string;
    data: string;
}

export class ConfGroup {
    path: string;
    volumeName: string;
    confs: Conf[];

    constructor(path: string, volumeName: string, confs: Conf[])
    {
        this.path = path;
        this.volumeName = volumeName;
        this.confs = confs;
    }

    asFileList(): string[] {
        return this.confs.map(c => {
            return `${this.path}/${c.filename}`;
        })
    }

    asConfigMapArgs(namespace: pulumi.Input<string>, labels: {[key: string]: string}): k8s.core.v1.ConfigMapArgs {
        let data: {[key: string]: string} = this.confs.reduce((acc: {[key: string]: string}, conf: Conf) => {
            acc[conf.filename] = conf.data;
            return acc;
        }, {});

        return {
            metadata: {
                namespace: namespace,
                labels: labels,
            },
            data: data,
        }
    }

    asSecretArgs(namespace: pulumi.Input<string>, labels: {[key: string]: string}): k8s.core.v1.SecretArgs {
        let data: {[key: string]: string} = this.confs.reduce((acc: {[key: string]: string}, conf: Conf) => {
            acc[conf.filename] = conf.data;
            return acc;
        }, {});

        return {
            metadata: {
                namespace: namespace,
                labels: labels,
            },
            stringData: data,
        }
    }
}

export function kebabize(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(kebabize);
    }
    else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]: [string, any]) => {
                const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                return [kebabKey, kebabize(value)];
            })
        );
    }
    return obj;
}

export function createJVMString(options: JVMOptions): string {
    let optArray: string[] = [];
    if (options.xms)
        optArray.push(`-Xms${options.xms}`);
    if (options.xmx)
        optArray.push(`-Xmx${options.xmx}`);
    return optArray.join(' ');
}
