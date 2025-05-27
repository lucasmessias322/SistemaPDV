import React, { useEffect, useState, useRef } from "react";
import * as C from "../../style";
import styled from "styled-components";
import { FiTrash, FiCheck } from "react-icons/fi";
import SideBar from "../../Components/SideBar";
import { addVenda, getProdutos, updateProduto } from "../../db"; // <-- adicionei addVenda aqui
import Select, { SingleValue, ActionMeta } from "react-select";
import { Produto } from "../CadastroDeProdutos";

interface ItemCarrinho extends Produto {
  quantidade: number;
}

type Pagamento = "Dinheiro" | "Cartão" | "PIX";

export default function Caixa() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [selectedOption, setSelectedOption] = useState<
    SingleValue<{
      value: string;
      label: string;
      produto: Produto;
    }>
  >(null);
  const [pagModalAberto, setPagModalAberto] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<Pagamento>("Dinheiro");
  const selectRef = useRef<any>(null);

  // Carrega produtos
  useEffect(() => {
    (async () => {
      const dados = await getProdutos();
      setProdutos(dados);
    })();
  }, []);

  // Opções do select
  const opcoes = produtos.map((p) => ({
    value: p.codigo,
    label: `${p.codigo} – ${p.nome}`,
    produto: p,
  }));

  const beepAudio = new Audio("/Sounds/store-scanner-beep-90395.mp3");

  // Adiciona item ao carrinho
  const handleSelect = (option: any) => {
    if (!option) return;
    const produto: Produto = option.produto;
    const estoqueDisponivel = parseInt(produto.estoque, 10);
    if (estoqueDisponivel <= 0) {
      alert("Produto sem estoque.");
      return;
    }
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.codigo === produto.codigo);
      if (existente) {
        if (existente.quantidade + 1 > estoqueDisponivel) {
          alert("Estoque insuficiente.");
          return prev;
        }
        beepAudio.play();
        return prev.map((i) =>
          i.codigo === produto.codigo
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        );
      }
      beepAudio.play();
      return [...prev, { ...produto, quantidade: 1 }];
    });
    setSelectedOption(null);
    setTimeout(() => selectRef.current?.focus(), 0);
  };

  const removerDoCarrinho = (codigo: string) =>
    setCarrinho((prev) => prev.filter((i) => i.codigo !== codigo));

  const alterarQuantidade = (codigo: string, quantidade: number) =>
    setCarrinho((prev) =>
      prev.map((item) =>
        item.codigo === codigo
          ? {
              ...item,
              quantidade: Math.min(
                Math.max(quantidade, 1),
                parseInt(item.estoque, 10)
              ),
            }
          : item
      )
    );

  const calcularTotal = () =>
    carrinho.reduce(
      (soma, item) => soma + parseFloat(item.precoVenda) * item.quantidade,
      0
    );

  // Abre modal de pagamento
  const iniciarFinalizacao = () => {
    if (carrinho.length === 0) {
      alert("Nenhum item no carrinho.");
      return;
    }
    setPagModalAberto(true);
  };

  // Gera HTML para o cupom
  function gerarCupom(
    itens: ItemCarrinho[],
    total: number,
    pagamento: Pagamento
  ) {
    const linhas = itens
      .map(
        (i) =>
          `<tr>
             <td style="text-align:left;">${i.nome}</td>
             <td style="text-align:right;">${i.quantidade} x R$ ${parseFloat(
            i.precoVenda
          ).toFixed(2)}</td>
           </tr>`
      )
      .join("");
    const data = new Date().toLocaleString("pt-BR");
    return `
      <html>
        <head><style>
          body{font-family:monospace;font-size:12px;}
          table{width:100%;border-collapse:collapse;}
          td{padding:4px 0;}
          .center{text-align:center;}
          .right{text-align:right;}
          hr{border:none;border-top:1px dashed #000;}
        </style></head>
        <body>
          <div class="center">
            <h3>MINHA LOJA LTDA.</h3>
            <p>Rua Exemplo, 123 – Cidade/UF</p>
            <p>CNPJ: 00.000.000/0000-00</p>
          </div><hr/>
          <table>${linhas}</table><hr/>
          <table>
            <tr>
              <td><strong>Total:</strong></td>
              <td class="right"><strong>R$ ${total.toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td>Pagamento:</td>
              <td class="right">${pagamento}</td>
            </tr>
          </table><hr/>
          <div class="center">
            <p>${data}</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </body>
      </html>
    `;
  }

  // Confirma a venda
  const confirmarVenda = async () => {
    // 1) Atualiza estoque
    const updates = carrinho.map((item) => ({
      item,
      novoEstoque: parseInt(item.estoque, 10) - item.quantidade,
    }));
    await Promise.all(
      updates.map(async ({ item, novoEstoque }) => {
        await updateProduto({
          ...item,
          estoque: novoEstoque.toString(),
        });
      })
    );
    setProdutos((prev) =>
      prev.map((p) => {
        const u = updates.find((u) => u.item.codigo === p.codigo);
        return u ? { ...p, estoque: u.novoEstoque.toString() } : p;
      })
    );

    // 2) Registra a venda
    const total = calcularTotal();
    await addVenda({
      data: new Date().toISOString(),
      itens: [...carrinho],
      total,
      pagamento: formaPagamento,
    });

    // 3) Gera e imprime cupom
    const cupomHtml = gerarCupom(carrinho, total, formaPagamento);
    const win = window.open("", "PRINT", "width=300,height=600");
    if (win) {
      win.document.write(cupomHtml);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }

    // 4) Limpa tudo
    setCarrinho([]);
    setPagModalAberto(false);
  };

  return (
    <C.Container>
      <SideBar />
      <C.Main>
        <Header>
          <h1>Caixa</h1>
        </Header>

        <SearchWrapper>
          <Label>Buscar Produto:</Label>
          <Select
            ref={selectRef}
            options={opcoes}
            value={selectedOption}
            onChange={(opt: any) => {
              handleSelect(opt);
              setSelectedOption(null);
              setTimeout(() => selectRef.current?.focus(), 0);
            }}
            placeholder="Digite código ou use scanner..."
            isClearable
            autoFocus
          />
        </SearchWrapper>

        <TableContainer>
          <ProductsTable>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Preço</th>
                <th>Qtd.</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carrinho.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhum item no carrinho.</td>
                </tr>
              ) : (
                carrinho.map((item) => (
                  <tr key={item.codigo}>
                    <td>{item.codigo}</td>
                    <td>{item.nome}</td>
                    <td>R$ {parseFloat(item.precoVenda).toFixed(2)}</td>
                    <td>
                      <QtyInput
                        type="number"
                        min={1}
                        max={parseInt(item.estoque, 10)}
                        value={item.quantidade}
                        onChange={(e) =>
                          alterarQuantidade(
                            item.codigo,
                            parseInt(e.target.value, 10)
                          )
                        }
                      />
                    </td>
                    <td>
                      R${" "}
                      {(parseFloat(item.precoVenda) * item.quantidade).toFixed(
                        2
                      )}
                    </td>
                    <td>
                      <ActionButton
                        onClick={() => removerDoCarrinho(item.codigo)}
                      >
                        <FiTrash size={18} />
                      </ActionButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ProductsTable>
        </TableContainer>

        <Resumo>
          <Total>
            <FiCheck size={20} />
            <span>Total: R$ {calcularTotal().toFixed(2)}</span>
          </Total>
          <FinalizeButton
            onClick={iniciarFinalizacao}
            disabled={carrinho.length === 0}
          >
            Finalizar Venda
          </FinalizeButton>
        </Resumo>

        {pagModalAberto && (
          <PaymentOverlay>
            <PaymentModal>
              <h2>Forma de Pagamento</h2>
              <Options>
                {(["Dinheiro", "Cartão", "PIX"] as Pagamento[]).map((f) => (
                  <OptionLabel key={f}>
                    <input
                      type="radio"
                      name="pagamento"
                      value={f}
                      checked={formaPagamento === f}
                      onChange={() => setFormaPagamento(f)}
                    />
                    {f}
                  </OptionLabel>
                ))}
              </Options>
              <PayButtons>
                <button onClick={() => setPagModalAberto(false)} type="button">
                  Cancelar
                </button>
                <button onClick={confirmarVenda} type="button">
                  Confirmar
                </button>
              </PayButtons>
            </PaymentModal>
          </PaymentOverlay>
        )}
      </C.Main>
    </C.Container>
  );
}

const Header = styled.div`
  margin-bottom: 16px;
  h1 {
    font-size: 1.75rem;
    color: #343a40;
  }
`;
const SearchWrapper = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;
const Label = styled.label`
  min-width: 100px;
  font-weight: bold;
`;
const TableContainer = styled.div`
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;
const ProductsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 12px;
    text-align: center;
  }
  th {
    background: #e9ecef;
  }
  tbody tr:hover {
    background: #f1f3f5;
  }
`;
const QtyInput = styled.input`
  width: 60px;
  padding: 4px;
  text-align: center;
  border: 1px solid #ced4da;
  border-radius: 4px;
`;
const ActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #dc3545;
`;
const Resumo = styled.div`
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const Total = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: bold;
`;
const FinalizeButton = styled.button`
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  &:disabled {
    background: #94d3a2;
    cursor: not-allowed;
  }
`;
const PaymentOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;
const PaymentModal = styled.div`
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  width: 320px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  h2 {
    margin-top: 0;
  }
`;
const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
`;
const OptionLabel = styled.label`
  font-size: 1rem;
  input {
    margin-right: 8px;
  }
`;
const PayButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  button {
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    &:first-child {
      background: #ccc;
      color: #333;
    }
    &:last-child {
      background: #28a745;
      color: #fff;
    }
  }
`;
