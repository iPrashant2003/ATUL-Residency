import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Page, Text, View, Document, StyleSheet, renderToStream, Image, Svg, Path, Circle, Defs, LinearGradient, Stop } from "@react-pdf/renderer";
import { formatCurrency, getMonthName, formatDateTime } from "@/lib/utils";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";

function getLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 0,
    fontFamily: "Helvetica",
  },
  headerBanner: {
    backgroundColor: "#f0fdfa",
    padding: "30px 40px",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#14b8a6",
  },
  logoAndTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoTextContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f766e",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 9,
    color: "#d97706",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 2,
    fontWeight: "bold",
  },
  invoiceDetails: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 22,
    color: "#0f766e",
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 1,
  },
  invoiceText: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 3,
  },
  content: {
    padding: 40,
  },
  sectionBox: {
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#b2f5ea",
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: "#e6fcf5",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#b2f5ea",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionBody: {
    padding: 15,
    backgroundColor: "#ffffff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  textDetail: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 3,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  table: {
    width: "100%",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#b2f5ea",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0d9488",
    padding: 10,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e6fcf5",
    padding: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f0fdfa",
  },
  tableCell: {
    fontSize: 10,
    color: "#334155",
  },
  col1: { width: "70%" },
  col2: { width: "30%", textAlign: "right" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 25,
  },
  summaryBox: {
    width: "50%",
    borderWidth: 1,
    borderColor: "#b2f5ea",
    borderRadius: 8,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e6fcf5",
    backgroundColor: "#ffffff",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "bold",
  },
  summaryValue: {
    fontSize: 10,
    color: "#0f172a",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#0f766e",
  },
  grandTotalLabel: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 14,
    color: "#fbbf24",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f0fdfa",
    padding: 15,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#b2f5ea",
  },
  footerText: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 3,
  },
  paymentSection: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#f0fdfa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b2f5ea",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentDetails: {
    flexDirection: "column",
    width: "70%",
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f766e",
    marginBottom: 5,
  },
  paymentText: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 3,
  },
  qrContainer: {
    width: "30%",
    alignItems: "flex-end",
  },
  qrCode: {
    width: 70,
    height: 70,
    borderRadius: 4,
  }
});

const PdfLogo = () => (
  <Svg viewBox="0 0 100 100" style={{ width: 32, height: 32 }}>
    <Defs>
      <LinearGradient id="pdfGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFE259" />
        <Stop offset="60%" stopColor="#FFA751" />
        <Stop offset="100%" stopColor="#FF6B6B" />
      </LinearGradient>
      <LinearGradient id="pdfTeal" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#00F2FE" />
        <Stop offset="100%" stopColor="#4FACFE" />
      </LinearGradient>
    </Defs>
    <Circle cx="50" cy="50" r="42" fill="url(#pdfGold)" opacity={0.05} />
    <Circle cx="50" cy="50" r="45" stroke="url(#pdfGold)" strokeWidth={1} strokeDasharray="3 6" opacity={0.4} />
    <Path
      d="M24 82 L47 18 C48 15, 52 15, 53 18 L76 82"
      stroke="url(#pdfGold)"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M33 58 L67 58"
      stroke="url(#pdfGold)"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M50 24 L50 82"
      stroke="url(#pdfTeal)"
      strokeWidth={3.5}
      strokeLinecap="round"
      opacity={0.85}
    />
    <Path
      d="M38 42 L50 30 L62 42"
      stroke="url(#pdfGold)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
    <Path
      d="M30 65 L50 50 L70 65"
      stroke="url(#pdfGold)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
    <Path
      d="M18 82 L82 82"
      stroke="url(#pdfGold)"
      strokeWidth={5}
      strokeLinecap="round"
    />
    <Path
      d="M50 6 L52 11 L57 11 L53 14 L55 19 L50 16 L45 19 L47 14 L43 11 L48 11 Z"
      fill="url(#pdfGold)"
    />
  </Svg>
);

const InvoiceDocument = ({ record, qrDataUri, meterPhotoBase64 }: { record: any, qrDataUri: string, meterPhotoBase64: string | null }) => {
  const balance = record.totalAmount - record.amountPaid;
  const isPaid = record.status === "PAID" || record.status === "ADVANCE_PAID";
  
  let statusColor = "#f59e0b"; // PENDING (Amber)
  if (isPaid) statusColor = "#10b981"; // PAID (Emerald)
  else if (record.status === "OVERDUE") statusColor = "#ef4444"; // OVERDUE (Red)
  else if (record.status === "PARTIAL") statusColor = "#3b82f6"; // PARTIAL (Blue)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Banner Header */}
        <View style={styles.headerBanner}>
          <View style={styles.logoAndTitleContainer}>
            <PdfLogo />
            <View style={styles.logoTextContainer}>
              <Text style={styles.title}>ATUL Residency</Text>
              <Text style={styles.subtitle}>Premium Property Portal</Text>
            </View>
          </View>
          <View style={styles.invoiceDetails}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceText}>INV-{record.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.invoiceText}>Date: {formatDateTime(new Date().toISOString()).split(" ")[0]}</Text>
            <Text style={styles.invoiceText}>Billing Cycle: {getMonthName(record.month)} {record.year}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Tenant Info */}
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Billed To</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.tenantName}>{record.tenant.name}</Text>
                  <Text style={styles.textDetail}>Room {record.tenant.room.number} • {record.tenant.room.tower.name}</Text>
                  <Text style={styles.textDetail}>Phone: +91 {record.tenant.phone}</Text>
                  {record.tenant.email && <Text style={styles.textDetail}>Email: {record.tenant.email}</Text>}
                </View>
                <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
                  <Text style={{ ...styles.statusBadge, backgroundColor: statusColor }}>
                    {record.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Breakdown Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>Amount</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1, { fontWeight: "bold" }]}>Monthly Rent ({getMonthName(record.month)} {record.year})</Text>
              <Text style={[styles.tableCell, styles.col2]}>{formatCurrency(record.rentAmount)}</Text>
            </View>

            {record.electricityBill > 0 && (
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <View style={styles.col1}>
                  <Text style={styles.tableCell}>Electricity Bill</Text>
                  {record.meterReading && <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>Meter Reading: {record.meterReading} Units</Text>}
                </View>
                <Text style={[styles.tableCell, styles.col2]}>{formatCurrency(record.electricityBill)}</Text>
              </View>
            )}

            {record.maintenanceCharge > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Maintenance Charge</Text>
                <Text style={[styles.tableCell, styles.col2]}>{formatCurrency(record.maintenanceCharge)}</Text>
              </View>
            )}

            {record.lateFee > 0 && (
              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.col1]}>Late Fee Penalty</Text>
                <Text style={[styles.tableCell, styles.col2]}>{formatCurrency(record.lateFee)}</Text>
              </View>
            )}

            {record.discount > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Discount</Text>
                <Text style={[styles.tableCell, styles.col2, { color: "#10b981", fontWeight: "bold" }]}>- {formatCurrency(record.discount)}</Text>
              </View>
            )}
          </View>

          {/* Totals */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(record.totalAmount)}</Text>
              </View>
              <View style={[styles.summaryRow, { backgroundColor: "#f0fdfa" }]}>
                <Text style={styles.summaryLabel}>Amount Paid:</Text>
                <Text style={[styles.summaryValue, { color: "#10b981", fontWeight: "bold" }]}>{formatCurrency(record.amountPaid)}</Text>
              </View>
              
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Balance Due:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(balance)}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {record.notes && (
            <View style={[styles.sectionBox, { marginTop: 10 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notes</Text>
              </View>
              <View style={styles.sectionBody}>
                <Text style={styles.textDetail}>{record.notes}</Text>
              </View>
            </View>
          )}

          {/* Electricity Meter Photo Side-by-Side Detail */}
          {meterPhotoBase64 && (
            <View style={[styles.sectionBox, { marginTop: 10 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Electricity Meter Reading Details</Text>
              </View>
              <View style={[styles.sectionBody, { flexDirection: "row", gap: 20, alignItems: "center" }]}>
                <Image src={meterPhotoBase64} style={{ width: 120, height: 120, borderRadius: 6, borderWidth: 1, borderColor: "#b2f5ea", objectFit: "contain" }} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#0f766e", marginBottom: 3 }}>Reading Validation</Text>
                  <Text style={styles.textDetail}>Meter Number: {record.tenant.room.meterNumber || "N/A"}</Text>
                  <Text style={styles.textDetail}>Current Reading: {record.meterReading || "Logged"} Units</Text>
                  <Text style={styles.textDetail}>Electricity Dues: {formatCurrency(record.electricityBill)}</Text>
                  <Text style={{ fontSize: 8, color: "#64748b", marginTop: 5, lineHeight: 1.3 }}>Note: Meter photos are captured on-site during bill generation to ensure 100% accurate electricity calculations.</Text>
                </View>
              </View>
            </View>
          )}

          {/* Payment Section with QR Code */}
          <View style={styles.paymentSection}>
             <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle}>Payment Information</Text>
                <Text style={styles.paymentText}>Please scan the QR code to pay via UPI.</Text>
                <Text style={styles.paymentText}>UPI ID: atultiwari123321@oksbi</Text>
                <Text style={[styles.paymentText, { marginTop: 4, color: "#ef4444", fontWeight: "bold", fontSize: 10 }]}>Amount Due: {formatCurrency(balance)}</Text>
             </View>
             <View style={styles.qrContainer}>
                <Image src={qrDataUri} style={styles.qrCode} />
              </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: "#0f766e", fontWeight: "bold", fontSize: 9, marginBottom: 4 }]}>Thank you for choosing Atul Residency!</Text>
          <Text style={styles.footerText}>For queries, contact Admin at atultiwari123321@gmail.com</Text>
          <Text style={styles.footerText}>Please pay your dues promptly to avoid late fees.</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const record = await prisma.rentRecord.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            room: {
              include: {
                tower: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Generate UPI QR Code
    const balance = record.totalAmount - record.amountPaid;
    const upiString = `upi://pay?pa=atultiwari123321@oksbi&pn=ATUL%20RESIDENCY&am=${balance}&cu=INR`;
    const qrDataUri = await QRCode.toDataURL(upiString, { width: 300, margin: 1, color: { dark: '#0f172a' } });

    let meterPhotoBase64 = null;
    if (record.meterPhotoUrl) {
      try {
        // Cloudinary / external URL — fetch over HTTP
        if (record.meterPhotoUrl.startsWith("http")) {
          const imgRes = await fetch(record.meterPhotoUrl);
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            meterPhotoBase64 = `data:${contentType};base64,${Buffer.from(imgBuffer).toString("base64")}`;
          }
        } else {
          // Local file path fallback
          const filePath = path.join(process.cwd(), "public", record.meterPhotoUrl);
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase().replace(".", "");
            const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            meterPhotoBase64 = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
          }
        }
      } catch (e) {
        console.error("Failed to load meter photo for PDF:", e);
      }
    }

    // Generate PDF stream
    const stream = await renderToStream(<InvoiceDocument record={record} qrDataUri={qrDataUri} meterPhotoBase64={meterPhotoBase64} />);

    // Return the PDF stream as a response
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${record.tenant.name.replace(/\s+/g, "_")}-${getMonthName(record.month)}-${record.year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Invoice Generation Error]", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
