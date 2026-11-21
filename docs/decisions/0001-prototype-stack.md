# 0001: Use a typed Next.js prototype with replaceable service adapters

- Status: accepted
- Date: 2026-11-21

## Context

AutoShip needs a working web prototype now while preserving a path to real authentication, payments, routing, tracking, and provider integrations. The demo must be deterministic and safe to run without production credentials.

## Decision

Use a TypeScript Next.js application with Tailwind CSS and server-side route handlers. Use Supabase Auth/Postgres and row-level security where available. Put SolvaPay, tracking, routing, notifications, and capacity access behind interfaces with deterministic mock/testing adapters.

## Consequences

The primary demo can run consistently with seeded data and no production payments. External services can be introduced without rewriting matching, policy, or booking flows. The project must maintain adapter contracts and keep secrets server-side.
