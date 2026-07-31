import { prisma } from "@/lib/prisma";

/**
 * Ensures that every active, non-deleted tenant has a RentRecord
 * initialized for the CURRENT calendar month and year.
 * 
 * Rules:
 * 1. On the 1st of every month (or upon first access in a new month), a new RentRecord is created.
 * 2. Default status for new month: "PENDING" (or "OVERDUE" if past the 5th of the month).
 * 3. Default totalAmount: tenant.rentAmount.
 * 4. Default amountPaid: 0.
 * 5. If amountPaid < totalAmount, the status remains PENDING / PARTIAL.
 * 6. Only when amountPaid >= totalAmount does status become PAID.
 */
export async function ensureCurrentMonthRentRecords() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Fetch all active, non-deleted tenants
    const activeTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      include: {
        rentRecords: {
          where: {
            month: currentMonth,
            year: currentYear,
          },
        },
      },
    });

    const dueDate = new Date(currentYear, currentMonth - 1, 10);
    const initialStatus = currentDay > 5 ? "OVERDUE" : "PENDING";

    for (const tenant of activeTenants) {
      // If no rent record exists for the current month/year, create one!
      if (!tenant.rentRecords || tenant.rentRecords.length === 0) {
        await prisma.rentRecord.create({
          data: {
            tenantId: tenant.id,
            month: currentMonth,
            year: currentYear,
            rentAmount: tenant.rentAmount,
            electricityBill: 0,
            maintenanceCharge: 0,
            lateFee: 0,
            discount: 0,
            totalAmount: tenant.rentAmount,
            amountPaid: 0,
            status: initialStatus,
            dueDate,
          },
        });
      } else {
        // If record exists, verify its status based on amountPaid vs totalAmount
        const record = tenant.rentRecords[0];
        let correctStatus = record.status;

        if (record.amountPaid >= record.totalAmount && record.totalAmount > 0) {
          correctStatus = "PAID";
        } else if (record.amountPaid > 0 && record.amountPaid < record.totalAmount) {
          correctStatus = "PARTIAL";
        } else if (record.amountPaid === 0) {
          correctStatus = currentDay > 5 ? "OVERDUE" : "PENDING";
        }

        if (correctStatus !== record.status) {
          await prisma.rentRecord.update({
            where: { id: record.id },
            data: { status: correctStatus },
          });
        }
      }
    }
  } catch (err) {
    console.error("Error in ensureCurrentMonthRentRecords:", err);
  }
}
