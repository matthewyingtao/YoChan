import type { Sharp } from "sharp";
import sharp from "sharp";

// Ideally we would use img.metadata() to get the format,
// but it doesn't take into account the transformations.
export async function getResultFormat(img: Sharp) {
	const outputBuffer = await img.toBuffer();
	const metadata = await sharp(outputBuffer).metadata();
	return metadata.format;
}

type ErrorResponse = {
	success: false;
	error: {
		message: string;
	};
};

type SuccessResponse = {
	success: true;
	result: any;
};

export function ErrorResponse(message: string): ErrorResponse {
	return {
		success: false,
		error: {
			message,
		},
	};
}

export function SuccessResponse(result: any): SuccessResponse {
	return {
		success: true,
		result,
	};
}
