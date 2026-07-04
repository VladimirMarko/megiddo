export const apiGatewayRpcMountPath = '/rpc'
export const todoRpcMountPath = '/rpc'

export const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${apiGatewayRpcMountPath}`
export const todoRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${todoRpcMountPath}`
