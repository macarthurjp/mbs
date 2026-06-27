export function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f4ec] px-6 text-center">
      <div className="rounded-[2rem] border border-[#e9e2d3] bg-white/90 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-black text-[#050505]">Algo salió mal</h1>
        <p className="mb-6 text-[#52525b]">
          Ocurrió un error inesperado. Ya quedó registrado y lo vamos a revisar.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-[#050505] px-5 py-3 font-black text-[#f4c542]"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
