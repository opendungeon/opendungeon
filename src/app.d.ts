import type { Session } from "#lib/server/database/sessions.js";
import type { Server } from "bun";

declare global {
  namespace App {
    interface Locals {
      session: Session | null;
    }
    interface Platform {
      server?: Server;
      request?: Request;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
  }
}

export {};
