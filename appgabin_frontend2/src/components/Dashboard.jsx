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
    Cell,
    ComposedChart,
    Line
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

const GastosTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const totalSum = (data.total_pagado || 0) + (data.total_pendiente || 0);
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
                        Pagado: {(data.total_pagado || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </p>
                    <p style={{ margin: '0', color: '#ef4444', fontSize: '13px' }}>
                        Pendiente: {(data.total_pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const BeneficiosTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip" style={{
                backgroundColor: '#fff',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
                <p style={{ margin: '0 0 4px 0', color: '#10b981' }}>
                    Ingresos: {data.ingresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
                <p style={{ margin: '0 0 4px 0', color: '#ef4444' }}>
                    Gastos: {data.gastos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
                <p style={{ margin: '0', color: data.diferencia >= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                    Beneficio: {data.diferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
            </div>
        );
    }
    return null;
};


export default function Dashboard() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [groupingEstado, setGroupingEstado] = useState("monthly");
    const [groupingFact, setGroupingFact] = useState("monthly");
    const [groupingGastos, setGroupingGastos] = useState("monthly");
    const [groupingBeneficios, setGroupingBeneficios] = useState("monthly");

    const [estadoData, setEstadoData] = useState([]);
    const [facturacionData, setFacturacionData] = useState([]);
    const [gastosData, setGastosData] = useState([]);
    const [beneficiosData, setBeneficiosData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [year, groupingEstado, groupingFact, groupingGastos, groupingBeneficios]);

    async function loadData() {
        setLoading(true);
        try {
            // Fetch individually to avoid one failing chart blocking others
            API.fetchStats("sesiones-estado", { year, group_by: groupingEstado })
                .then(setEstadoData)
                .catch(err => console.error("Error loading sesiones-estado:", err));

            API.fetchStats("facturacion-total", { year, group_by: groupingFact })
                .then(setFacturacionData)
                .catch(err => console.error("Error loading facturacion-total:", err));

            API.fetchStats("gastos-total", { year, group_by: groupingGastos })
                .then(setGastosData)
                .catch(err => console.error("Error loading gastos-total:", err));

            // Load beneficios data
            loadBeneficiosData();
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadBeneficiosData() {
        try {
            const [factData, gastosData] = await Promise.all([
                API.fetchStats("facturacion-total", { year, group_by: groupingBeneficios }),
                API.fetchStats("gastos-total", { year, group_by: groupingBeneficios })
            ]);

            // Merge data by period
            const merged = {};
            factData.forEach(item => {
                merged[item.name] = { name: item.name, ingresos: item.total || 0, gastos: 0 };
            });
            gastosData.forEach(item => {
                if (merged[item.name]) {
                    merged[item.name].gastos = (item.total_pagado || 0) + (item.total_pendiente || 0);
                } else {
                    merged[item.name] = { name: item.name, ingresos: 0, gastos: (item.total_pagado || 0) + (item.total_pendiente || 0) };
                }
            });

            const beneficios = Object.values(merged).map(item => ({
                ...item,
                diferencia: item.ingresos - item.gastos
            }));

            setBeneficiosData(beneficios);
        } catch (err) {
            console.error("Error loading beneficios data:", err);
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

            <div className="dashboard-grid">

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

                {/* Gráfico 3: Total Gastos */}
                <div className="card" style={{ height: 450 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>Total Gastos (€)</h3>
                        <GroupingSelector current={groupingGastos} onChange={setGroupingGastos} />
                    </div>

                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <BarChart data={gastosData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    content={<GastosTooltip />}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend iconType="circle" />
                                <Bar name="Pagado" dataKey="total_pagado" stackId="a" fill="#10b981" />
                                <Bar name="Pendiente" dataKey="total_pendiente" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 4: Ingresos, Gastos y Beneficios */}
                <div className="card" style={{ height: 450 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18 }}>Ingresos, Gastos y Beneficios (€)</h3>
                        <GroupingSelector current={groupingBeneficios} onChange={setGroupingBeneficios} />
                    </div>

                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={beneficiosData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}€`} />
                                <Tooltip content={<BeneficiosTooltip />} />
                                <Legend iconType="circle" />
                                <Bar name="Ingresos" dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar name="Gastos" dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Line
                                    name="Beneficio"
                                    type="monotone"
                                    dataKey="diferencia"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>



            </div>
        </div>
    );
}
