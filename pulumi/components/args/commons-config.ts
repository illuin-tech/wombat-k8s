import {AppConfig} from "./wombat-args";
import {ConfGroup, kebabize} from "../utils/tools";
import * as pulumi from "@pulumi/pulumi";
import * as yaml from "yaml";

export function createOverrideConf(args: AppConfig): ConfGroup {
    return new ConfGroup(
        "/deployments/config",
        "application-conf",
        [{
            id: "application-conf",
            filename: "application.yaml",
            data: pulumi.secret(pulumi.output(args).apply(config => yaml.stringify(kebabize(config)))),
        }]
    );
}
