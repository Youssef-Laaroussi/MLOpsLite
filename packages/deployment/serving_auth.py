"""Private API-to-container credentials, never serialized to workspace clients."""

import secrets

TOKEN_KEY = "_mlite_serving_token"


def serving_configuration(configuration=None):
    public = {key: value for key, value in (configuration or {}).items() if not key.startswith("_mlite_")}
    return {**public, TOKEN_KEY: secrets.token_urlsafe(32)}


def serving_headers(configuration):
    token = (configuration or {}).get(TOKEN_KEY)
    return {"X-MLite-Serving-Token": token} if token else {}
