"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toast dùng chung (sonner). richColors → success xanh / error đỏ. */
export function Toaster(props: ToasterProps) {
  return <Sonner richColors position="top-right" closeButton {...props} />;
}
