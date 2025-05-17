import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { applyTransformation, isTransformationKey } from "./lib";

const app = express();
const uploadHandler = multer({});

const uploadsDir = path.join(__dirname, "..", "uploads");

app.get("/", (req, res) => {
	res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>Image Upload with Transformations</title>
        </head>
        <body>
            <form id="uploadForm" action="/" method="post" enctype="multipart/form-data">
                <input type="file" name="file" id="file" required />
                <br /><br />

                <!-- Thumbnail -->
                <label>
                    <input type="checkbox" id="useThumbnail" />
                    Thumbnail size (px):
                    <input type="number" id="thumbnail" min="1" max="10000" value="300" />
                </label>
                <br />

                <!-- JPEG Quality -->
                <label>
                    <input type="checkbox" id="useJpeg" />
                    JPEG quality:
                    <input type="range" id="asJpeg" min="1" max="100" value="80" />
                    <span id="jpegValue">80</span>
                </label>
                <br />

                <!-- WebP Quality -->
                <label>
                    <input type="checkbox" id="useWebp" />
                    WebP quality:
                    <input type="range" id="asWebp" min="1" max="100" value="80" />
                    <span id="webpValue">80</span>
                </label>
                <br /><br />

                <input type="submit" value="Upload" name="submit" />
            </form>

            <script>
                const form = document.getElementById("uploadForm");

                // Display current range values
                const updateLabel = (id, value) => {
                    document.getElementById(id).textContent = value;
                };
                document.getElementById("asJpeg").addEventListener("input", (e) => updateLabel("jpegValue", e.target.value));
                document.getElementById("asWebp").addEventListener("input", (e) => updateLabel("webpValue", e.target.value));

                form.addEventListener("submit", (e) => {
                    const queryParams = new URLSearchParams();

                    if (document.getElementById("useThumbnail").checked) {
                        const val = document.getElementById("thumbnail").value;
                        if (val) queryParams.append("thumbnail", val);
                    }

                    if (document.getElementById("useJpeg").checked) {
                        const val = document.getElementById("asJpeg").value;
                        if (val) queryParams.append("asJpeg", val);
                    }

                    if (document.getElementById("useWebp").checked) {
                        const val = document.getElementById("asWebp").value;
                        if (val) queryParams.append("asWebp", val);
                    }

                    // Apply query parameters to action URL
                    const baseAction = form.getAttribute("action").split("?")[0];
                    form.setAttribute("action", \`\${baseAction}?\${queryParams.toString()}\`);
                });
            </script>
        </body>
        </html>
    `);
});

const getResultFormat = async (img: sharp.Sharp) => {
	const outputBuffer = await img.toBuffer();
	const metadata = await sharp(outputBuffer).metadata();
	return metadata.format;
};

app.post("/", uploadHandler.single("file"), async (req, res) => {
	const file = req.file;
	if (!file) {
		res.status(400).send("No file uploaded.");
		return;
	}

	let img = sharp(file.buffer);

	for (const [key, val] of Object.entries(req.query)) {
		// check if the key is a valid transformation key
		if (!isTransformationKey(key)) continue;

		console.log(`Applying transformation: ${key} with value: ${val}`);

		try {
			img = applyTransformation(img, key, val);
		} catch (err) {
			console.error(err);
			res.status(400).send(`Error in "${key}": ${(err as Error).message}`);
			return;
		}
	}

	const uuid = crypto.randomUUID();

	const fileName = `${uuid}.${await getResultFormat(img)}`;
	const outputPath = path.join(uploadsDir, fileName);
	await img.toFile(outputPath);

	res.json({
		imageUrl: new URL(
			`/uploads/${fileName}`,
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

if (process.env.NODE_ENV !== "production") {
	console.log("Development mode: allowing file listing");

	app.get("/uploads", (req, res) => {
		const files = fs.readdirSync(uploadsDir);

		res.json({
			files: files.map((file) => ({
				url: new URL(
					`/uploads/${file}`,
					req.protocol + "://" + req.get("host")
				),
			})),
		});
	});
}

app.listen(3000, () => {
	console.log(`Server is running on port 3000`);
});
