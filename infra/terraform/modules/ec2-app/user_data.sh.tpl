#!/bin/bash
# User-data stub for the pilot EC2 instance.
#
# Installs Docker + the Docker Compose plugin, the AWS CLI v2 (the deploy
# pipeline's SSM step runs `aws s3 sync` on the instance to stage deploy
# assets — without this, that step fails with "aws: not found"), and ensures
# the SSM agent (preinstalled on most current Ubuntu/Amazon Linux AMIs, but
# ensured here anyway) is running so the instance can be managed via Session
# Manager instead of SSH keys. Actual application deployment (docker compose
# up for nginx/fastapi/postgres+postgis/redis/celery) is handled by the
# deploy pipeline, not by user_data — this is intentionally just bootstrap,
# so re-provisioning doesn't fight a CI deploy.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl gnupg unzip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu || true

# AWS CLI v2 — required on-instance by the deploy pipeline's SSM step
# (`aws s3 sync` staging the compose file / nginx conf / rendered env file
# into /opt/${app_name}). Not preinstalled on the stock Ubuntu AMI.
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
unzip -o -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# SSM agent ships preinstalled on the Canonical Ubuntu AMIs used here; this is
# a defensive no-op restart so the instance is manageable via Session Manager
# from boot.
systemctl enable amazon-ssm-agent || true
systemctl restart amazon-ssm-agent || true

mkdir -p /opt/${app_name}
echo "bootstrap complete" > /opt/${app_name}/bootstrap.done
