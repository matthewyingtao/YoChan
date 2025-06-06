import { status } from "elysia";
import type { Sharp } from "sharp";
import sharp from "sharp";
import { config } from "./config";

export const authUser = (apiKey: string) =>
	apiKey !== config.API_KEY
		? status(403, ErrorResponse("Forbidden. Invalid API key."))
		: undefined;

export function ErrorResponse(message: string) {
	return {
		success: false,
		error: {
			message,
		},
	};
}

export function SuccessResponse(result: any) {
	return {
		success: true,
		result,
	};
}

// Ideally we would use img.metadata() to get the format,
// but it doesn't take into account the transformations.
export async function getResultFormat(img: Sharp) {
	const outputBuffer = await img.toBuffer();
	const metadata = await sharp(outputBuffer).metadata();
	return metadata.format;
}

export async function applyImageTransforms(
	file: File,
	options: { asJpeg?: number; asWebp?: number; thumbnail?: number }
) {
	let img = sharp(await file.arrayBuffer()).autoOrient();

	for (const [key, value] of Object.entries(options)) {
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
	return img;
}
