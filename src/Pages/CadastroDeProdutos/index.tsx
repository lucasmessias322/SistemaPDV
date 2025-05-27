import React, {
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
  useEffect,
} from "react";
import * as C from "../../style";
import styled from "styled-components";
import { FiPlus, FiX, FiTrash, FiEdit2 } from "react-icons/fi";
import { CiExport, CiImport } from "react-icons/ci";
import SideBar from "../../Components/SideBar";
import * as XLSX from "xlsx";
import {
  addProduto,
  getProdutos,
  deleteProduto,
  updateProduto,
} from "../../db";

type Produto = {
  nome: string;
  codigo: string;
  ean: string;
  precoVenda: string;
  precoCusto: string;
  categoria: string;
  estoque: string;
  alertaEstoque: string; // novo campo
};

// Tipagem para erros de validação
type Errors = Partial<Record<keyof Produto, string>>;

const categoriasDisponiveis = [
  "",
  "Eletrônicos",
  "Alimentos",
  "Bebidas",
  "Limpeza",
  "Outros",
];

function CadastroDeProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  // 2) Estado inicial em useState:
  const [novoProduto, setNovoProduto] = useState<Produto>({
    nome: "",
    codigo: "",
    ean: "",
    precoVenda: "",
    precoCusto: "",
    categoria: "",
    estoque: "",
    alertaEstoque: "0",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [editando, setEditando] = useState(false);
  const eanRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar produtos
  useEffect(() => {
    (async () => {
      const dados = await getProdutos();
      setProdutos(dados);
    })();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNovoProduto((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const abrirModalNovo = () => {
    setEditando(false);
    setNovoProduto({
      nome: "",
      codigo: "",
      ean: "",
      precoVenda: "",
      precoCusto: "",
      categoria: "",
      estoque: "",
    });
    setErrors({});
    setModalAberto(true);
  };

  const abrirModalEditar = (p: Produto) => {
    setEditando(true);
    setNovoProduto(p);
    setErrors({});
    setModalAberto(true);
  };

  const fecharModal = () => setModalAberto(false);

  const calcularLucro = (p: Produto) => {
    const venda = parseFloat(p.precoVenda) || 0;
    const custo = parseFloat(p.precoCusto) || 0;
    return (venda - custo).toFixed(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Errors = {};
    if (!/^\d{13}$/.test(novoProduto.ean))
      newErrors.ean = "EAN-13 deve ter 13 dígitos.";
    if (!editando && produtos.some((p) => p.codigo === novoProduto.codigo))
      newErrors.codigo = "Código já existe.";
    if (!editando && produtos.some((p) => p.ean === novoProduto.ean))
      newErrors.ean = "EAN já cadastrado.";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      if (newErrors.ean && eanRef.current) eanRef.current.focus();
      return;
    }
    const produtoSalvo = {
      ...novoProduto,
      categoria: novoProduto.categoria || "SEM CATEGORIA",
    };
    if (editando) {
      await updateProduto(produtoSalvo);
      setProdutos((prev) =>
        prev.map((p) => (p.codigo === produtoSalvo.codigo ? produtoSalvo : p))
      );
    } else {
      await addProduto(produtoSalvo);
      setProdutos((prev) => [...prev, produtoSalvo]);
    }
    fecharModal();
  };

  const handleDeletar = async (codigo: string) => {
    if (!window.confirm("Deseja excluir?")) return;
    await deleteProduto(codigo);
    setProdutos((prev) => prev.filter((p) => p.codigo !== codigo));
  };

  const exportarParaExcel = () => {
    const dados = produtos.map((p) => ({
      Código: p.codigo,
      Nome: p.nome,
      EAN13: p.ean,
      "Preço Venda": p.precoVenda,
      "Preço Custo": p.precoCusto,
      Lucro: calcularLucro(p),
      Categoria: p.categoria,
      Estoque: p.estoque,
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos.xlsx");
  };

  const importarDeExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Partial<Produto>>(sheet);
      const novos: Produto[] = json.map((r) => ({
        codigo: String(r.Código || r.codigo || ""),
        nome: String(r.Nome || r.nome || ""),
        ean: String(r.EAN13 || r.ean || ""),
        precoVenda: String(r["Preço Venda"] || r.precoVenda || "0"),
        precoCusto: String(r["Preço Custo"] || r.precoCusto || "0"),
        categoria: String(r.Categoria || r.categoria || ""),
        estoque: String(r.Estoque || r.estoque || "0"),
      }));
      for (const p of novos) await addProduto(p);
      const atual = await getProdutos();
      setProdutos(atual);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <C.Container>
      <SideBar />
      <C.Main>
        <Header>
          <h1>Produtos</h1>
          <HeaderRight>
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={importarDeExcel}
              style={{ display: "none" }}
            />
            <Button primary onClick={() => fileInputRef.current?.click()}>
              <CiImport /> Importar
            </Button>
            <Button primary onClick={exportarParaExcel}>
              <CiExport /> Exportar
            </Button>
            <Button primary onClick={abrirModalNovo}>
              <FiPlus /> Novo
            </Button>
          </HeaderRight>
        </Header>
        <TableContainer>
          <ProductsTable>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>EAN</th>
                <th>PreçoV</th>
                <th>PreçoC</th>
                <th>Lucro</th>
                <th>Cat</th>
                <th>Est</th>
                <th>Alerta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={9}>Sem produtos</td>
                </tr>
              ) : (
                produtos.map((p) => (
                  <tr key={p.codigo}>
                    <td>{p.codigo}</td>
                    <td>{p.nome}</td>
                    <td>{p.ean}</td>
                    <td>{p.precoVenda}</td>
                    <td>{p.precoCusto}</td>
                    <td>{calcularLucro(p)}</td>
                    <td>{p.categoria}</td>
                    <td>{p.estoque}</td>
                    <td>
                      <ActionBTN onClick={() => abrirModalEditar(p)}>
                        <FiEdit2 />
                      </ActionBTN>
                      <ActionBTN onClick={() => handleDeletar(p.codigo)}>
                        <FiTrash />
                      </ActionBTN>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ProductsTable>
        </TableContainer>
        {modalAberto && (
          <ModalOverlay>
            <ModalContent>
              <ModalHeader>
                <h2>{editando ? "Editar" : "Novo"} Produto</h2>
                <CloseButton onClick={fecharModal}>
                  <FiX />
                </CloseButton>
              </ModalHeader>
              <Form onSubmit={handleSubmit}>
                <div className="formItem">
                  <div>
                    <label>Código*</label>
                    <input
                      type="text"
                      name="codigo"
                      value={novoProduto.codigo}
                      onChange={handleChange}
                      required
                      className={errors.codigo ? "has-error" : ""}
                      style={{ maxWidth: "100px" }}
                    />
                    {errors.codigo && <ErrorMsg>{errors.codigo}</ErrorMsg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Nome*</label>
                    <input
                      type="text"
                      name="nome"
                      value={novoProduto.nome}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <FormField>
                  <label>EAN-13*</label>
                  <input
                    type="text"
                    name="ean"
                    value={novoProduto.ean}
                    onChange={handleChange}
                    placeholder="13 dígitos"
                    maxLength={13}
                    pattern="\d{13}"
                    ref={eanRef}
                    required
                    className={errors.ean ? "has-error" : ""}
                  />
                  {errors.ean && <ErrorMsg>{errors.ean}</ErrorMsg>}
                </FormField>

                <div className="formItem">
                  <FormField>
                    <label>Preço de Custo*</label>
                    <input
                      type="number"
                      step="0.01"
                      name="precoCusto"
                      value={novoProduto.precoCusto}
                      onChange={handleChange}
                      required
                    />
                  </FormField>
                  <FormField>
                    <label>Preço de Venda*</label>
                    <input
                      type="number"
                      step="0.01"
                      name="precoVenda"
                      value={novoProduto.precoVenda}
                      onChange={handleChange}
                      required
                    />
                  </FormField>
                </div>

                <FormField>
                  <label>Categoria</label>
                  <StyledSelect
                    name="categoria"
                    value={novoProduto.categoria}
                    onChange={handleChange}
                  >
                    {categoriasDisponiveis.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "" ? "SEM CATEGORIA" : cat}
                      </option>
                    ))}
                  </StyledSelect>
                </FormField>

                <FormField>
                  <label>Estoque*</label>
                  <input
                    type="number"
                    name="estoque"
                    value={novoProduto.estoque}
                    onChange={handleChange}
                    required
                  />
                </FormField>
                <Button type="submit">Salvar</Button>
              </Form>
            </ModalContent>
          </ModalOverlay>
        )}
      </C.Main>
    </C.Container>
  );
}

export default CadastroDeProdutos;

// styled (sem alterações)


const Header = styled.div`
  background-color: #ffffff;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
`;

const HeaderLeft = styled.div``;
const HeaderRight = styled.div`
  display: flex;
  align-items: center;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  margin: 0px 5px;
  font-size: 1rem;
  background-color: ${(props) => (props.primary ? "#41415f" : "#6c757d")};
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background-color: ${(props) => (props.primary ? "#2d2d42" : "#5a6268")};
  }
`;

const TableContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const ProductsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  th,
  td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #eaeaea;
  }

  th {
    background-color: #f1f1f1;
    font-weight: 600;
  }

  tr:hover td {
    background-color: #f9f9f9;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 700px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
`;

const Form = styled.form`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 15px;

  input.has-error {
    border-color: #e74c3c;
    background-color: #fdecea;
  }

  label {
    font-weight: 500;
    color: #333;
  }

  input {
    padding: 8px;
    font-size: 1rem;
    border: 0px;
    border: 1px solid #ccc;
    border-radius: 5px;

    margin: 4px;
    outline: none;
  }

  div.inputContainer {
    display: flex;
    flex-direction: column;
  }

  div.formItem {
    display: flex;
    align-items: center;

    div {
      display: flex;
      flex-direction: column;

      input[name="codigo"] {
        width: 100px;
      }
      input[name="nome"] {
        width: 100%;
      }
    }
  }
`;

const FormField = styled.div<{ fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
`;

const ErrorMsg = styled.span`
  font-size: 0.875rem;
  color: #e74c3c;
  margin-top: 4px;
  display: block;
`;

const StyledSelect = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 32px 8px 12px;
  font-size: 1rem;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2214%22%20height%3D%227%22%20viewBox%3D%220%200%2014%207%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%201l6%205%206-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px 7px;

  &:focus {
    outline: none;
    border-color: #61dafb;
    box-shadow: 0 0 0 2px rgba(97, 218, 251, 0.5);
  }
`;

const ActionBTN = styled.button`
  padding: 10px;
  background-color: transparent;
  border: none;

  &:hover {
    color: red;
    transform: scale(1.1);
  }
`;
