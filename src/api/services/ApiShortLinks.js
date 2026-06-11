import api from "./axiosService";
import config from "../../config";

const baseUrl = {
  customBaseUrl: config.short_links_api_url,
  headers: {
    "X-API-KEY": config.short_links_api_key,
  },
};

const ApiShortLinks = {};

ApiShortLinks.createShortLink = function (url) {
  return api.post(`/api/v2/links`, { target: url }, baseUrl);
};

export default ApiShortLinks;
