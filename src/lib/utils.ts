import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1];
}

export function getRentStatusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "PENDING":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "PARTIAL":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "OVERDUE":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "ADVANCE_PAID":
      return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}

export function getMaintenanceStatusColor(status: string): string {
  switch (status) {
    case "OPEN":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    case "IN_PROGRESS":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "RESOLVED":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "CLOSED":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}

export function getCurrentMonth(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function generateWhatsAppMessage(
  tenantName: string,
  roomNo: string,
  month: string,
  year: number,
  rentAmount: number,
  electricityBill: number,
  total: number,
  dueDate: string
): string {
  return encodeURIComponent(
    `🏢 *ATUL RESIDENCY*\n\n` +
    `Dear *${tenantName}*,\n\n` +
    `Your monthly invoice is ready:\n\n` +
    `📍 Room: *${roomNo}*\n` +
    `📅 Month: *${month} ${year}*\n` +
    `💰 Rent: *${formatCurrency(rentAmount)}*\n` +
    `⚡ Electricity: *${formatCurrency(electricityBill)}*\n` +
    `━━━━━━━━━━━━━━\n` +
    `💵 Total: *${formatCurrency(total)}*\n` +
    `📆 Due Date: *${dueDate}*\n\n` +
    `💳 Pay via UPI: *atultiwari123321@oksbi*\n\n` +
    `Thank you for your prompt payment! 🙏\n` +
    `- Atul Residency Management`
  );
}

export async function compressImage(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new globalThis.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Forcefully clears all NextAuth / Auth.js cookies from the browser.
 * This includes secure, __Host-, and chunked cookies.
 */
export function clearAllAuthCookies() {
  if (typeof window === "undefined") return;

  const cookieNames = [
    "authjs.session-token", "authjs.callback-url", "authjs.csrf-token",
    "__Secure-authjs.session-token", "__Secure-authjs.callback-url", "__Secure-authjs.csrf-token",
    "__Host-authjs.session-token", "__Host-authjs.callback-url", "__Host-authjs.csrf-token",
    "next-auth.session-token", "next-auth.callback-url", "next-auth.csrf-token",
    "__Secure-next-auth.session-token", "__Secure-next-auth.callback-url", "__Secure-next-auth.csrf-token",
    "__Host-next-auth.session-token", "__Host-next-auth.callback-url", "__Host-next-auth.csrf-token",
  ];

  try {
    const cookies = document.cookie.split(";");
    cookies.forEach((c) => {
      const name = c.split("=")[0].trim();
      if (!name) return;

      const baseName = name.replace(/\.\d+$/, ""); // Handle chunked cookies (.0, .1, etc.)
      if (cookieNames.includes(name) || cookieNames.includes(baseName)) {
        const isHostPrefixed = name.startsWith("__Host-");
        
        // __Host- cookies MUST be deleted with path=/, secure, and NO domain.
        if (isHostPrefixed) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
        } else {
          // Try to clear standard cookies with all path and domain variants
          const paths = ["/", "/admin", "/tenant", "/api", "/login", ""];
          paths.forEach((p) => {
            const pathVal = p || "/";
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}; secure`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}; domain=${window.location.hostname}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}; domain=.${window.location.hostname}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}; domain=${window.location.hostname}; secure`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${pathVal}; domain=.${window.location.hostname}; secure`;
          });
        }
      }
    });
    console.log("🧹 Wiped all auth cookies successfully.");
  } catch (error) {
    console.error("Failed to clear auth cookies:", error);
  }
}
