"""Secure legacy serving containers during an installation upgrade."""

import asyncio
import logging

import httpx
from sqlalchemy import select

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.deployment.docker_manager import DockerManager, serving_environment
from packages.deployment.serving_auth import TOKEN_KEY, serving_configuration, serving_headers
from packages.registry.service import ModelRegistryService

logger = logging.getLogger(__name__)


async def secure_running_deployments(session_factory):
    docker = DockerManager()
    async with session_factory.begin() as session:
        deployments = list((await session.scalars(select(Deployment).where(
            Deployment.status == DeploymentStatus.RUNNING,
        ))).all())
        if not deployments:
            return
        if not docker.is_available:
            raise RuntimeError("Docker must be reachable to secure existing inference endpoints.")
        for deployment in deployments:
            try:
                container = docker.client.containers.get(deployment.container_id)
                bindings = container.attrs.get("HostConfig", {}).get("PortBindings", {})
                local = all(binding.get("HostIp") == "127.0.0.1" for port in bindings.values() for binding in (port or []))
                token = (deployment.config or {}).get(TOKEN_KEY)
                if container.image.labels.get("org.mlite.serving-auth") == "1" and token and local:
                    continue
            except Exception:
                pass
            if deployment.container_id and not docker.stop_container(deployment.container_id):
                raise RuntimeError("Could not close a legacy inference endpoint. Check the Docker daemon.")
            registry = ModelRegistryService(session)
            model = await registry.get_model_by_name(deployment.model_name)
            version = await registry.get_version(deployment.model_name, deployment.model_version)
            if not deployment.owner_id or model is None or model.owner_id != deployment.owner_id or version is None:
                deployment.status = DeploymentStatus.STOPPED
                deployment.error_message = "Assign this legacy resource to an established owner before redeploying."
                continue
            try:
                configuration = serving_configuration(deployment.config)
                info = docker.run_inference_container(
                    model_name=deployment.model_name, model_version=deployment.model_version,
                    host_port=deployment.port, environment=serving_environment(version, configuration[TOKEN_KEY]),
                )
                deployment.container_id = info["container_id"]
                deployment.config = configuration
                name = info["name"]
                async with httpx.AsyncClient(timeout=2) as client:
                    for _ in range(30):
                        try:
                            response = await client.get(f"http://{name}:8000/metadata", headers=serving_headers(configuration))
                            if response.status_code == 200:
                                break
                        except httpx.HTTPError:
                            pass
                        await asyncio.sleep(1)
                    else:
                        raise RuntimeError("The protected inference container did not become ready.")
                deployment.error_message = None
                logger.info("Protected legacy deployment %s without changing its owner or port", deployment.id)
            except Exception:
                if deployment.container_id:
                    docker.stop_container(deployment.container_id)
                deployment.status = DeploymentStatus.STOPPED
                deployment.error_message = "Rebuild mlite-serving and redeploy to enable authenticated inference."
                logger.exception("Legacy deployment %s remains stopped until its serving image is upgraded", deployment.id)
