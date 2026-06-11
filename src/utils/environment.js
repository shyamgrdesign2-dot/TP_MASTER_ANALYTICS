export const ZY_PREPROD_ENV = "zy-preprod";
export const ZY_PROD_ENV = "zy-prod";
export const PROD_ENV = "prod";
export const PRODUCTION_ENVIRONMENTS = [PROD_ENV, ZY_PREPROD_ENV, ZY_PROD_ENV];
export const ZY_PROD_ENVIRONMENTS = [ZY_PREPROD_ENV, ZY_PROD_ENV];

export const isProductionEnv = (env = process.env.REACT_APP_ENV) =>
  PRODUCTION_ENVIRONMENTS.includes(env);

export const isZyPreprodOrZyProdEnv = (env = process.env.REACT_APP_ENV) =>
  ZY_PROD_ENVIRONMENTS.includes(env);
