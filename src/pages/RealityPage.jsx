// src/pages/RealityPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ChevronLeft
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { simulateReality } from "../reality.mjs"; // ajuste o caminho
import pets from "../pets.json"; // ajuste se seu dataset estiver noutro lugar

export default function RealityPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSeed = searchParams.get("seed") ?? "";
    const [seedInput, setSeedInput] = useState(initialSeed);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const logRef = useRef(null);

    // seed numérico (ou undefined)
    const parsedSeed = useMemo(() => {
        if (seedInput === "" || seedInput == null) return undefined;
        const n = Number(seedInput);
        return Number.isFinite(n) ? Math.trunc(n) : undefined;
    }, [seedInput]);

    const run = async (seedArg) => {
        setRunning(true);
        try {
            // se não passar seed, usa um aleatório (reprodutível ao mostrar no log)
            const seed = seedArg ?? Math.floor(Math.random() * 2_147_483_647);
            const { logs, vencedor, seed: usedSeed } = simulateReality(pets, { seed, maxLogs: Infinity });
            setResult({ logs, vencedor, seed: usedSeed ?? seed });

            // atualiza a URL com o seed (sem recarregar a página)
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("seed", String(usedSeed ?? seed));
                return next;
            });
        } catch (err) {
            console.error(err);
            setResult({ logs: [`❌ Erro: ${String(err)}`], vencedor: null, seed: seedArg });
        } finally {
            setRunning(false);
            // auto-scroll pro topo
            if (logRef.current) logRef.current.scrollTop = 0;
        }
    };

    // se /reality?seed=123, executa automaticamente na primeira montagem
    useEffect(() => {
        if (initialSeed !== "" && result == null && !running) {
            const n = Number(initialSeed);
            run(Number.isFinite(n) ? Math.trunc(n) : undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        run(parsedSeed);
    };

    const handleClear = () => {
        setResult(null);
        setSeedInput("");
        setSearchParams({});
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold mb-2">Simulação – Reality dos Pets</h1>
                <p className="text-sm text-gray-600 mb-6">
                    Rode uma simulação do BBB dos pets. Opcionalmente passe um seed para reprodutibilidade.
                </p>

                <form onSubmit={handleSubmit} className="flex items-end gap-3 mb-4">
                    <label className="flex-1">
                        <span className="block text-sm font-medium text-gray-700">Seed (opcional)</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={seedInput}
                            onChange={(e) => setSeedInput(e.target.value)}
                            placeholder="ex.: 12345"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={running}
                        className="cursor-pointer rounded-lg px-4 py-2 bg-indigo-600 text-white font-medium shadow hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {running ? "Rodando..." : "Rodar simulação"}
                    </button>

                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={running}
                        className="cursor-pointer rounded-lg px-4 py-2 bg-gray-200 text-gray-800 font-medium shadow hover:bg-gray-300 disabled:opacity-60"
                    >
                        Limpar
                    </button>
                    <Link
                        to="/"
                        className="cursor-pointer inline-flex items-center rounded-lg px-4 py-2 bg-gray-200 text-gray-800 font-medium shadow hover:bg-gray-300 disabled:opacity-60"
                    >
                        <ChevronLeft className='w-4 h-4' /> Voltar
                    </Link>
                </form>

                {result && (
                    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="text-sm text-gray-700">
                                <strong>Vencedor:</strong> {result.vencedor ?? "—"}{" "}
                                <span className="mx-2">•</span>
                                <strong>Seed:</strong> {result.seed ?? "—"}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!result?.logs) return;
                                        const blob = new Blob([result.logs.join("\n")], { type: "text/plain;charset=utf-8" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `reality-log-seed-${result.seed ?? "NA"}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="cursor-pointer rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                                >
                                    Baixar log
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!result?.logs) return;
                                        navigator.clipboard.writeText(result.logs.join("\n"));
                                    }}
                                    className="cursor-pointer rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                                >
                                    Copiar log
                                </button>
                            </div>
                        </div>

                        <div
                            ref={logRef}
                            className="h-[60vh] overflow-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-sm leading-6"
                        >
                            <pre className="whitespace-pre-wrap">{result.logs?.join("\n")}</pre>
                        </div>
                    </div>
                )}

                {!result && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500 text-sm">
                        O log aparecerá aqui após rodar a simulação.
                    </div>
                )}
            </div>
        </div>
    );
}
