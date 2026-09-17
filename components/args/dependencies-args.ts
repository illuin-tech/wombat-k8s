import * as pulumi from "@pulumi/pulumi";

export enum DependencyMode {
    EXTERNAL = "EXTERNAL",
    CONTAINER = "CONTAINER",
}

interface DependencyBase {
    type: DependencyMode
}

export interface ExternalDependency extends DependencyBase {
    type: DependencyMode.EXTERNAL;
    endpoint: pulumi.Input<string>;
}

export interface ContainerDependency extends DependencyBase {
    type: DependencyMode.CONTAINER;
    imageOverride?: pulumi.Input<string>;
    tagOverride?: pulumi.Input<string>;
}

export type WombatDependency = ExternalDependency | ContainerDependency;

export interface WombatDependencyConfig {
    boaviztapi: WombatDependency;
    ecologits: WombatDependency;
}
