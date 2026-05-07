#!/bin/bash
# ── deploy-k8s.sh ───────────────────────────────────────────────
# Run this script to deploy everything to Kubernetes in one shot
# Usage: bash deploy-k8s.sh

set -e

echo "🚀 Deploying StudyVault to Kubernetes..."

# Step 1 — Create namespace
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yml

# Step 2 — Apply secrets
echo "🔐 Applying secrets..."
kubectl apply -f k8s/secret.yml

# Step 3 — Create persistent volume
echo "💾 Creating persistent volume..."
kubectl apply -f k8s/pvc.yml

# Step 4 — Deploy backend
echo "⚙️  Deploying backend..."
kubectl apply -f k8s/backend.yml

# Step 5 — Deploy frontend
echo "🌐 Deploying frontend..."
kubectl apply -f k8s/frontend.yml

# Step 6 — Apply ingress
echo "🔀 Applying ingress..."
kubectl apply -f k8s/ingress.yml

# Step 7 — Apply autoscalers
echo "📈 Applying autoscalers..."
kubectl apply -f k8s/hpa.yml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check status:"
echo "   kubectl get all -n studyvault"
echo ""
echo "🌍 Get external IP:"
echo "   kubectl get ingress -n studyvault"