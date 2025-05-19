import staticPlugin from "@elysiajs/static";
import { Elysia, status, t } from "elysia";
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config";
import { ErrorResponse, getResultFormat, SuccessResponse } from "./lib";

const app = new Elysia()
	.use(
		staticPlugin({
			assets: config.UPLOADS_DIR,
			prefix: "/uploads",
		})
	)
	.get("/", () => "Yo Chan is running and ready to gyu!")
	.post(
		"/",
		async ({
			body: { file },
			query: { asJpeg, asWebp, thumbnail, key: apiKey, purpose },
			request,
		}) => {
			if (!apiKey) {
				return status(
					401,
					ErrorResponse(
						"Unauthorized. Please provide your api key as a query parameter e.g. `?key=[]`."
					)
				);
			}

			if (apiKey !== config.API_KEY) {
				return status(403, ErrorResponse("Forbidden. Invalid API key."));
			}

			if (!file) {
				return status(400, ErrorResponse("No file uploaded."));
			}

			let img = sharp(await file.arrayBuffer());

			// apply transformations
			for (const [key, value] of Object.entries({
				asJpeg,
				asWebp,
				thumbnail,
			})) {
				if (!value) continue;

				switch (key) {
					case "asJpeg":
						img = img.jpeg({ quality: value });
						break;
					case "asWebp":
						img = img.webp({ quality: value });
						break;
					case "thumbnail":
						img = img.resize(value, value, { fit: "inside" });
						break;
				}
			}

			// generate a random file name and save the file
			const uuid = crypto.randomUUID();
			const fileName = `${uuid}.${await getResultFormat(img)}`;

			const outputPath = path.join(
				config.UPLOADS_DIR,
				String(purpose),
				fileName
			);

			console.log(`upload folder is at ${config.UPLOADS_DIR}`);
			console.log(`Saving file to ${outputPath}`);

			mkdirSync(path.dirname(outputPath), { recursive: true });

			await img.toFile(outputPath);

			return status(
				200,
				SuccessResponse(
					new URL(`/uploads/${purpose}/${fileName}`, request.url).toString()
				)
			);
		},
		{
			body: t.Object({
				file: t.File({ format: "image/*" }),
			}),
			query: t.Object({
				key: t.String(),
				purpose: t.String({ default: "_misc" }),
				thumbnail: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 10000,
					})
				),
				asJpeg: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 100,
					})
				),
				asWebp: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 100,
					})
				),
			}),
		}
	)
	.delete(
		"/",
		async ({ query: { key: apiKey, urlPath } }) => {
			if (!apiKey) {
				return status(
					401,
					ErrorResponse(
						"Unauthorized. Please provide your api key as a query parameter e.g. `?key=[]`."
					)
				);
			}

			if (apiKey !== config.API_KEY) {
				return status(403, ErrorResponse("Forbidden. Invalid API key."));
			}

			const pathName = new URL(urlPath).pathname;
			const pathToDelete = pathName.replace(/^\/uploads/, "");

			const filePath = path.join(config.UPLOADS_DIR, pathToDelete);

			await Bun.file(filePath).delete();

			return status(200, SuccessResponse("File deleted successfully."));
		},
		{
			query: t.Object({
				key: t.String(),
				urlPath: t.String(),
			}),
		}
	)
	.listen(config.PORT);

console.log(`Server is running on port ${config.PORT}!`);
