import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "upi-config.json");

export interface UpiConfig {
  upiId: string;
  upiName: string;
}

const DEFAULT_CONFIG: UpiConfig = {
  upiId: "atultiwari123321@oksbi",
  upiName: "Atul Tiwari",
};

export function getUpiConfig(): UpiConfig {
  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return DEFAULT_CONFIG;
    }
    const data = fs.readFileSync(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading UPI config:", error);
    return DEFAULT_CONFIG;
  }
}

export function saveUpiConfig(config: UpiConfig): boolean {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving UPI config:", error);
    return false;
  }
}
