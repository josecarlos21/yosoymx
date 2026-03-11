import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const pathname = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") || "/" : "/";
const RootComponent =
  pathname === "/admin" || pathname.startsWith("/admin/")
    ? lazy(() => import("./AdminApp.tsx"))
    : lazy(() => import("./App.tsx"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f1e8] px-6 text-center text-sm font-medium text-[#5d4535]">
          Cargando edición…
        </div>
      }
    >
      <RootComponent />
    </Suspense>
  </StrictMode>,
);
