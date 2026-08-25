targetScope = 'resourceGroup'

metadata name = 'Ingestron Profile J asynchronous workbook jobs'
metadata description = 'Temporary-proof and persistent-demo Entra-gated API with a scale-to-zero worker.'

param location string = resourceGroup().location
@minLength(6)
@maxLength(12)
param resourceSuffix string
param workerImage string
@minLength(1)
param jobsPackageVersion string
@minLength(64)
@maxLength(64)
param jobsPackageSha256 string
@minLength(36)
@maxLength(36)
param entraTenantId string
@minLength(36)
@maxLength(36)
param entraApplicationClientId string
@minLength(1)
param allowedClientApplicationIds array
@description('Object ID of the ADF system identity allowed to read synthetic source objects and write governed package objects.')
@minLength(36)
@maxLength(36)
param pipelineCallerPrincipalId string
@allowed([
  'temporary-proof'
  'persistent-demo'
])
param deploymentMode string = 'temporary-proof'
@allowed([
  'disabled'
  'entra-public'
])
param apiIngressMode string = 'disabled'
param virtualNetworkAddressPrefix string = '10.43.0.0/23'
param privateEndpointSubnetPrefix string = '10.43.0.0/28'
param tags object = {}
@allowed([50])
param monthlyCostCeilingUsd int = 50

var stem = 'ing-j-${resourceSuffix}'
var storageName = 'ingj${resourceSuffix}'
var queueName = 'jobs'
var functionPackageContainerName = 'function-package'
var functionPackageBlobName = 'sha256/${jobsPackageSha256}.zip'
var privateDnsZoneName = 'privatelink.azurewebsites.net'
var registryName = 'ingjcr${resourceSuffix}'
var imageIdentityName = 'id-ing-j-${resourceSuffix}'
var profileTag = deploymentMode == 'persistent-demo' ? 'profile-j-demo' : 'profile-j'
var requiredTags = union(tags, {
  'ingestron:programme': 'ingestron'
  'ingestron:profile': profileTag
  'ingestron:lifecycle': deploymentMode
  'ingestron:managed-by': 'bicep'
  'ingestron:jobs-version': jobsPackageVersion
  'ingestron:jobs-sha256': jobsPackageSha256
  'ingestron:monthly-cost-ceiling-usd': string(monthlyCostCeilingUsd)
})
var blobContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var queueContributorRoleId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
var tableContributorRoleId = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var blobOwnerRoleId = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
var blobReaderRoleId = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource imageIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: imageIdentityName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  tags: requiredTags
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 1 }
    containerDeleteRetentionPolicy: { enabled: true, days: 1 }
  }
}

resource containers 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = [
  for name in ['source', 'packages', 'workspace']: {
    parent: blobService
    name: name
    properties: { publicAccess: 'None' }
  }
]

resource functionPackageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: functionPackageContainerName
  properties: { publicAccess: 'None' }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource queue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  parent: queueService
  name: queueName
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource statusTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'JobStatus'
}

resource connectionsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'Connections'
}

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2024-05-01' = if (apiIngressMode == 'disabled') {
  name: 'vnet-${stem}'
  location: location
  tags: requiredTags
  properties: {
    addressSpace: { addressPrefixes: [virtualNetworkAddressPrefix] }
    subnets: [
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = if (apiIngressMode == 'disabled') {
  name: privateDnsZoneName
  location: 'global'
  tags: requiredTags
}

resource privateDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = if (apiIngressMode == 'disabled') {
  parent: privateDnsZone
  name: 'link-${stem}'
  location: 'global'
  tags: requiredTags
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: virtualNetwork.id }
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'plan-${stem}'
  location: location
  kind: 'functionapp'
  tags: requiredTags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
    zoneRedundant: false
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: 'func-${stem}'
  location: location
  kind: 'functionapp,linux'
  tags: requiredTags
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    publicNetworkAccess: apiIngressMode == 'disabled' ? 'Disabled' : 'Enabled'
    siteConfig: {
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'INGESTRON_STORAGE_ACCOUNT', value: storage.name }
        { name: 'INGESTRON_JOB_QUEUE', value: queue.name }
        { name: 'INGESTRON_STATUS_TABLE', value: statusTable.name }
        { name: 'INGESTRON_CONNECTIONS_TABLE', value: connectionsTable.name }
        { name: 'INGESTRON_CUSTOMER_TENANT_ID', value: entraTenantId }
        { name: 'INGESTRON_ENVIRONMENT_ID', value: deploymentMode }
        { name: 'INGESTRON_JOBS_VERSION', value: jobsPackageVersion }
        { name: 'INGESTRON_JOBS_SHA256', value: jobsPackageSha256 }
        { name: 'INGESTRON_JOBS_PACKAGE_BLOB', value: functionPackageBlobName }
      ]
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${functionPackageContainer.name}'
          authentication: { type: 'SystemAssignedIdentity' }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 2
        instanceMemoryMB: 2048
        triggers: { http: { perInstanceConcurrency: 4 } }
      }
      runtime: {
        name: 'node'
        version: '22'
      }
    }
  }
}

resource functionAuthentication 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: functionApp
  name: 'authsettingsV2'
  properties: {
    platform: { enabled: true, runtimeVersion: '~1' }
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'Return401'
      redirectToProvider: 'azureActiveDirectory'
    }
    httpSettings: {
      requireHttps: true
      routes: { apiPrefix: '/.auth' }
      forwardProxy: { convention: 'NoProxy' }
    }
    login: {
      tokenStore: { enabled: false }
      preserveUrlFragmentsForLogins: false
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraApplicationClientId
          openIdIssuer: '${az.environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: ['api://${entraApplicationClientId}']
          defaultAuthorizationPolicy: { allowedApplications: allowedClientApplicationIds }
        }
      }
    }
  }
}

resource functionPrivateEndpoint 'Microsoft.Network/privateEndpoints@2024-05-01' = if (apiIngressMode == 'disabled') {
  name: 'pep-${stem}'
  location: location
  tags: requiredTags
  properties: {
    subnet: {
      id: resourceId('Microsoft.Network/virtualNetworks/subnets', virtualNetwork.name, 'private-endpoints')
    }
    privateLinkServiceConnections: [
      {
        name: 'function-app'
        properties: {
          privateLinkServiceId: functionApp.id
          groupIds: ['sites']
        }
      }
    ]
  }
}

resource functionPrivateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = if (apiIngressMode == 'disabled') {
  parent: functionPrivateEndpoint
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'functions'
        properties: { privateDnsZoneId: privateDnsZone.id }
      }
    ]
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${stem}'
  location: location
  tags: requiredTags
  properties: {}
}

resource job 'Microsoft.App/jobs@2026-01-01' = {
  name: 'job-${stem}'
  location: location
  tags: requiredTags
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: { '${imageIdentity.id}': {} }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      triggerType: 'Event'
      replicaTimeout: 180
      replicaRetryLimit: 1
      registries: [
        {
          server: registry.properties.loginServer
          identity: imageIdentity.id
        }
      ]
      eventTriggerConfig: {
        replicaCompletionCount: 1
        parallelism: 1
        scale: {
          minExecutions: 0
          maxExecutions: 1
          pollingInterval: 30
          rules: [
            {
              name: 'job-queue'
              type: 'azure-queue'
              metadata: {
                accountName: storage.name
                queueName: queue.name
                queueLength: '1'
              }
              identity: 'system'
            }
          ]
        }
      }
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'INGESTRON_JOB_QUEUE', value: queueName }
            { name: 'INGESTRON_STORAGE_ACCOUNT', value: storage.name }
            { name: 'INGESTRON_STATUS_TABLE', value: statusTable.name }
          ]
        }
      ]
    }
  }
}

resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, job.id, blobContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobContributorRoleId)
    principalId: job.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource queueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, job.id, queueContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', queueContributorRoleId)
    principalId: job.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource tableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, job.id, tableContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', tableContributorRoleId)
    principalId: job.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.id, blobOwnerRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobOwnerRoleId)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.id, queueContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', queueContributorRoleId)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionTableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.id, tableContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', tableContributorRoleId)
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource pipelineSourceReaderRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containers[0].id, pipelineCallerPrincipalId, blobReaderRoleId)
  scope: containers[0]
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobReaderRoleId)
    principalId: pipelineCallerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource pipelinePackageContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containers[1].id, pipelineCallerPrincipalId, blobContributorRoleId)
  scope: containers[1]
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobContributorRoleId)
    principalId: pipelineCallerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output profile string = 'profile-j'
output deploymentMode string = deploymentMode
output resources object = {
  storageAccount: storage.name
  queue: queue.name
  statusTable: statusTable.name
  connectionsTable: connectionsTable.name
  environment: environment.name
  job: job.name
  functionApp: functionApp.name
  ingressMode: apiIngressMode
  privateEndpoint: apiIngressMode == 'disabled' ? functionPrivateEndpoint.name : ''
}
output jobsPackage object = {
  version: jobsPackageVersion
  sha256: jobsPackageSha256
  container: functionPackageContainer.name
  blob: functionPackageBlobName
}
output integration object = {
  endpoint: 'https://${functionApp.properties.defaultHostName}'
  audience: 'api://${entraApplicationClientId}'
  tenantId: entraTenantId
  storageAccount: storage.name
  sourceContainer: containers[0].name
  packageContainer: containers[1].name
}
