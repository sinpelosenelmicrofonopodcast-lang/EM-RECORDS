import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EM Records LLC",
    short_name: "EM Records",
    description: "Disquera urbana latina con visión internacional.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: absoluteUrl("/icon.svg"),
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
