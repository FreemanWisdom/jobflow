import { PrismaClient, JobPriority, JobStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const developmentUsers = [
  { email: "alex@jobflow.local", name: "Alex Morgan", password: "jobflow-demo-123" },
  { email: "sam@jobflow.local", name: "Sam Rivera", password: "jobflow-demo-123" },
] as const;

const jobs = [
  { id: "dev-corporate-website", title: "Corporate Website Redesign", description: "Rework the information architecture and visual system for a growing technology company.", client: "Northstar Digital", status: JobStatus.IN_PROGRESS, priority: JobPriority.HIGH, deadline: "2026-08-28", budget: "12500.00", progress: 68 },
  { id: "dev-ecommerce-store", title: "E-commerce Store", description: "Launch a conversion-focused storefront with product search, checkout, and order tracking.", client: "Pine & Parcel", status: JobStatus.PLANNING, priority: JobPriority.URGENT, deadline: "2026-09-10", budget: "18400.00", progress: 18 },
  { id: "dev-restaurant-website", title: "Restaurant Website", description: "Create a warm, accessible site with menus, reservations, and location details.", client: "Juniper Kitchen", status: JobStatus.IN_PROGRESS, priority: JobPriority.MEDIUM, deadline: "2026-09-03", budget: "6200.00", progress: 54 },
  { id: "dev-portfolio-website", title: "Portfolio Website", description: "Build a focused portfolio for a product photographer showcasing selected campaigns.", client: "Mara Ellis Studio", status: JobStatus.COMPLETED, priority: JobPriority.LOW, deadline: "2026-08-20", budget: "3900.00", progress: 100 },
  { id: "dev-saas-landing-page", title: "SaaS Landing Page", description: "Clarify the product story and improve the trial sign-up path for a workflow platform.", client: "Relay Desk", status: JobStatus.IN_PROGRESS, priority: JobPriority.HIGH, deadline: "2026-09-17", budget: "7800.00", progress: 42 },
  { id: "dev-school-dashboard", title: "School Management Dashboard", description: "Design a practical dashboard for attendance, grades, schedules, and staff announcements.", client: "Cedar Grove Academy", status: JobStatus.ON_HOLD, priority: JobPriority.HIGH, deadline: "2026-10-02", budget: "21600.00", progress: 31 },
  { id: "dev-mobile-app-landing", title: "Mobile App Landing Page", description: "Prepare a launch page with feature storytelling, screenshots, and app-store calls to action.", client: "Orbit Health", status: JobStatus.PLANNING, priority: JobPriority.MEDIUM, deadline: "2026-09-24", budget: "5400.00", progress: 8 },
  { id: "dev-business-maintenance", title: "Business Website Maintenance", description: "Handle quarterly content updates, accessibility fixes, and performance improvements.", client: "Harbor & Co.", status: JobStatus.IN_PROGRESS, priority: JobPriority.LOW, deadline: "2026-08-26", budget: "2400.00", progress: 76 },
  { id: "dev-api-integration", title: "API Integration", description: "Connect the customer portal to the inventory service and add resilient error states.", client: "Atlas Supply", status: JobStatus.CANCELLED, priority: JobPriority.MEDIUM, deadline: "2026-09-08", budget: "9100.00", progress: 12 },
  { id: "dev-admin-dashboard", title: "Admin Dashboard", description: "Give the operations team a clear view of accounts, approvals, and service health.", client: "Clearpath Services", status: JobStatus.PLANNING, priority: JobPriority.URGENT, deadline: "2026-10-16", budget: "15200.00", progress: 4 },
] as const;

async function main() {
  const [userA, userB] = await Promise.all(developmentUsers.map(async (dev) => prisma.user.upsert({
    where: { email: dev.email },
    update: { name: dev.name, passwordHash: await hash(dev.password, 12) },
    create: { name: dev.name, email: dev.email, passwordHash: await hash(dev.password, 12) },
  })));

  const jobAssignments = [
    [userA.id, jobs.slice(0, 5)],
    [userB.id, jobs.slice(5)],
  ] as const;

  for (const [userId, userJobs] of jobAssignments) {
    for (const job of userJobs) {
      await prisma.job.upsert({
        where: { id: job.id },
        update: { ...job, deadline: new Date(`${job.deadline}T00:00:00.000Z`), userId },
        create: { ...job, deadline: new Date(`${job.deadline}T00:00:00.000Z`), userId },
      });
    }
  }
  console.log(`Seeded ${jobs.length} development jobs across ${userA.email} and ${userB.email}.`);
}

main().catch((error) => {
  console.error("Database seed failed", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
