import { extend } from "@pixi/react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Container, Graphics } from "pixi.js";

export const Route = createRootRoute({ component: Root });

extend({ Container, Graphics });

function Root() {
  return <Outlet />;
}
