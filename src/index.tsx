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
	.get("/", ({ set }) => {
		set.headers["content-type"] = "text/html; charset=utf-8";

		return `<!doctype html>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>Yo Chan</title>
					<style>
						:root {
							--color-primary: hsl(233, 80%, 40%);
							--color-primary-soft: hsl(233, 75%, 92%);
							--color-bg: hsl(233, 20%, 92%);
							--color-card: #fff;
							--color-text: hsl(233, 65%, 30%);
							--color-muted: hsl(233, 20%, 40%);
							--color-border: hsl(233, 30%, 80%);
							--color-border-strong: hsl(233, 40%, 70%);
							--radius: 0.5rem;
							--space-sm: 0.5rem;
							--space-md: 0.75rem;
							--space-lg: 1rem;
							--shadow: 0 10px 40px rgba(3, 8, 20, 0.08);
						}
						html,
						body {
							height: 100%;
							margin: 0;
							display: grid;
							place-items: center;
							background-color: var(--color-bg);
							font-family: 'Courier New', Courier, monospace;
							text-align: center;
							text-wrap: balance;
							color: var(--color-primary);
						}
						main {
							max-width: 480px;
							padding: calc(var(--space-lg) * 2);
							box-shadow: var(--shadow);
							border-radius: 1rem;
							background: var(--color-card);
						}
						form {
							display: grid;
							gap: var(--space-lg);
						}
						label {
							display: grid;
							grid-template-columns: 9rem minmax(0, 1fr);
							align-items: center;
							gap: var(--space-md);
							text-align: right;
							font-size: 0.9rem;
							font-weight: bold;
							color: var(--color-text);
						}
						input,
						button {
							font: inherit;
							padding: var(--space-sm) var(--space-md);
							border-radius: var(--radius);
							border: 1px solid var(--color-border);
						}
						input[type="file"] {
							padding: 0;
							border: none;
							background: transparent;
						}
						input[type="file"]::file-selector-button {
							font: inherit;
							padding: var(--space-sm) var(--space-lg);
							border-radius: var(--radius);
							border: 1px solid var(--color-border);
							background: var(--color-primary-soft);
							color: var(--color-text);
							cursor: pointer;
							transition: border-color 120ms ease, background 120ms ease;
							margin-right: var(--space-md);
							display: inline-flex;
							align-items: center;
						}
						input[type="file"]::file-selector-button:hover {
							border-color: var(--color-primary);
							background: hsl(233, 75%, 88%);
						}
						button {
							cursor: pointer;
							background: var(--color-primary);
							color: white;
							border: none;
							justify-self: end;
						}
						fieldset {
							border: 1px dashed var(--color-border-strong);
							border-radius: 0.75rem;
							padding: var(--space-lg);
							display: grid;
							gap: var(--space-md);
						}
						legend {
							padding: 0 var(--space-sm);
							font-weight: bold;
							color: var(--color-text);
						}
						.small {
							font-size: 0.85rem;
							color: var(--color-muted);
						}
						label span {
							justify-self: end;
						}
					</style>
				</head>
				<body>
					<main>
						<h1>👋🦭 Yo Chan is ready to gyu!</h1>
						<p class="small">Use the form below to upload an image, set a purpose label, and tweak the output.</p>
						<form method="POST" action="/" data-base-action="/" enctype="multipart/form-data" target="_blank">
							<label>
								<span>API key</span>
								<input type="text" name="key" placeholder="your-secret-key" required />
							</label>
							<label>
								<span>Select image</span>
								<input type="file" name="file" accept="image/*" required />
							</label>
							<label>
								<span>Purpose</span>
								<input type="text" name="purpose" value="_misc" pattern="^[a-zA-Z0-9_-]+$" required />
							</label>
							<fieldset>
								<legend>Filters (optional)</legend>
								<label>
									<span>Thumbnail size (px)</span>
									<input type="number" name="thumbnail" min="1" max="10000" placeholder="e.g. 512" />
								</label>
								<label>
									<span>JPEG quality (1-100)</span>
									<input type="number" name="asJpeg" min="1" max="100" placeholder="80" />
								</label>
								<label>
									<span>WEBP quality (1-100)</span>
									<input type="number" name="asWebp" min="1" max="100" placeholder="90" />
								</label>
							</fieldset>
							<button type="submit">Upload image</button>
						</form>
						<script>
							const form = document.querySelector("form");
							const keyInput = form.querySelector('input[name="key"]');
							const purposeInput = form.querySelector('input[name="purpose"]');
							const actionBase = form.dataset.baseAction || form.getAttribute("action") || "/";
							const filterFields = ["thumbnail", "asJpeg", "asWebp"];
							form.addEventListener("submit", (event) => {
								const key = keyInput.value.trim();
								if (!key) {
									event.preventDefault();
									keyInput.focus();
									return;
								}
								const purpose = purposeInput.value.trim() || "_misc";
								const params = new URLSearchParams();
								params.set("key", key);
								params.set("purpose", purpose);
								for (const fieldName of filterFields) {
									const field = form.querySelector('[name="' + fieldName + '"]');
									if (!field) continue;
									const value = field.value.trim();
									if (value) {
										params.set(fieldName, value);
									}
								}
								form.action = actionBase + "?" + params.toString();
							});
						</script>
					</main>
				</body>
			</html>`;
	})
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
		error: () =>
			ErrorResponse(
				"Unauthorized. Please provide your api `key` as a query parameter e.g. `?key=[]`."
			),
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
	.listen(config.PORT, ({ development, port }) => {
		console.log(
			development
				? `👋🦭  Yo Chan is running at http://localhost:${port} and ready to gyu!`
				: `👋🦭  Yo Chan is running and ready to gyu!`
		);
	});
