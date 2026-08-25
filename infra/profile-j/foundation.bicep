targetScope = 'subscription'

metadata name = 'Ingestron Profile J customer-managed foundation'
metadata description = 'Exact resource-group and private registry foundation for a CLI-orchestrated Profile J installation.'

@minLength(1)
param resourceGroupName string
param location string
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

var profileTag = deploymentMode == 'persistent-demo' ? 'profile-j-demo' : 'profile-j'
var requiredTags = union(tags, {
  'ingestron:programme': 'ingestron'
  'ingestron:profile': profileTag
  'ingestron:lifecycle': deploymentMode
  'ingestron:managed-by': 'bicep'
  'ingestron:monthly-cost-ceiling-usd': string(monthlyCostCeilingUsd)
})

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: requiredTags
}

module registry 'registry.bicep' = {
  name: 'ingestron-profile-j-foundation'
  scope: resourceGroup
  params: {
    location: location
    resourceSuffix: resourceSuffix
    deploymentMode: deploymentMode
    tags: tags
    monthlyCostCeilingUsd: monthlyCostCeilingUsd
  }
}

output resourceGroupId string = resourceGroup.id
output resourceGroupName string = resourceGroup.name
output registryName string = registry.outputs.registryName
output registryServer string = registry.outputs.registryServer
output imageIdentityName string = registry.outputs.imageIdentityName
output deploymentMode string = deploymentMode
