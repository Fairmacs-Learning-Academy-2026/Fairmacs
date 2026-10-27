
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api";

const TOKEN_KEY = "fairmacs_token";

export const getZohoConnectUrl = async () => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error("Please log in to Fairmacs KMS first.");
  }

  const response = await fetch(
    `${API_BASE_URL}/integrations/zoho/connect-url`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
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
