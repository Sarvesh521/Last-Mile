# Ansible Deployment for Local Minikube

This setup distributes the 'Last-Mile' application to a local **Minikube** cluster using Ansible Roles and Vaults.

## Setup Instructions

1.  **Ensure Minikube is Running**
    ```bash
    minikube start
    ```

2.  **Deploy the Application**
    ```bash
    cd ansible
    ansible-playbook deploy.yml
    ```
    This will:
    - Build all Docker images.
    - Generate Protobuf configs.
    - Deploy Microservices & Ingress.
    - Restart existing pods to pick up changes (Zero-downtime strategy).

## How to Access (Ingress)
The application is exposed via an **Ingress** controller on the hostname `lastmile.local`.

1.  **Get Minikube IP**:
    ```bash
    minikube ip
    ```
2.  **Update Hostfile**:
    Add the following line to your `/etc/hosts` file (replace `<MINIKUBE_IP>` with the actual IP):
    ```
    <MINIKUBE_IP>  lastmile.local
    ```
    *Example: `192.168.49.2  lastmile.local`*

3.  **Open in Browser**:
    - Frontend: http://lastmile.local
    - Gateway API: http://lastmile.local/api

## Zero-Downtime Updates
The playbook uses `kubectl rollout restart` to update the application.
- **Mechanism**: Kubernetes starts new pods with the new image. It only terminates the old pods once the new ones are running.
- **Tip**: For production-grade zero downtime (no connection drops), ensure your `Deployment` YAMLs have `readinessProbe` configured. This ensures K8s waits for the app to fully initialize before routing traffic.
