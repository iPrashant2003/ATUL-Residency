import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";

// Configure Cloudinary if credentials are set and not placeholder values
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== "your-cloud-name" &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== "your-api-key" &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_API_SECRET !== "your-api-secret";

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(req: NextRequest) {
  try {
    // Validate same-origin/referer to protect against cross-site abuse
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      const cleanOrigin = origin.replace(/^https?:\/\//, "");
      if (!cleanOrigin.includes(host)) {
        return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. If Cloudinary is configured, upload to Cloudinary (Production/Cloud standard)
    if (isCloudinaryConfigured) {
      try {
        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "atul-residency" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });
        return NextResponse.json({ success: true, url: result.secure_url });
      } catch (cloudinaryErr: any) {
        console.error("Cloudinary upload failed, falling back to Base64:", cloudinaryErr.message);
      }
    }

    // 2. Fallback: Base64 Data URL (Gives zero-setup out-of-the-box upload functionality on read-only environments like Vercel)
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ 
      success: true, 
      url: dataUrl 
    });

  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
