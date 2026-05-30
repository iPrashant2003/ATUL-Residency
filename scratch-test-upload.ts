import axios from "axios";
import FormData from "form-data";

async function main() {
  const form = new FormData();
  form.append("file", Buffer.from("dummy file content"), "test-photo.png");

  try {
    console.log("Sending upload request to http://localhost:3000/api/upload...");
    const res = await axios.post("http://localhost:3000/api/upload", form, {
      headers: form.getHeaders(),
    });
    console.log("Upload Success:", res.data);
  } catch (err: any) {
    console.error("Upload Failed:", err.response?.status, err.response?.data || err.message);
  }
}

main();
