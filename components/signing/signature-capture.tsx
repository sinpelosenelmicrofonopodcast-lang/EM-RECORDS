"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SignatureCaptureProps = {
  signerNameDefault?: string;
  signerEmailDefault?: string;
  signerNameField?: string;
  signatureField?: string;
  consentField?: string;
  className?: string;
};

type Point = { x: number; y: number };

function getPoint(event: PointerEvent, rect: DOMRect): Point {
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function drawTypedSignature(name: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 680;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#c6a85b";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.fillStyle = "#f4f4f5";
  ctx.font = "64px 'Snell Roundhand', 'Segoe Script', cursive";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 32, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

export function SignatureCapture({
  signerNameDefault = "",
  signerEmailDefault = "",
  signerNameField = "signer_name",
  signatureField = "signature_data",
  consentField = "consent_accepted",
  className = ""
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(signerNameDefault);
  const [typedSignature, setTypedSignature] = useState(signerNameDefault);
  const [signatureData, setSignatureData] = useState("");

  const canUseTyped = typedSignature.trim().length > 1;
  const typedPreview = useMemo(() => {
    if (!canUseTyped) return "";
    return drawTypedSignature(typedSignature.trim());
  }, [canUseTyped, typedSignature]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(198,168,91,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }, []);

  function commitCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL("image/png"));
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(198,168,91,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    setSignatureData("");
  }

  useEffect(() => {
    if (mode === "type") {
      setSignatureData(typedPreview);
    }
  }, [mode, typedPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (mode !== "draw") return;
      const rect = canvas.getBoundingClientRect();
      const point = getPoint(event, rect);
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.strokeStyle = "#f4f4f5";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDrawing || mode !== "draw") return;
      const rect = canvas.getBoundingClientRect();
      const point = getPoint(event, rect);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const handlePointerUp = () => {
      if (!isDrawing || mode !== "draw") return;
      setIsDrawing(false);
      commitCanvas();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDrawing, mode]);

  return (
    <div className={`space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4 ${className}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-white/60">Signer Name</span>
          <input
            name={signerNameField}
            required
            value={signerName}
            onChange={(event) => {
              setSignerName(event.target.value);
              if (!typedSignature || typedSignature === signerNameDefault) {
                setTypedSignature(event.target.value);
              }
            }}
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-white/60">Signer Email</span>
          <input
            value={signerEmailDefault}
            readOnly
            className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white/70 outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${mode === "draw" ? "border-gold bg-gold/20 text-gold" : "border-white/20 text-white/70"}`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${mode === "type" ? "border-gold bg-gold/20 text-gold" : "border-white/20 text-white/70"}`}
        >
          Type Signature
        </button>
        <button type="button" onClick={clearCanvas} className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/70">
          Clear
        </button>
      </div>

      {mode === "draw" ? (
        <canvas ref={canvasRef} width={680} height={220} className="h-44 w-full rounded-xl border border-white/10 bg-black touch-none" />
      ) : (
        <div className="space-y-3">
          <input
            value={typedSignature}
            onChange={(event) => setTypedSignature(event.target.value)}
            placeholder="Type your legal signature"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <div className="rounded-xl border border-white/10 bg-black p-2">
            {typedPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={typedPreview} alt="Typed signature preview" className="h-32 w-full rounded-lg object-contain" />
            ) : (
              <p className="px-3 py-8 text-center text-sm text-white/55">Type your signature to preview.</p>
            )}
          </div>
        </div>
      )}

      <input type="hidden" name={signatureField} value={signatureData} required />

      <label className="flex items-start gap-2 text-sm text-white/75">
        <input name={consentField} type="checkbox" required className="mt-1 h-4 w-4 rounded border-white/40 bg-black text-gold focus:ring-gold/40" />
        <span>I consent to electronic records and electronic signatures for this agreement.</span>
      </label>
    </div>
  );
}

