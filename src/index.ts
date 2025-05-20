import { Elysia, status, t } from "elysia";
import logixlysia from "logixlysia";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { config } from "./config";
import {
	applyImageTransforms,
	authUser,
	ErrorResponse,
	getResultFormat,
	SuccessResponse,
} from "./lib";
const app = new Elysia()
	.use(
		logixlysia({
			config: {
				showStartupMessage: false,
				customLogFormat: "{level} {method}{pathname}{duration}",
			},
		})
	)
	.get("/", () => Bun.file(path.join(import.meta.dir, "index.html")))
	.get("/uploads/*", async ({ params: { "*": url } }) => {
		const filePath = path.join(config.UPLOADS_DIR, url);

		const imgFile = Bun.file(filePath);

		if (!(await imgFile.exists())) {
			throw status(404, ErrorResponse("File not found."));
		}

		return imgFile;
	})
	// all routes below this require authentication
	.guard({
		schema: "standalone",
		query: t.Object({
			key: t.String({
				error: ErrorResponse(
					"Unauthorized. Please provide your api `key` as a query parameter e.g. `?key=[]`."
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
				throw status(400, ErrorResponse("No file uploaded."));
			}

			const img = await applyImageTransforms(file, {
				asJpeg,
				asWebp,
				thumbnail,
			});

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
				file: t.File({
					type: "image/*",
					maxSize: "10m",
					error: ErrorResponse(
						"`file` must be an image, with a maximum size of 10 MB."
					),
				}),
			}),
			query: t.Object({
				purpose: t.String({
					default: "_misc",
					pattern: "^[a-zA-Z0-9_-]+$",
					error: ErrorResponse(
						"Invalid `purpose` query parameter. At least 1 character, only alphanumeric, underscores and hyphen."
					),
				}),
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
				// Parse the URL to extract the pathname (e.g., /uploads/purpose/filename)
				pathName = new URL(urlPath).pathname;
			} catch (error) {
				throw status(400, ErrorResponse("Invalid URL."));
			}

			// Remove the '/uploads' prefix to get the file path in the project
			const pathToDelete = pathName.replace(/^\/uploads/, "");

			const filePath = path.join(config.UPLOADS_DIR, pathToDelete);

			try {
				await Bun.file(filePath).delete();
			} catch (error) {
				throw status(404, ErrorResponse("File not found."));
			}

			return status(200, SuccessResponse("File deleted successfully."));
		},
		{
			query: t.Object({
				urlPath: t.String(),
			}),
		}
	)
	.delete(
		"/multiple",
		async ({ query: { purpose } }) => {
			// check if the directory exists
			const dirPath = path.join(config.UPLOADS_DIR, purpose);

			try {
				const dir = Bun.file(dirPath);

				// check that the destination is a directory
				if (!(await dir.stat()).isDirectory()) {
					throw status(404, ErrorResponse("Directory not found."));
				}

				// syncronously deletes the folder & files inside
				rmSync(dirPath, {
					recursive: true,
				});

				return status(
					200,
					SuccessResponse(`Directory ${purpose} deleted successfully.`)
				);
			} catch (error) {
				// no file/directory found at the path
				throw status(404, ErrorResponse("Directory not found."));
			}
		},
		{
			query: t.Object({
				purpose: t.String({
					pattern: "^[a-zA-Z0-9_-]+$",
					error: ErrorResponse(
						"Invalid `purpose` query parameter. At least 1 character, only alphanumeric, underscores and hyphen."
					),
				}),
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
				throw status(400, ErrorResponse("No file uploaded."));
			}

			let outputRes = [];

			for (const file of files) {
				const img = await applyImageTransforms(file, {
					asJpeg,
					asWebp,
					thumbnail,
				});

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
				files: t.Files({
					type: "image/*",
					maxSize: "10m",
					error: ErrorResponse(
						"`file` must be an image, with a maximum size of 10 MB."
					),
				}),
			}),
			query: t.Object({
				purpose: t.String({
					default: "_misc",
					pattern: "^[a-zA-Z0-9_-]+$",
					error: ErrorResponse(
						"Invalid `purpose` query parameter. At least 1 character, only alphanumeric, underscores and hyphen."
					),
				}),
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
	.get("/list", async ({ request }) => {
		// Reads all folders in the uploads directory (each folder is a "purpose")
		const folders = readdirSync(config.UPLOADS_DIR).map((folderName) => {
			// Reads all files in each purpose folder
			const folder = readdirSync(path.join(config.UPLOADS_DIR, folderName));

			return {
				purpose: folderName,
				length: folder.length,
				files: folder.map((fileName) =>
					new URL(`/uploads/${folderName}/${fileName}`, request.url).toString()
				),
			};
		});

		return status(200, SuccessResponse(folders));
	})
	.listen(config.PORT, (server) => {
		console.log(`👋🦭  Yo Chan is running at ${server.url} and ready to gyu!`);
	});
