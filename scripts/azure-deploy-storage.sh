#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AdventureWorks AI Sales Intelligence - Storage Account deployment
# Creates the Resource Group, Storage Account and the feedback-incoming queue
# that the EnrichFeedbackQueueTrigger function reads from.
# =============================================================================

# ===== Variables (edit as needed) ============================================
RESOURCE_GROUP="rg-aw-ai-dev"
LOCATION="centralus"
STORAGE_ACCOUNT="stawaiidev"          # must be globally unique, lowercase, 3-24 chars
QUEUE_NAME="feedback-incoming"
SKU="Standard_LRS"

# ===== Resource Group ========================================================
echo "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --query "properties.provisioningState" \
  --output tsv

# ===== Storage Account =======================================================
echo "Creating storage account '$STORAGE_ACCOUNT'..."
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku "$SKU" \
  --kind "StorageV2" \
  --min-tls-version "TLS1_2" \
  --allow-blob-public-access false \
  --query "provisioningState" \
  --output tsv

# ===== Connection string =====================================================
echo "Retrieving connection string..."
CONNECTION_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "connectionString" \
  --output tsv)

# ===== Queue =================================================================
echo "Creating queue '$QUEUE_NAME'..."
az storage queue create \
  --name "$QUEUE_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --connection-string "$CONNECTION_STRING" \
  --query "created" \
  --output tsv || true

# ===== Output ================================================================
echo ""
echo "=============================================================================="
echo "Storage Account deployed successfully"
echo "=============================================================================="
echo "Resource Group:    $RESOURCE_GROUP"
echo "Location:          $LOCATION"
echo "Storage Account:   $STORAGE_ACCOUNT"
echo "Queue:             $QUEUE_NAME"
echo ""
echo "Connection string (set as AzureWebJobsStorage in local.settings.json / Function App settings):"
echo "$CONNECTION_STRING"
echo "=============================================================================="
