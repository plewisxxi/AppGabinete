import React, { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";
import API from "../api";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalSum = data.sum_facturadas + data.sum_no_facturadas;
        return (
            <div className="custom-tooltip" style={{
                backgroundColor: '#fff',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
                <p style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
                    <strong>Total: {totalSum.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong>
                </p>
                <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0', paddingTop: '8px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#10b981', fontSize: '13px' }}>
                        Facturado: {data.sum_facturadas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({data.count_facturadas} ses.)
                    </p>
                    <p style={{ margin: '0', color: '#ef4444', fontSize: '13px' }}>
                        No Facturado: {data.sum_no_facturadas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({data.count_no_facturadas} ses.)
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [groupingEstado, setGroupingEstado] = useState("monthly");
    const [groupingFact, setGroupingFact] = useState("monthly");

    const [estadoData, setEstadoData] = useState([]);
    const [facturacionData, setFacturacionData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [year, groupingEstado, groupingFact]);

    async function loadData() {
        setLoading(true);
        try {
            const [resEstado, resFact] = await Promise.all([
                API.fetchStats("sesiones-estado", { year, group_by: groupingEstado }),
                API.fetchStats("facturacion-total", { year, group_by: groupingFact })
            ]);
            setEstadoData(resEstado);
            setFacturacionData(resFact);
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }

    const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

    const GroupingSelector = ({ current, onChange }) => (
        <div style={{ display: 'flex', gap: 8 }}>
            {['monthly', 'quarterly', 'yearly'].map(mode => (
                <button
                    key={mode}
                    className={current === mode ? 'primary' : ''}
                    onClick={() => onChange(mode)}
                    style={{ padding: '4px 12px', fontSize: 12, textTransform: 'capitalize' }}
                >
                    {mode === 'monthly' ? 'Mensual' : mode === 'quarterly' ? 'Trimestral' : 'Anual'}
                </button>
            ))}
        </div>
    );

    return (
        <div className="dashboard-container">
            <div className="header" style={{ marginBottom: 32 }}>
                <h2>Métricas y Estadísticas</h2>
                <div className="controls">
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 32 }}>

                {/* Gráfico 1: Sesiones Facturadas vs No Facturadas (Importes) */}
                <div className="card" style={{ height: 450 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>Estado de Sesiones (€)</h3>
                        <GroupingSelector current={groupingEstado} onChange={setGroupingEstado} />
                    </div>

                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <BarChart data={estadoData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}€`} />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend iconType="circle" />
                                <Bar name="Facturado" dataKey="sum_facturadas" stackId="a" fill="#10b981" />
                                <Bar name="No Facturado" dataKey="sum_no_facturadas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: Facturación Total */}
                <div className="card" style={{ height: 450 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>Total Facturado (€)</h3>
                        <GroupingSelector current={groupingFact} onChange={setGroupingFact} />
                    </div>

                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <BarChart data={facturacionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value) => [`${value.toLocaleString('es-ES')} €`, 'Total']}
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
