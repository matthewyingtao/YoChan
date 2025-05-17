import express from "express";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { applyTransformation, isTransformationKey } from "./lib";

const app = express();
const uploadHandler = multer({});

const uploadsDir = path.join(__dirname, "..", "uploads");

app.get("/", (req, res) => {
	res.send(`
        <form action="/" method="post" enctype="multipart/form-data">
            <input type="file" name="file" id="file">
            <input type="submit" value="Upload" name="submit">
        </form>
    `);
});

app.post("/", uploadHandler.single("file"), async (req, res) => {
	const file = req.file;
	if (!file) {
		res.status(400).send("No file uploaded.");
		return;
	}

	let img = sharp(file.buffer).grayscale();

	for (const [key, val] of Object.entries(req.query)) {
		// check if the key is a valid transformation key
		if (!isTransformationKey(key)) continue;

		try {
			img = applyTransformation(img, key, val);
		} catch (err) {
			console.error(err);
			res.status(400).send(`Error in "${key}": ${(err as Error).message}`);
			return;
		}
	}

	const outputPath = path.join(uploadsDir, file.originalname);
	await img.toFile(outputPath);

	res.json({
		imageUrl: new URL(
			`/uploads/${file.originalname}`,
			req.protocol + "://" + req.get("host")
		),
	});
});

app.get("/uploads/:filename", (req, res) => {
	const filename = req.params.filename;
	const filePath = path.join(uploadsDir, filename);

	res.sendFile(filePath, (err) => {
		if (err) {
			res.status(400).end();
		} else {
			console.log(`Sent: ${filePath}`);
		}
	});
});

app.listen(3000, () => {
	console.log(`Server is running on port 3000`);
});
