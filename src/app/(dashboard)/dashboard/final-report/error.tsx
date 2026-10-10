"use client";

export default function ReportError({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-semibold">No se pudo cargar el informe</h1>
      <p>Comprueba la conexión y vuelve a intentarlo.</p>
      <button className="rounded-lg border px-4 py-3" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
