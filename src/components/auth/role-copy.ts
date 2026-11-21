import type { SignupRole } from "@/lib/auth/roles";

export const ROLE_COPY: Record<SignupRole, { title: string; description: string; nameLabel: string }> = {
  "business-shipper": {
    title: "Business shipper",
    description: "Move stock and orders for your company.",
    nameLabel: "Business name",
  },
  "individual-shipper": {
    title: "Individual shipper",
    description: "Send goods as a sole trader or private person.",
    nameLabel: "Your name",
  },
  provider: {
    title: "Transport provider",
    description: "List spare road, sea, or air capacity.",
    nameLabel: "Company name",
  },
};
