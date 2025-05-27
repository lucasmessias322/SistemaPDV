// src/db.ts
import { openDB, IDBPDatabase } from "idb";
import { Produto } from "./Pages/CadastroDeProdutos";

export interface ItemCarrinho extends Produto {
  quantidade: number;
}

export interface Venda {
  id?: number;
  data: string; // ISO date string
  itens: ItemCarrinho[];
  total: number;
  pagamento: "Dinheiro" | "Cartão" | "PIX";
}

const DB_NAME = "ProdutoDB";
const DB_VERSION = 3; // bump para 3

const STORE_PRODUTOS = "produtos";
const STORE_VENDAS = "vendas";

export const db = openDB(DB_NAME, DB_VERSION, {
  async upgrade(database, oldVersion) {
    // v1 criou apenas 'produtos'
    if (oldVersion < 1) {
      database.createObjectStore(STORE_PRODUTOS, { keyPath: "codigo" });
    }
    // v2 adicionou 'vendas'
    if (oldVersion < 2) {
      const vendaStore = database.createObjectStore(STORE_VENDAS, {
        keyPath: "id",
        autoIncrement: true,
      });
      vendaStore.createIndex("data", "data");
    }
    // v3 adiciona campo alertaEstoque em todos os produtos existentes
    if (oldVersion < 3) {
      // precisamos migrar cada registro antigo
      const tx = database.transaction(STORE_PRODUTOS, "readwrite");
      const store = tx.objectStore(STORE_PRODUTOS);

      // pega todas as chaves
      const chaves = await store.getAllKeys();
      for (const chave of chaves) {
        const registro: any = await store.get(chave);
        // adiciona o campo com valor padrão 0, se não existir
        if (registro.alertaEstoque === undefined) {
          registro.alertaEstoque = 0;
          await store.put(registro);
        }
      }

      await tx.done;
    }
  },
});

// ——— Produtos ———

export async function addProduto(produto: Produto): Promise<void> {
  const database = await db;
  const tx = database.transaction(STORE_PRODUTOS, "readwrite");
  tx.store.put(produto);
  await tx.done;
}

export async function getProdutos(): Promise<Produto[]> {
  const database = await db;
  return database.getAll(STORE_PRODUTOS) as Promise<Produto[]>;
}

export async function deleteProduto(codigo: string): Promise<void> {
  const database = await db;
  const tx = database.transaction(STORE_PRODUTOS, "readwrite");
  tx.store.delete(codigo);
  await tx.done;
}

export async function updateProduto(produto: Produto): Promise<void> {
  const database = await db;
  const tx = database.transaction(STORE_PRODUTOS, "readwrite");
  tx.store.put(produto);
  await tx.done;
}

// ——— Vendas ———

export async function addVenda(venda: Venda): Promise<number> {
  const database = await db;
  const tx = database.transaction(STORE_VENDAS, "readwrite");
  const id = await tx.store.add(venda);
  await tx.done;
  return id;
}

export async function getVendas(): Promise<Venda[]> {
  const database = await db;
  return database.getAll(STORE_VENDAS) as Promise<Venda[]>;
}

export async function getVendasPorPeriodo(
  inicioISO: string,
  fimISO: string
): Promise<Venda[]> {
  const database = await db;
  const index = database.transaction(STORE_VENDAS).store.index("data");
  const vendas: Venda[] = [];
  let cursor = await index.openCursor(IDBKeyRange.bound(inicioISO, fimISO));
  while (cursor) {
    vendas.push(cursor.value);
    cursor = await cursor.continue();
  }
  return vendas;
}
