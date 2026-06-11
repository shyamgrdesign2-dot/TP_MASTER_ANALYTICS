import {PERSISTANT_STORAGE_KEY_AUTH_TOKEN} from "../utils/constants";
import { jwtDecode } from "jwt-decode";

export function useLocalStorage(key) {
  const getValue = () => localStorage.getItem(key) == null ? null: JSON.parse(localStorage.getItem(key));
  const setValue = (value) => localStorage.setItem(key, JSON.stringify(value));

  return [getValue, setValue];
}

export function clearLocalStorage() {
  localStorage.clear();
}

export const getDecodedToken = () => {
  let token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  token = token ? JSON.parse(token) : null;
  return token ? jwtDecode(token) : null;
}