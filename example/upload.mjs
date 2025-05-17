import "dotenv/config";
import { openAsBlob } from "node:fs";

const options = {
	filePath: "./example.png",
	thumbnail: { use: true, value: 300 },
	asJpeg: { use: true, value: 80 },
	asWebp: { use: false, value: 80 },
};

const blob = await openAsBlob(options.filePath);

const formData = new FormData();
formData.append("file", blob);

const queryParams = new URLSearchParams();

if (options.thumbnail.use)
	queryParams.append("thumbnail", options.thumbnail.value);
if (options.asJpeg.use) queryParams.append("asJpeg", options.asJpeg.value);
if (options.asWebp.use) queryParams.append("asWebp", options.asWebp.value);

queryParams.append("key", "your_api_key_here"); // Replace with your actual API key
queryParams.append("purpose", "food"); // Replace with your purpose

const response = await fetch(
	`http://localhost:3000/?${queryParams.toString()}`,
	{
		method: "POST",
		body: formData,
	}
);

const res = await response.json(); // or .json() if your server responds with JSON
console.log(res);

// wait for 2 seconds before deleting the file
await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for 2 seconds

// delete the file after upload
const deleteQueryParams = new URLSearchParams();
deleteQueryParams.append("key", "your_api_key_here"); // Replace with your actual API key
deleteQueryParams.append("path", res.imageUrl);

const deleteResponse = await fetch(
	`http://localhost:3000/?${deleteQueryParams.toString()}`,
	{
		method: "DELETE",
	}
);

const deleteRes = await deleteResponse.json(); // or .json() if your server responds with JSON
console.log(deleteRes);
