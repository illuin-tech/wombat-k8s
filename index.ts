import * as pulumi from "@pulumi/pulumi";
import { WombatResource } from "./components/wombat";
import { WombatArgs } from "./components/args/wombat-args";

const config = new pulumi.Config();
const serviceArgs: WombatArgs = config.requireObject<WombatArgs>("service");

new WombatResource("wombat", serviceArgs);
