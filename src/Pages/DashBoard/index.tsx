import React, { useEffect, useState } from "react";
import * as C from "../../style";
import SideBar from "../../Components/SideBar";
import styled from "styled-components";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getVendas } from "../../db";

// Tipagens
interface VendaDiaria {
  data: string;
  total: number;
}

interface PagamentoBreakdown {
  metodo: string;
  valor: number;
}

interface ProdutoTop {
  nome: string;
  quantidade: number;
}

interface Alerta {
  tipo: string;
  mensagem: string;
  nivel: "info" | "warning" | "danger";
}

export default function Dashboard(): JSX.Element {
  const [vendasDiarias, setVendasDiarias] = useState<VendaDiaria[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoBreakdown[]>([]);
  const [topProdutos, setTopProdutos] = useState<ProdutoTop[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    (async () => {
      const todas = await getVendas(); // array de Venda[]

      // 1. Vendas Diárias
      const hoje = new Date();
      const dias7 = Array.from({ length: 7 }).map((_, i) => {
        const dt = new Date();
        dt.setDate(hoje.getDate() - (6 - i));
        return dt;
      });

      const vendasDiarias: VendaDiaria[] = dias7.map((dt) => {
        const diaISO = dt.toISOString().slice(0, 10);
        const totalDia = todas
          .filter((v) => v.data.slice(0, 10) === diaISO)
          .reduce((sum, v) => sum + v.total, 0);
        return {
          data: dt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          total: totalDia,
        };
      });
      setVendasDiarias(vendasDiarias);

      // 2. Receita por forma de pagamento
      const recibos: Record<string, number> = {
        Dinheiro: 0,
        Cartão: 0,
        PIX: 0,
      };
      todas.forEach((v) => {
        recibos[v.pagamento] = (recibos[v.pagamento] || 0) + v.total;
      });
      setPagamentos(
        Object.keys(recibos).map((m) => ({
          metodo: m,
          valor: recibos[m],
        }))
      );

      // 3. Top Produtos
      const contador: Record<string, number> = {};
      todas.forEach((v) =>
        v.itens.forEach((i) => {
          contador[i.nome] = (contador[i.nome] || 0) + i.quantidade;
        })
      );
      const top = Object.entries(contador)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
      setTopProdutos(top);

      // 4. Alertas
      const novosAlertas: Alerta[] = [];

      // Verificar queda de vendas no último dia
      const mediaVendas =
        vendasDiarias.reduce((sum, v) => sum + v.total, 0) /
        (vendasDiarias.length || 1);

      const ultimoDia = vendasDiarias[vendasDiarias.length - 1];
      if (ultimoDia && ultimoDia.total < mediaVendas * 0.5) {
        novosAlertas.push({
          tipo: "Baixa de Vendas",
          mensagem: `Vendas muito abaixo da média no dia ${ultimoDia.data}.`,
          nivel: "warning",
        });
      }

      // Produto com venda muito alta
      if (top.length > 0 && top[0].quantidade > 100) {
        novosAlertas.push({
          tipo: "Alta Venda",
          mensagem: `O produto "${top[0].nome}" teve vendas muito acima do normal.`,
          nivel: "info",
        });
      }

      setAlertas(novosAlertas);
    })();
  }, []);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

  return (
    <C.Container>
      <SideBar />
      <C.Main>
        <Header>
          <h1>Dashboard de Vendas</h1>
        </Header>

        {/* Alertas */}
        {alertas.length > 0 && (
          <AlertasContainer>
            <h2>Alertas</h2>
            {alertas.map((alerta, index) => (
              <AlertaCard key={index} nivel={alerta.nivel}>
                <strong>{alerta.tipo}:</strong> {alerta.mensagem}
              </AlertaCard>
            ))}
          </AlertasContainer>
        )}

        <ChartsGrid>
          <ChartCard>
            <h2>Vendas Diárias (R$)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={vendasDiarias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard>
            <h2>Receita por Forma de Pagamento</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pagamentos}
                  dataKey="valor"
                  nameKey="metodo"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#82ca9d"
                  label
                >
                  {pagamentos.map((entry, index) => (
                    <Cell
                      key={entry.metodo}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard fullWidth>
            <h2>Top 5 Produtos Vendidos</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProdutos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nome" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </ChartsGrid>
      </C.Main>
    </C.Container>
  );
}

// ——— Styled Components ———


const Header = styled.div`
  margin-bottom: 16px;
  h1 {
    font-size: 1.75rem;
    color: #343a40;
  }
`;

const ChartsGrid = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  
`;

const ChartCard = styled.div<{ fullWidth?: boolean }>`
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
   
  h2 {
    margin-bottom: 12px;
    font-size: 1.125rem;
    color: #495057;
  }
`;

// Alertas
const AlertasContainer = styled.div`
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;

  h2 {
    font-size: 1.125rem;
    margin-bottom: 12px;
    color: #495057;
  }
`;

const AlertaCard = styled.div<{ nivel: "info" | "warning" | "danger" }>`
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  background-color: ${({ nivel }) =>
    nivel === "danger"
      ? "#ffe3e3"
      : nivel === "warning"
      ? "#fff3cd"
      : "#e7f5ff"};
  color: ${({ nivel }) =>
    nivel === "danger"
      ? "#c92a2a"
      : nivel === "warning"
      ? "#856404"
      : "#0c5460"};
  border: 1px solid
    ${({ nivel }) =>
      nivel === "danger"
        ? "#f5c2c7"
        : nivel === "warning"
        ? "#ffeeba"
        : "#b6effb"};
`;
