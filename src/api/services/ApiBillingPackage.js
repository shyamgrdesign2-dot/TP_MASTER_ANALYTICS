import api from "./axiosService";
import config from '../../config';

const baseUrl = { customBaseUrl: config.lab_params_api_url };

const ApiBillingPackage = {};

ApiBillingPackage.addPackage = function (packageData) {
  return api.post(`/api/v1/billing/billPackage`, packageData, baseUrl);
};

ApiBillingPackage.updatePackage = function (packageData) {
  return api.post(`/api/v1/billing/billPackage`, packageData, baseUrl);
};

ApiBillingPackage.deletePackage = function (packageId) {
  return api.delete(`/api/v1/billing/billPackage/${packageId}`, baseUrl);
};

ApiBillingPackage.getBillingPackages = function () {
  return api.get(`/api/v1/billing/billPackage`, baseUrl);
};

ApiBillingPackage.getPackageDetails = function (packageId) {
  return api.get(`/api/v1/billing/billPackage/${packageId}`, baseUrl);
};

export default ApiBillingPackage;

