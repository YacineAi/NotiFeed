const axios = require("axios");

function formatBytes(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes === 0)
    return "0 Byte";

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
};

async function pingURL(url) {
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      return `Ping to ${url} successful`;
    } else {
      throw new Error(`Ping to ${url} failed with status code: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Ping to ${url} failed: ${error.message}`);
  }
}

module.exports = { formatBytes, pingURL };