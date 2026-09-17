import * as k8s from "@pulumi/kubernetes";
import {WombatNativeConfig} from "./wombat-args";
import {ContainerDependency, DependencyMode, ExternalDependency, WombatDependencyConfig} from "./dependencies-args";

const BOAVIZTAPI_PORT: number = 5001;
const ECOLOGITS_PORT: number = 5002;

/**
 * Tweaks the Quarkus application configuration based on the WombatDependencyConfig.
 */
export function applyDependenciesConfig(config: WombatNativeConfig, depConfig: WombatDependencyConfig): WombatNativeConfig {
    config.quarkus = config.quarkus || {};
    config.quarkus.restClient = config.quarkus.restClient || {};

    config.quarkus.restClient.boaviztaApiUrl = config.quarkus.restClient.boaviztaApiUrl || {};
    switch (depConfig.boaviztapi.type) {
        case DependencyMode.EXTERNAL:
            config.quarkus.restClient.boaviztaApiUrl.uri = (depConfig.boaviztapi as ExternalDependency).endpoint;
            break;
        case DependencyMode.CONTAINER:
            config.quarkus.restClient.boaviztaApiUrl.uri = `http://localhost:${BOAVIZTAPI_PORT}/v1/`;
            break;
    }

    config.quarkus.restClient.ecologitsApiUrl = config.quarkus.restClient.ecologitsApiUrl || {};
    switch (depConfig.ecologits.type) {
        case DependencyMode.EXTERNAL:
            config.quarkus.restClient.ecologitsApiUrl.uri = (depConfig.ecologits as ExternalDependency).endpoint;
            break;
        case DependencyMode.CONTAINER:
            config.quarkus.restClient.ecologitsApiUrl.uri = `http://localhost:${ECOLOGITS_PORT}/`;
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
            image: computeImageName(containerConfig, "ghcr.io/boavizta/boaviztapi", "2.3.0"),
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