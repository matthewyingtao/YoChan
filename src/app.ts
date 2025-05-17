import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { config } from "./config";
import {
	applyTransformation,
	ErrorResponse,
	getResultFormat,
	isTransformationKey,
	SuccessResponse,
} from "./lib";

const app = express();
const uploadHandler = multer({});

app.post("/", uploadHandler.single("file"), async (req, res) => {
	// first authenticate the request from their key param
	const qp = req.query;

	const apiKey = qp.key;

	if (!qp.key) {
		res
			.status(401)
			.json(
				ErrorResponse(
					"Unauthorized. Please provide your api key as a query parameter e.g. `?key=[]`."
				)
			);
		return;
	}

	if (apiKey !== config.API_KEY) {
		res.status(403).json(ErrorResponse("Forbidden. Invalid API key."));
		return;
	}

	// then check if the file is valid
	const file = req.file;

	if (!file) {
		res.status(400).json(ErrorResponse("No file uploaded."));
		return;
	}

	let img = sharp(file.buffer);

	// apply transformations
	for (const [key, val] of Object.entries(qp)) {
		// check if the key is a valid transformation key
		if (!isTransformationKey(key)) continue;

		try {
			img = applyTransformation(img, key, val);
		} catch (err) {
			res
				.status(400)
				.json(ErrorResponse(`Error in "${key}": ${(err as Error).message}`));
			return;
		}
	}

	// generate a random file name and save the file
	const uuid = crypto.randomUUID();
	const fileName = `${uuid}.${await getResultFormat(img)}`;

	// allows the user to specify a folder to save the file in, so that they can group images
	const purpose = qp.purpose ?? "_misc";

	const outputPath = path.join(config.UPLOADS_DIR, String(purpose), fileName);

	// create the directory if it doesn't exist
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });

	// save the file
	await img.toFile(outputPath);

	res.json(
		SuccessResponse(
			new URL(
				`/uploads/${purpose}/${fileName}`,
				req.protocol + "://" + req.get("host")
			)
		)
	);
});

// serve the uploads directory
app.use("/uploads", express.static(config.UPLOADS_DIR));

app.listen(config.PORT, () => {
	console.log(`Server is running on port ${config.PORT}`);
});
