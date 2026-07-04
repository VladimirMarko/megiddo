export const apiGatewayRpcMountPath = '/rpc'

export const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${apiGatewayRpcMountPath}`
