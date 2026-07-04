# Route Browser Auth Through API Gateway

Browser-facing auth flows go through the API Gateway so the frontend has one backend boundary. If Better Auth requires browser callback routes that cannot reasonably be handled by the gateway, those routes may be explicitly delegated to Identity as a documented exception rather than becoming the default frontend integration path.
