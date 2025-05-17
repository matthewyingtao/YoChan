import "dotenv/config";
import path from "path";

export const config = {
	PORT: process.env.PORT || 3000,
	API_KEY: process.env.API_KEY,
	UPLOADS_DIR: path.join(__dirname, "..", "uploads"),
};

if (!config.API_KEY) {
	throw new Error("API_KEY is not set in the environment variables");
}
