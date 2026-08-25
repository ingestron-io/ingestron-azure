targetScope = 'resourceGroup'

metadata name = 'Ingestron Profile J private worker registry'
metadata description = 'Private image bootstrap for a temporary proof or maintained demo profile.'

param location string = resourceGroup().location
@minLength(6)
@maxLength(12)
param resourceSuffix string
@allowed([
  'temporary-proof'
  'persistent-demo'
])
param deploymentMode string = 'temporary-proof'
param tags object = {}
@allowed([50])
param monthlyCostCeilingUsd int = 50

var registryName = 'ingjcr${resourceSuffix}'
var imageIdentityName = 'id-ing-j-${resourceSuffix}'
var profileTag = deploymentMode == 'persistent-demo' ? 'profile-j-demo' : 'profile-j'
var requiredTags = union(tags, {
  'ingestron:programme': 'ingestron'
  'ingestron:profile': profileTag
  'ingestron:lifecycle': deploymentMode
  'ingestron:managed-by': 'bicep'
  'ingestron:monthly-cost-ceiling-usd': string(monthlyCostCeilingUsd)
})
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: { name: 'Basic' }
  tags: requiredTags
  properties: {
    adminUserEnabled: false
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
  }
}

resource imageIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: imageIdentityName
  location: location
  tags: requiredTags
}

resource pullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, imageIdentity.id, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: imageIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output registryName string = registry.name
output registryServer string = registry.properties.loginServer
output imageIdentityName string = imageIdentity.name
output deploymentMode string = deploymentMode
