import { v2 as cloudinary } from "cloudinary";

const requiredVars = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
} as const;

const missing = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

if (missing.length > 0) {
    throw new Error(
        `Cloudinary configuration error: Missing environment variables: ${missing.join(", ")}`
    );
}

cloudinary.config({
    cloud_name: requiredVars.cloud_name,
    api_key: requiredVars.api_key,
    api_secret: requiredVars.api_secret,
    secure: true,
});

export async function destroyFile(publicId: string): Promise<boolean> {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("Cloudinary destroy error:", error);
        return false;
    }
}

export async function getAssetInfo(publicId: string) {
    try {
        return await cloudinary.api.resource(publicId, {
            resource_type: "image",
        });
    } catch {
        try {
            return await cloudinary.api.resource(publicId, {
                resource_type: "raw",
            });
        } catch {
            try {
                return await cloudinary.api.resource(publicId, {
                    resource_type: "video",
                });
            } catch {
                return null;
            }
        }
    }
}

export default cloudinary;
