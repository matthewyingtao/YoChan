import "dotenv/config";

export const config = {
	PORT: process.env.PORT || 3000,
	API_KEY: process.env.API_KEY,
};

if (!config.API_KEY) {
	throw new Error("API_KEY is not set in the environment variables");
}
