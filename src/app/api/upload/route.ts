import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename using timestamp
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${cleanFileName}`;
    
    // Define the public uploads directory
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    // Ensure the uploads directory exists
    await mkdir(uploadsDir, { recursive: true });
    
    // Write file to disk
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, new Uint8Array(buffer));

    // Return the public URL path
    return NextResponse.json({ 
      success: true, 
      url: `/uploads/${filename}` 
    });
  } catch (error) {
    console.error("Local file upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
