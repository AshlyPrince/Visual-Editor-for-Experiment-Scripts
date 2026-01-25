#!/bin/bash
# Export the realm configuration from running Keycloak container

echo "Exporting myrealm from Keycloak..."

docker exec visual_editor_backend-keycloak-1 \
  /opt/keycloak/bin/kc.sh export \
  --dir /tmp \
  --realm myrealm

echo "Copying exported realm to local machine..."

docker cp visual_editor_backend-keycloak-1:/tmp/myrealm-realm.json ./keycloak/myrealm-import.json

echo "✅ Realm exported successfully to keycloak/myrealm-import.json"
