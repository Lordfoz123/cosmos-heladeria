export const STORAGE_KEY = "catalogo_productos";

export function saveProducts(products: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function loadProducts() {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}