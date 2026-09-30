import * as k8s from "@pulumi/kubernetes";
import {WombatNativeConfig} from "./wombat-args";
import {ContainerDependency, DependencyMode, ExternalDependency, WombatDependencyConfig} from "./dependencies-args";

const BOAVIZTAPI_PORT: number = 5001;
const ECOLOGITS_PORT: number = 5002;

/**
 * Tweaks the Quarkus application configuration based on the WombatDependencyConfig.
 */
export function applyDependenciesConfig(config: WombatNativeConfig, depConfig: WombatDependencyConfig): WombatNativeConfig {
    config.connector = config.connector || {};

    config.connector.boavizta = config.connector.boavizta || {};
    switch (depConfig.boaviztapi.type) {
        case DependencyMode.EXTERNAL:
            config.connector.boavizta.uri = (depConfig.boaviztapi as ExternalDependency).endpoint;
            break;
        case DependencyMode.CONTAINER:
            config.connector.boavizta.uri = `http://localhost:${BOAVIZTAPI_PORT}/v1/`;
            break;
    }

    config.connector.ecologits = config.connector.ecologits || {};
    switch (depConfig.ecologits.type) {
        case DependencyMode.EXTERNAL:
            config.connector.ecologits.uri = (depConfig.ecologits as ExternalDependency).endpoint;
            break;
        case DependencyMode.CONTAINER:
            config.connector.ecologits.uri = `http://localhost:${ECOLOGITS_PORT}/`;
            break;
    }

    return config;
}

export function createDependencyContainers(depConfig: WombatDependencyConfig): k8s.types.input.core.v1.Container[] {
    const containers: k8s.types.input.core.v1.Container[] = [];
    if (depConfig.boaviztapi.type == DependencyMode.CONTAINER) {
        const containerConfig: ContainerDependency = depConfig.boaviztapi as ContainerDependency;
        containers.push({
            name: "boaviztapi",
            image: computeImageName(containerConfig, "ghcr.io/boavizta/boaviztapi", "2.4.1"),
            ports: [{ containerPort: BOAVIZTAPI_PORT, name: "boaviztapi" }],
            args: [
                "uvicorn", "boaviztapi.main:app",
                "--host", "0.0.0.0",
                "--port", `${BOAVIZTAPI_PORT}`
            ]
        });
    }
    if (depConfig.ecologits.type == DependencyMode.CONTAINER) {
        const containerConfig: ContainerDependency = depConfig.ecologits as ContainerDependency;
        containers.push({
            name: "ecologits",
            image: computeImageName(containerConfig, "ghcr.io/mlco2/ecologits-api", "0.0.2"),
            ports: [{ containerPort: ECOLOGITS_PORT, name: "ecologits" }],
            args: [
                "/app/.venv/bin/fastapi",
                "run", "app/main.py",
                "--port", `${ECOLOGITS_PORT}`,
                "--host", "0.0.0.0"
            ]
        });
    }
    return containers;
}

function computeImageName(config: ContainerDependency, defaultName: string, defaultTag: string): string {
    const imageName: string = config.imageOverride?.toString() || defaultName;
    const imageTag: string = config.tagOverride?.toString() || defaultTag;
    return `${imageName}:${imageTag}`;
}