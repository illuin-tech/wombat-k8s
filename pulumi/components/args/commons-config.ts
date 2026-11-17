import {AppConfig} from "./wombat-args";
import {ConfGroup, kebabize} from "../utils/tools";
import * as yaml from "yaml";

export function createOverrideConf(args: AppConfig): ConfGroup {
    return new ConfGroup(
        "/conf",
        "application-conf",
        [{
            id: "application-conf",
            filename: "application-dynamic.yaml",
            data: yaml.stringify(kebabize(args)),
        }]
    );
}
