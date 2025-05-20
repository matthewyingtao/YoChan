import { Elysia, status, t } from "elysia";
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config";
import {
	authUser,
	ErrorResponse,
	getResultFormat,
	SuccessResponse,
} from "./lib";

const app = new Elysia()
	.get("/", () => "Yo Chan is running and ready to gyu!")
	.get("/uploads/*", async ({ params: { "*": url } }) => {
		const filePath = path.join(config.UPLOADS_DIR, url);

		const imgFile = Bun.file(filePath);

		if (!imgFile.exists()) {
			return status(404, ErrorResponse("File not found."));
		}

		return imgFile;
	})
	.guard({
		schema: "standalone",
		query: t.Object({
			key: t.String({
				error: ErrorResponse(
					"Unauthorized. Please provide your api key as a query parameter e.g. `?key=[]`."
				),
			}),
		}),
	})
	.guard({
		beforeHandle: ({ query: { key } }) => authUser(key),
	})
	.post(
		"/",
		async ({
			body: { file },
			query: { asJpeg, asWebp, thumbnail, purpose },
			request,
		}) => {
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

			const outputPath = path.join(config.UPLOADS_DIR, purpose, fileName);

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
				file: t.File({ type: "image/*" }),
			}),
			query: t.Object({
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
		async ({ query: { urlPath } }) => {
			let pathName;
			try {
				pathName = new URL(urlPath).pathname;
			} catch (error) {
				return status(400, ErrorResponse("Invalid URL."));
			}

			const pathToDelete = pathName.replace(/^\/uploads/, "");

			const filePath = path.join(config.UPLOADS_DIR, pathToDelete);

			try {
				await Bun.file(filePath).delete();
			} catch (error) {
				return status(404, ErrorResponse("File not found."));
			}

			return status(200, SuccessResponse("File deleted successfully."));
		},
		{
			query: t.Object({
				urlPath: t.String(),
			}),
		}
	)
	.post(
		"/multiple",
		async ({
			body: { files },
			query: { asJpeg, asWebp, thumbnail, purpose },
			request,
		}) => {
			if (files.length < 1) {
				return status(400, ErrorResponse("No file uploaded."));
			}

			let outputRes = [];

			for (const file of files) {
				let img = sharp(await file.arrayBuffer()).autoOrient();

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

				const outputPath = path.join(config.UPLOADS_DIR, purpose, fileName);

				mkdirSync(path.dirname(outputPath), { recursive: true });

				await img.toFile(outputPath);

				outputRes.push(
					new URL(`/uploads/${purpose}/${fileName}`, request.url).toString()
				);
			}
			return status(200, SuccessResponse(outputRes));
		},
		{
			body: t.Object({
				files: t.Files({ format: "image/*" }),
			}),
			query: t.Object({
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
	.listen(config.PORT, (server) => {
		console.log(`Yo Chan is running on port ${server.port} and ready to gyu!`);
	});
