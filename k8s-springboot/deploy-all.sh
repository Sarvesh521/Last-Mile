#!/bin/bash

kubectl apply -f mongodb.yaml
kubectl apply -f redis.yaml
kubectl apply -f station-service.yaml
kubectl apply -f user-service.yaml
kubectl apply -f driver-service.yaml
kubectl apply -f rider-service.yaml
kubectl apply -f location-service.yaml
kubectl apply -f trip-service.yaml
kubectl apply -f notification-service.yaml
kubectl apply -f matching-service.yaml

echo "All services deployed. To scale matching service to 5 replicas:"
echo "kubectl apply -f matching-service-scaled.yaml"

