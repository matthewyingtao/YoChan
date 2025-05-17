import type { Sharp } from "sharp";
import sharp from "sharp";
import z from "zod";

export const transformationSchemas = {
	thumbnail: z.coerce.number().min(1).max(10000),
	asJpeg: z.coerce.number().min(1).max(100),
	asWebp: z.coerce.number().min(1).max(100),
} as const;

type TransformationKey = keyof typeof transformationSchemas;

export const isTransformationKey = (key: string): key is TransformationKey =>
	Object.keys(transformationSchemas).includes(key as TransformationKey);

const transformations: Record<
	TransformationKey,
	(img: Sharp, value: any) => Sharp
> = {
	thumbnail: (img, size) => img.resize(size, size, { fit: "inside" }),
	asJpeg: (img, quality) => img.jpeg({ quality }),
	asWebp: (img, quality) => img.webp({ quality }),
};

export function applyTransformation(
	img: Sharp,
	type: TransformationKey,
	rawValue: unknown
): Sharp {
	const schema = transformationSchemas[type];
	const result = schema.safeParse(rawValue);
	if (!result.success) {
		const messages = result.error.errors.map((e) => e.message).join("; ");
		throw new Error(`Invalid value for ${type}: ${messages}`);
	}
	return transformations[type](img, result.data);
}

// Ideally we would use img.metadata() to get the format,
// but it doesn't take into account the transformations.
export async function getResultFormat(img: Sharp) {
	const outputBuffer = await img.toBuffer();
	const metadata = await sharp(outputBuffer).metadata();
	return metadata.format;
}
