import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dasboard from "./Pages/DashBoard";
import CadastroDeProdutos from "./Pages/CadastroDeProdutos";
import Caixa from "./Pages/Caixa";

// Importação das páginas

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dasboard />} />
        <Route path="/cadastroproduto" element={<CadastroDeProdutos />} />
        <Route path="/caixa" element={<Caixa />} />

        {/* Redirecionamento de rotas inválidas */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
