
import {
  API_BASE_URL,
  getAuthToken,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig';

export const getZohoConnectUrl = async () => {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in to Fairmacs KMS first.");
  }

  const response = await fetch(
    `${API_BASE_URL}/integrations/zoho/connect-url`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized(false);
      throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error(
        "Access denied. Please sign in with an HR Admin account."
      );
    }

    throw new Error(
      `Unable to connect to Zoho (HTTP ${response.status}).`
    );
  }

  const data = await response.json();

  if (!data.authorizationUrl) {
    throw new Error("Zoho authorization URL was not returned.");
  }

  return data.authorizationUrl;
};
