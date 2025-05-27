import styled from "styled-components";
import { FiBox, FiClipboard, FiShoppingCart } from "react-icons/fi";
import { MdOutlineDashboard } from "react-icons/md";
export default function SideBar() {
  return (
    <SideBarContainer>
      <Logo>Sistema PDV</Logo>
      <Nav>
        <NavItem href="/">
          <MdOutlineDashboard />
          <span>Dashboard</span>
        </NavItem>
        <NavItem href="/cadastroproduto">
          <FiClipboard />
          <span>Cadastro de Produtos</span>
        </NavItem>
        <NavItem href="#">
          <FiBox />
          <span>Estoque</span>
        </NavItem>
        <NavItem href="/caixa">
          <FiShoppingCart />
          <span>Caixa</span>
        </NavItem>
      </Nav>
    </SideBarContainer>
  );
}

const SideBarContainer = styled.div`
  width: 225px;
  height: 100vh;
  height: 100%;
  position: fixed;
  z-index: 9999;

  background-color: #1f1f2e;
  color: #e2e2e2;
  padding: 30px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Logo = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: #61dafb;
`;

const Nav = styled.nav`
  width: 100%;
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 5px;
  margin-bottom: 10px;
  border-radius: 8px;
  font-size: 1rem;
  color: #e2e2e2;
  text-decoration: none;
  transition: background 0.3s;

  &:hover {
    background-color: #323248;
    color: #ffffff;
  }
`;
