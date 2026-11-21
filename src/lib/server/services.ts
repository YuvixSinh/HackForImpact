import "server-only";
import type { BookingService } from "@/lib/autopilot/run";
import { createBookingService } from "@/lib/bookings/service";
import type { Repositories } from "@/lib/db/repositories";
import { createPaymentAdapter, type PaymentAdapter } from "@/lib/payments";
import { getAppContext } from "./app-context";

export type Services = { repos: Repositories; payments: PaymentAdapter; booking: BookingService };

/**
 * Server-only service graph. One payment adapter per process so testing references stay unique;
 * it is rebuilt whenever the app context is replaced (for example by a demo reset).
 */
const holder = globalThis as typeof globalThis & { __autoshipServices?: { repos: Repositories; services: Services } };

export function getServices(): Services {
  const { repos } = getAppContext();
  if (holder.__autoshipServices?.repos !== repos) {
    const payments = createPaymentAdapter();
    holder.__autoshipServices = { repos, services: { repos, payments, booking: createBookingService({ repos, payments }) } };
  }
  return holder.__autoshipServices.services;
}
